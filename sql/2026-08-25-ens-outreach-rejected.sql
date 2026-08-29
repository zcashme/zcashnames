alter table public.ens_outreach_queue
  add column if not exists rejected_at timestamptz;

alter table public.ens_outreach_queue
  drop constraint if exists ens_outreach_queue_status_check;

alter table public.ens_outreach_queue
  add constraint ens_outreach_queue_status_check
  check (status in ('pending', 'preparing', 'ready', 'no_match', 'failed', 'reviewed', 'rejected', 'sent'));
