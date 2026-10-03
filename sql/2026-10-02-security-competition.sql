-- Security competition ticket table only.
-- The scanner-managed public.zn_security_comp payment ledger is unchanged.

begin;

create sequence if not exists public.zn_security_comp_ticket_seq;

create or replace function public.next_zn_security_comp_ticket_id()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  n bigint;
begin
  n := nextval('public.zn_security_comp_ticket_seq');
  return 'ZNS-BB-' || case
    when n < 1000 then lpad(n::text, 3, '0')
    else n::text
  end;
end;
$$;

create table if not exists public.zn_security_comp_tickets (
  ticket_id text primary key
    default public.next_zn_security_comp_ticket_id(),

  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'duplicate', 'invalid', 'paid')),

  submitted_at timestamptz not null default now(),

  payment_txid text not null unique
    check (payment_txid ~ '^[0-9a-f]{64}$'),

  ghsa_url text not null
    check (ghsa_url ~ '^https://github\.com/.+/security/advisories/GHSA-[[:alnum:]-]+/?$'),

  github_username text not null
    check (length(trim(github_username)) > 0),

  payout_address text not null
    check (length(trim(payout_address)) > 0),

  claimed_severity text not null
    check (claimed_severity in ('critical', 'high', 'medium', 'low')),

  final_severity text
    check (final_severity is null or final_severity in ('critical', 'high', 'medium', 'low')),

  payout_txid text unique
    check (payout_txid is null or payout_txid ~ '^[0-9a-f]{64}$'),

  paid_at timestamptz,

  check (
    status <> 'paid'
    or (payout_txid is not null and paid_at is not null)
  )
);

alter table public.zn_security_comp_tickets enable row level security;

revoke all on public.zn_security_comp_tickets from anon, authenticated;
grant all on public.zn_security_comp_tickets to service_role;

revoke all on sequence public.zn_security_comp_ticket_seq from public, anon, authenticated;
grant usage, select on sequence public.zn_security_comp_ticket_seq to service_role;

revoke all on function public.next_zn_security_comp_ticket_id()
  from public, anon, authenticated;
grant execute on function public.next_zn_security_comp_ticket_id()
  to service_role;

commit;
