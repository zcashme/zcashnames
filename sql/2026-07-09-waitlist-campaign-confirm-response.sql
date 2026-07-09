alter table public.zn_waitlist
  add column if not exists campaign_email_confirm_response boolean not null default false,
  add column if not exists campaign_email_confirm_response_at timestamptz null,
  add column if not exists campaign_email_confirm_response_campaign_id uuid null,
  add column if not exists campaign_email_confirm_response_target_url text null;
