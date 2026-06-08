-- Dedupe exact (normalized email, normalized name) collisions in public.zn_waitlist.
--
-- Survivor selection used here:
-- - keep rows with downstream referrals when present
-- - otherwise prefer richer metadata (survey / human_referral_code)
-- - otherwise keep the oldest verified row
--
-- Important:
-- - This script repoints direct child referrals via referred_by.
-- - It does NOT preserve retired canonical referral_code values as aliases.
--   Any old share links using deleted referral codes will stop resolving.
--   If you want old codes to keep working, add a referral-alias layer first.

begin;

create table if not exists public.zn_waitlist_dedupe_backup
  (like public.zn_waitlist including all);

insert into public.zn_waitlist_dedupe_backup
select *
from public.zn_waitlist
where id in (
  '996f5304-71eb-4563-a269-5a6ac68c29e6', -- phagar
  'c8e55327-a052-4a18-8e89-44978721e75c', -- blakiat
  '1724746e-ad75-42bf-9608-7e34a1bc5fda', -- monsignore
  '7d55aca7-7516-4805-8e32-61591bdd9b3c', -- niels
  '684251af-f59a-48c8-9fce-d7ca5123de39', -- nium
  '28e4e9e8-fc2d-4d54-8c46-56a3a074918d', -- blackcat
  '4d583f1f-7684-484c-b200-2d6d188b60a9', -- treasonous
  '8b7b1a51-f9d6-4199-a7f2-58d412481e6e', -- yojanpant
  '634d88f2-2af8-40a5-817e-7bf6a7981c77', -- yojanpant
  'db0a86c2-f30a-4ad4-b3b9-9a2b74db3237', -- yojanpant
  '4e668e28-1de6-4d63-b131-bc934a150114', -- yojanpant
  'd64a0879-4319-410e-8da0-b9e7dbe73e93', -- zcashug
  '10967455-d149-4c72-b30d-52e98ec4df84'  -- zcashug
)
on conflict (id) do nothing;

-- Repoint any existing direct referrals from retiring codes to survivor codes.
update public.zn_waitlist
set referred_by = 'c7AncrGk'
where referred_by = 'yPA9UBC7';

update public.zn_waitlist
set referred_by = 'yhHqzDcK'
where referred_by = 'rhz5q248';

-- Delete the losing duplicate rows.
delete from public.zn_waitlist
where id in (
  '996f5304-71eb-4563-a269-5a6ac68c29e6',
  'c8e55327-a052-4a18-8e89-44978721e75c',
  '1724746e-ad75-42bf-9608-7e34a1bc5fda',
  '7d55aca7-7516-4805-8e32-61591bdd9b3c',
  '684251af-f59a-48c8-9fce-d7ca5123de39',
  '28e4e9e8-fc2d-4d54-8c46-56a3a074918d',
  '4d583f1f-7684-484c-b200-2d6d188b60a9',
  '8b7b1a51-f9d6-4199-a7f2-58d412481e6e',
  '634d88f2-2af8-40a5-817e-7bf6a7981c77',
  'db0a86c2-f30a-4ad4-b3b9-9a2b74db3237',
  '4e668e28-1de6-4d63-b131-bc934a150114',
  'd64a0879-4319-410e-8da0-b9e7dbe73e93',
  '10967455-d149-4c72-b30d-52e98ec4df84'
);

commit;

-- Survivors kept:
-- phagar      -> a5a28400-3a87-4773-9c38-18bbc80931e8  (survey completed)
-- blakiat     -> d3737bf3-a9b2-4019-bc88-8c258837e574  (oldest)
-- monsignore  -> 6af8e8cc-9fcb-42e4-bf41-b5c219d57604  (has child referrals)
-- niels       -> 5c1d0cc4-0a14-4a5e-871a-164c99d4df6c  (oldest)
-- nium        -> acf350fa-bdb9-4158-843d-bbbb0e296fb0  (survey completed)
-- blackcat    -> c3fc8198-f222-46eb-a7d9-ee7d82e53018  (has most child referrals)
-- treasonous  -> a08eb66b-505e-4f7c-8b14-0e19426977f2  (oldest)
-- yojanpant   -> 20f69879-ca5d-4208-84dd-b3ffed6f399e  (oldest)
-- zcashug     -> cfecf25d-cae6-4867-935d-22db9815134d  (keeps human_referral_code)

-- Re-run this after the delete. It should return zero rows before the unique index is added.
-- select
--   lower(btrim(email)) as normalized_email,
--   lower(btrim(name)) as normalized_name,
--   count(*) as duplicate_count
-- from public.zn_waitlist
-- group by 1, 2
-- having count(*) > 1
-- order by duplicate_count desc, normalized_email, normalized_name;
