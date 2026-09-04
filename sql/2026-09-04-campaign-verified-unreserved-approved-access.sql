-- Exclude protected-name families with a currently approved access request from
-- the verified_unreserved campaign audience. This uses request.status because
-- decision corrections update the current request row.

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
  where request.status = 'approved'
),
family_members as (
  select distinct lower(trim(protected_name.name)) as normalized_name
  from public.zn_protected_names protected_name
  join approved_families family
    on coalesce(
      nullif(lower(trim(protected_name.parent_name)), ''),
      nullif(lower(trim(protected_name.name)), '')
    ) = family.family_key
)
select normalized_name
from family_members
where normalized_name <> '';

comment on view public.approved_protected_name_access_family_members is
  'Normalized protected names in families with a currently approved access request.';

create or replace function public.campaign_contactable_waitlist_rows(
  p_series text default 'waitlist'
)
returns setof public.zn_waitlist
language sql
stable
security definer
set search_path = public
as $$
  select z.*
  from public.zn_waitlist z
  where z.email is not null
    and not exists (
      select 1
      from public.campaign_suppressions suppression
      where suppression.active is true
        and suppression.normalized_email = lower(z.email)
    )
    and not exists (
      select 1
      from public.campaign_series_unsubscribed_emails(p_series) unsubscribe
      where unsubscribe.normalized_email = lower(z.email)
    );
$$;

