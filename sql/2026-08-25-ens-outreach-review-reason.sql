alter table public.ens_outreach_queue
  add column if not exists review_reason text;
