-- ENS pending status, access-request promotion, campaign filter.
-- Apply after sql/2026-09-07-campaign-verified-unreserved-exclude-protected-names.sql
-- and sql/2026-09-04-protected-name-access-decision-corrections.sql.
--
-- pending = listed ENS row whose holder has not been approved; claim gate is off.
-- Access approval promotes to protected with expires_at = 2026-11-01T16:00:00.000Z.

begin;

alter table public.zn_protected_names
  drop constraint if exists zn_protected_names_status_check;

alter table public.zn_protected_names
  add constraint zn_protected_names_status_check
  check (status in ('under_review', 'protected', 'rejected', 'pending'));

create or replace function public.admin_pn_ens_request_matches_name(
  p_name public.zn_protected_names,
  p_requested text
) returns boolean
language sql
immutable
as $$
  select
    nullif(lower(trim(coalesce(p_requested, ''))), '') is not null
    and (
      lower(trim(p_name.name)) = lower(trim(p_requested))
      or (
        nullif(lower(trim(coalesce(p_name.normalized_name, ''))), '') is not null
        and p_name.normalized_name = lower(trim(p_requested))
      )
    );
$$;

create or replace function public.admin_pn_ens_has_other_approved_access(
  p_name public.zn_protected_names,
  p_except_request_id uuid
) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.waitlist_protected_name_access_requests r
    where r.status = 'approved'
      and r.id is distinct from p_except_request_id
      and public.admin_pn_ens_request_matches_name(p_name, r.requested_name)
  );
$$;

create or replace function public.admin_pn_apply_ens_access_outcome(
  p_requested_name text,
  p_decision text,
  p_except_request_id uuid
) returns public.zn_protected_names
language plpgsql
security definer
set search_path = public
as $$
declare
  locked public.zn_protected_names%rowtype;
  updated public.zn_protected_names%rowtype;
  expires_at_approved timestamptz := timestamptz '2026-11-01 16:00:00+00';
begin
  if p_decision not in ('approved', 'denied') then
    raise exception 'PN_VALIDATION: Invalid decision.';
  end if;

  select *
  into locked
  from public.zn_protected_names
  where public.admin_pn_ens_request_matches_name(zn_protected_names, p_requested_name)
  order by case when status = 'protected' then 0 else 1 end, updated_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if locked.ens_priority_claim is not true or locked.redeemed then
    return locked;
  end if;

  if p_decision = 'approved' then
    update public.zn_protected_names
    set
      status = 'protected',
      protected_at = coalesce(protected_at, now()),
      rejected_at = null,
      rejected_reason = null,
      expires_at = expires_at_approved,
      updated_at = now()
    where name = locked.name
    returning * into updated;
    return updated;
  end if;

  if public.admin_pn_ens_has_other_approved_access(locked, p_except_request_id) then
    return locked;
  end if;

  update public.zn_protected_names
  set
    status = 'pending',
    expires_at = null,
    updated_at = now()
  where name = locked.name
  returning * into updated;
  return updated;
end;
$$;

