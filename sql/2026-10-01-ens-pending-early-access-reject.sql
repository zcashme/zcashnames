-- Auto-reject pending ENS names with no submitted or approved access request
-- once Early Access starts (2026-10-15 12:00 PM Eastern).
-- Apply after sql/2026-10-01-ens-pending-status.sql.

begin;

create or replace function public.expire_pending_ens_names()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.zn_protected_names n
  set
    status = 'rejected',
    rejected_at = coalesce(rejected_at, now()),
    rejected_reason = coalesce(
      nullif(btrim(rejected_reason), ''),
      'ENS priority access was not requested before Early Access'
    ),
    updated_at = now()
  where n.ens_priority_claim is true
    and n.redeemed is not true
    and n.status = 'pending'
    and now() >= timestamptz '2026-10-15 16:00:00+00'
    and not exists (
      select 1
      from public.waitlist_protected_name_access_requests r
      where r.status in ('submitted', 'approved')
        and public.admin_pn_ens_request_matches_name(n, r.requested_name)
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

comment on function public.expire_pending_ens_names() is
  'Rejects unredeemed pending ENS names after Early Access starts when no submitted or approved access request exists.';

commit;
