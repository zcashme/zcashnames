-- Prevent exact duplicate waitlist entries for the same normalized email/name pair.
-- Run the preflight query first. If it returns rows, those duplicates must be
-- cleaned up before the unique index can be created.

-- Preflight:
-- select
--   lower(btrim(email)) as normalized_email,
--   lower(btrim(name)) as normalized_name,
--   count(*) as duplicate_count
-- from public.zn_waitlist
-- group by 1, 2
-- having count(*) > 1
-- order by duplicate_count desc, normalized_email, normalized_name;

create unique index if not exists zn_waitlist_email_name_unique
  on public.zn_waitlist (lower(btrim(email)), lower(btrim(name)));