create or replace function public.admin_protected_name_access_request_decide(
  p_request_id uuid, p_decision text, p_reason text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  request_row public.waitlist_protected_name_access_requests%rowtype;
  audit public.zn_protected_name_decisions%rowtype;
  name_row public.zn_protected_names%rowtype;
  prior_status text;
begin
  select * into request_row from public.waitlist_protected_name_access_requests where id = p_request_id for update;
  if not found then raise exception 'PN_NOT_FOUND: Access request not found.'; end if;
  if request_row.status <> 'submitted' then raise exception 'PN_CONFLICT: Access request is not submitted.'; end if;
  if p_decision = 'approved' then
    update public.waitlist_protected_name_access_requests set status = 'approved', approved_at = now(), denied_at = null, updated_at = now() where id = request_row.id;
  elsif p_decision = 'denied' then
    update public.waitlist_protected_name_access_requests set status = 'denied', denied_at = now(), approved_at = null, updated_at = now() where id = request_row.id;
  else raise exception 'PN_VALIDATION: Invalid decision.'; end if;

  select n.status
  into prior_status
  from public.zn_protected_names n
  where public.admin_pn_ens_request_matches_name(n, request_row.requested_name)
  order by case when n.status = 'protected' then 0 else 1 end, n.updated_at desc
  limit 1;

  name_row := public.admin_pn_apply_ens_access_outcome(request_row.requested_name, p_decision, request_row.id);

  audit := public.admin_pn_write_decision(
    'access_request',
    request_row.id::text,
    request_row.requested_name,
    p_decision,
    p_reason,
    request_row.normalized_email,
    request_row.contact_methods,
    request_row.preferred_contact_kind,
    request_row.preferred_contact_value,
    name_row.status,
    case
      when name_row.name is null then null
      else prior_status is distinct from name_row.status
    end,
    request_row.additional_context
  );
  return public.admin_pn_decision_result(audit, p_decision);
end;
$$;

create or replace function public.admin_protected_name_access_decision_correct(
  p_decision_id uuid,
  p_decision text,
  p_reason text
) returns public.zn_protected_name_decision_amendments
language plpgsql security definer set search_path = public as $$
declare
  original public.zn_protected_name_decisions%rowtype;
  request_row public.waitlist_protected_name_access_requests%rowtype;
  amendment public.zn_protected_name_decision_amendments%rowtype;
begin
  if p_decision not in ('approved', 'denied') then raise exception 'PN_VALIDATION: Invalid corrected decision.'; end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'PN_VALIDATION: A corrected reason is required.'; end if;

  select * into original from public.zn_protected_name_decisions where id = p_decision_id for update;
  if not found then raise exception 'PN_NOT_FOUND: Decision not found.'; end if;
  if original.workflow <> 'access_request' then raise exception 'PN_CONFLICT: Only access-request decisions can change outcome.'; end if;

  select * into request_row from public.waitlist_protected_name_access_requests where id = original.source_id::uuid for update;
  if not found then raise exception 'PN_NOT_FOUND: Access request not found.'; end if;

  update public.waitlist_protected_name_access_requests
  set status = p_decision,
      approved_at = case when p_decision = 'approved' then now() else null end,
      denied_at = case when p_decision = 'denied' then now() else null end,
      updated_at = now()
  where id = request_row.id;

  perform public.admin_pn_apply_ens_access_outcome(request_row.requested_name, p_decision, request_row.id);

  insert into public.zn_protected_name_decision_amendments (decision_id, reason, corrected_decision)
  values (original.id, btrim(p_reason), p_decision)
  returning * into amendment;
  return amendment;
end;
$$;

-- Already-approved ENS: keep gated until Nov 1 12:00 PM Eastern.
update public.zn_protected_names n
set
  expires_at = timestamptz '2026-11-01 16:00:00+00',
  updated_at = now()
where n.ens_priority_claim is true
  and n.redeemed is not true
  and n.status = 'protected'
  and exists (
    select 1
    from public.waitlist_protected_name_access_requests r
    where r.status = 'approved'
      and public.admin_pn_ens_request_matches_name(n, r.requested_name)
  );

-- Unapproved unredeemed ENS: pending, no expiry clock.
update public.zn_protected_names n
set
  status = 'pending',
  expires_at = null,
  updated_at = now()
where n.ens_priority_claim is true
  and n.redeemed is not true
  and n.status = 'protected'
  and not exists (
    select 1
    from public.waitlist_protected_name_access_requests r
    where r.status = 'approved'
      and public.admin_pn_ens_request_matches_name(n, r.requested_name)
  );

create or replace view public.approved_protected_name_access_family_members
with (security_invoker = true) as
with approved_families as (
  select distinct
    coalesce(
      nullif(lower(trim(protected_name.parent_name)), ''),
      nullif(lower(trim(protected_name.name)), '')
    ) as family_key
  from public.waitlist_protected_name_access_requests request
  join public.zn_protected_names protected_name
    on lower(trim(protected_name.name)) = lower(trim(request.requested_name))
      or (
        nullif(lower(trim(protected_name.normalized_name)), '') is not null
        and protected_name.normalized_name = lower(trim(request.requested_name))
      )
  where request.status = 'approved'
),
approved_access_family_members as (
  select distinct lower(trim(protected_name.name)) as normalized_name
  from public.zn_protected_names protected_name
  join approved_families family
    on coalesce(
      nullif(lower(trim(protected_name.parent_name)), ''),
      nullif(lower(trim(protected_name.name)), '')
    ) = family.family_key

  union

  select distinct lower(trim(protected_name.normalized_name)) as normalized_name
  from public.zn_protected_names protected_name
  join approved_families family
    on coalesce(
      nullif(lower(trim(protected_name.parent_name)), ''),
      nullif(lower(trim(protected_name.name)), '')
    ) = family.family_key
  where nullif(lower(trim(protected_name.normalized_name)), '') is not null
),
protected_members as (
  select distinct lower(trim(protected_name.name)) as normalized_name
  from public.zn_protected_names protected_name
  where protected_name.status = 'protected'

  union

  select distinct lower(trim(protected_name.normalized_name)) as normalized_name
  from public.zn_protected_names protected_name
  where protected_name.status = 'protected'
    and nullif(lower(trim(protected_name.normalized_name)), '') is not null
),
priority_members as (
  select distinct lower(trim(protected_name.name)) as normalized_name
  from public.zn_protected_names protected_name
  where protected_name.status = 'protected'
    and (
      protected_name.ens_priority_claim is true
      or protected_name.zm_priority_claim is true
    )

  union

  select distinct lower(trim(protected_name.normalized_name)) as normalized_name
  from public.zn_protected_names protected_name
  where protected_name.status = 'protected'
    and (
      protected_name.ens_priority_claim is true
      or protected_name.zm_priority_claim is true
    )
    and nullif(lower(trim(protected_name.normalized_name)), '') is not null
)
select normalized_name
from approved_access_family_members
where normalized_name <> ''

union

select normalized_name
from protected_members
where normalized_name <> ''

union

select normalized_name
from priority_members
where normalized_name <> '';

comment on view public.approved_protected_name_access_family_members is
  'Normalized names excluded from verified_unreserved campaigns: currently protected names, approved access-request families, and currently protected priority-claim names.';

comment on column public.zn_protected_names.status is
  'under_review | protected | rejected | pending. Only protected gates claims. pending is the ENS holding state before an approved access request.';

commit;