create or replace function public.list_waitlist_recipients(
  p_audience_scope text,
  p_dedupe_mode text,
  p_selected_emails text[] default array[]::text[],
  p_series text default 'waitlist'
)
returns table (
  recipient_key text,
  email text,
  normalized_email text,
  source_row_ids text[],
  name text,
  related_names text[],
  referral_code text,
  human_referral_code text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_audience_scope not in ('verified_only', 'verified_unreserved', 'all_rows', 'verified_newsletter', 'selected_emails') then
    raise exception 'Unsupported audience scope: %', p_audience_scope;
  end if;

  if p_dedupe_mode not in ('one_per_email', 'one_per_row') then
    raise exception 'Unsupported dedupe mode: %', p_dedupe_mode;
  end if;

  if p_dedupe_mode = 'one_per_row' then
    return query
    with input_emails as (
      select distinct lower(trim(value)) as normalized_email
      from unnest(coalesce(p_selected_emails, array[]::text[])) as value
      where nullif(trim(value), '') is not null
    )
    select
      z.id::text as recipient_key,
      z.email,
      lower(z.email) as normalized_email,
      array[z.id::text] as source_row_ids,
      coalesce(nullif(trim(z.name), ''), 'there') as name,
      coalesce(array_remove(array[nullif(trim(z.name), '')], null), array[]::text[]) as related_names,
      z.referral_code,
      coalesce(z.human_referral_code, z.referral_code) as human_referral_code
    from public.campaign_contactable_waitlist_rows(p_series) z
    where (
      p_audience_scope = 'selected_emails'
      and lower(z.email) in (select normalized_email from input_emails)
    )
    or p_audience_scope = 'all_rows'
    or (p_audience_scope = 'verified_only' and z.email_verified is true)
    or (
      p_audience_scope = 'verified_unreserved'
      and z.email_verified is true
      and z.name_reserved is not true
      and not exists (
        select 1
        from public.approved_protected_name_access_family_members family_member
        where family_member.normalized_name = lower(trim(coalesce(z.name, '')))
      )
    )
    or (p_audience_scope = 'verified_newsletter' and z.email_verified is true and z.newsletter is true)
    order by z.created_at asc, z.id asc;

    return;
  end if;

  return query
  with input_emails as (
    select distinct lower(trim(value)) as normalized_email
    from unnest(coalesce(p_selected_emails, array[]::text[])) as value
    where nullif(trim(value), '') is not null
  ),
  filtered_rows as (
    select
      z.id,
      z.name,
      z.email,
      lower(z.email) as normalized_email,
      z.referral_code,
      z.human_referral_code,
      z.created_at
    from public.campaign_contactable_waitlist_rows(p_series) z
    where (
      p_audience_scope = 'selected_emails'
      and lower(z.email) in (select normalized_email from input_emails)
    )
    or p_audience_scope = 'all_rows'
    or (p_audience_scope = 'verified_only' and z.email_verified is true)
    or (
      p_audience_scope = 'verified_unreserved'
      and z.email_verified is true
      and z.name_reserved is not true
      and not exists (
        select 1
        from public.approved_protected_name_access_family_members family_member
        where family_member.normalized_name = lower(trim(coalesce(z.name, '')))
      )
    )
    or (p_audience_scope = 'verified_newsletter' and z.email_verified is true and z.newsletter is true)
  )
  select
    fr.normalized_email as recipient_key,
    min(fr.email) as email,
    fr.normalized_email,
    array_agg(fr.id::text order by fr.created_at asc, fr.id asc) as source_row_ids,
    coalesce(
      (array_remove(array_agg(nullif(trim(fr.name), '') order by fr.created_at asc, fr.id asc), null))[1],
      'there'
    ) as name,
    coalesce(
      array_remove(array_agg(nullif(trim(fr.name), '') order by fr.created_at asc, fr.id asc), null),
      array[]::text[]
    ) as related_names,
    (array_agg(fr.referral_code order by fr.created_at asc, fr.id asc))[1] as referral_code,
    coalesce(
      (array_agg(fr.human_referral_code order by fr.created_at asc, fr.id asc))[1],
      (array_agg(fr.referral_code order by fr.created_at asc, fr.id asc))[1]
    ) as human_referral_code
  from filtered_rows fr
  group by fr.normalized_email
  order by min(fr.created_at) asc, fr.normalized_email asc;
end;
$$;

create or replace function public.estimate_waitlist_recipients(
  p_audience_scope text,
  p_dedupe_mode text,
  p_selected_emails text[] default array[]::text[],
  p_sample_limit integer default 5,
  p_series text default 'waitlist'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_audience_scope not in ('verified_only', 'verified_unreserved', 'all_rows', 'verified_newsletter', 'selected_emails') then
    raise exception 'Unsupported audience scope: %', p_audience_scope;
  end if;

  if p_dedupe_mode not in ('one_per_email', 'one_per_row') then
    raise exception 'Unsupported dedupe mode: %', p_dedupe_mode;
  end if;

  with input_emails as (
    select distinct lower(trim(value)) as normalized_email
    from unnest(coalesce(p_selected_emails, array[]::text[])) as value
    where nullif(trim(value), '') is not null
  ),
  active_suppressions as (
    select distinct cs.normalized_email
    from public.campaign_suppressions cs
    where cs.active is true
  ),
  suppressed_input as (
    select i.normalized_email
    from input_emails i
    join active_suppressions s on s.normalized_email = i.normalized_email
  ),
  unsubscribed_input as (
    select i.normalized_email
    from input_emails i
    join public.campaign_series_unsubscribed_emails(p_series) u
      on u.normalized_email = i.normalized_email
  ),
  filtered_rows as (
    select
      z.id,
      z.name,
      z.email,
      lower(z.email) as normalized_email,
      z.referral_code,
      z.human_referral_code,
      z.created_at
    from public.campaign_contactable_waitlist_rows(p_series) z
    where (
      p_audience_scope = 'selected_emails'
      and lower(z.email) in (select normalized_email from input_emails)
    )
    or p_audience_scope = 'all_rows'
    or (p_audience_scope = 'verified_only' and z.email_verified is true)
    or (
      p_audience_scope = 'verified_unreserved'
      and z.email_verified is true
      and z.name_reserved is not true
      and not exists (
        select 1
        from public.approved_protected_name_access_family_members family_member
        where family_member.normalized_name = lower(trim(coalesce(z.name, '')))
      )
    )
    or (p_audience_scope = 'verified_newsletter' and z.email_verified is true and z.newsletter is true)
  ),
  grouped_rows as (
    select
      fr.normalized_email,
      min(fr.email) as email,
      array_agg(fr.id::text order by fr.created_at asc, fr.id asc) as source_row_ids,
      array_remove(array_agg(nullif(trim(fr.name), '') order by fr.created_at asc, fr.id asc), null) as related_names,
      (array_agg(fr.referral_code order by fr.created_at asc, fr.id asc))[1] as referral_code,
      (array_agg(fr.human_referral_code order by fr.created_at asc, fr.id asc))[1] as human_referral_code,
      min(fr.created_at) as first_created_at
    from filtered_rows fr
    group by fr.normalized_email
  ),
  one_per_row_sample as (
    select jsonb_build_object(
      'recipient_key', fr.id::text,
      'email', fr.email,
      'normalized_email', fr.normalized_email,
      'source_row_ids', jsonb_build_array(fr.id::text),
      'name', coalesce(nullif(trim(fr.name), ''), 'there'),
      'related_names', to_jsonb(array_remove(array[nullif(trim(fr.name), '')], null)),
      'referral_code', fr.referral_code,
      'human_referral_code', fr.human_referral_code
    ) as payload
    from filtered_rows fr
    order by fr.created_at asc, fr.id asc
    limit p_sample_limit
  ),
  one_per_email_sample as (
    select jsonb_build_object(
      'recipient_key', gr.normalized_email,
      'email', gr.email,
      'normalized_email', gr.normalized_email,
      'source_row_ids', to_jsonb(gr.source_row_ids),
      'name', coalesce(gr.related_names[1], 'there'),
      'related_names', to_jsonb(coalesce(gr.related_names, array[]::text[])),
      'referral_code', gr.referral_code,
      'human_referral_code', gr.human_referral_code
    ) as payload
    from grouped_rows gr
    order by gr.first_created_at asc, gr.normalized_email asc
    limit p_sample_limit
  ),
  blocked_rows as (
    select jsonb_build_object(
      'email', si.normalized_email,
      'normalizedEmail', si.normalized_email,
      'reason', 'suppressed'
    ) as payload,
    si.normalized_email as sort_email,
    0 as sort_group
    from suppressed_input si
    where p_audience_scope = 'selected_emails'

    union all

    select jsonb_build_object(
      'email', ui.normalized_email,
      'normalizedEmail', ui.normalized_email,
      'reason', 'unsubscribed'
    ) as payload,
    ui.normalized_email as sort_email,
    1 as sort_group
    from unsubscribed_input ui
    left join suppressed_input si on si.normalized_email = ui.normalized_email
    where p_audience_scope = 'selected_emails'
      and si.normalized_email is null

    union all

    select jsonb_build_object(
      'email', i.normalized_email,
      'normalizedEmail', i.normalized_email,
      'reason', 'not_on_waitlist'
    ) as payload,
    i.normalized_email as sort_email,
    2 as sort_group
    from input_emails i
    left join grouped_rows gr on gr.normalized_email = i.normalized_email
    left join suppressed_input si on si.normalized_email = i.normalized_email
    left join unsubscribed_input ui on ui.normalized_email = i.normalized_email
    where p_audience_scope = 'selected_emails'
      and gr.normalized_email is null
      and si.normalized_email is null
      and ui.normalized_email is null
  )
  select jsonb_build_object(
    'count',
    case
      when p_dedupe_mode = 'one_per_row' then (select count(*) from filtered_rows)
      else (select count(*) from grouped_rows)
    end,
    'sample',
    case
      when p_dedupe_mode = 'one_per_row' then coalesce((select jsonb_agg(payload) from one_per_row_sample), '[]'::jsonb)
      else coalesce((select jsonb_agg(payload) from one_per_email_sample), '[]'::jsonb)
    end,
    'blocked',
    coalesce((select jsonb_agg(payload order by sort_group asc, sort_email asc) from blocked_rows), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;
