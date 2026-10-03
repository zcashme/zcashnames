-- Ticket ids are now derived from the payout address in the app (HMAC-SHA256, 4 digits).
-- Removes the sequential id generator; run after 2026-10-02-security-competition.sql.

begin;

alter table public.zn_security_comp_tickets alter column ticket_id drop default;

drop function if exists public.next_zn_security_comp_ticket_id();
drop sequence if exists public.zn_security_comp_ticket_seq;

commit;
