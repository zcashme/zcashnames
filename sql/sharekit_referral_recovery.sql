alter table if exists public.zn_waitlist
  add column if not exists referral_email_resent_at timestamptz;

create table if not exists public.sharekit_recovery_attempts (
  scope text not null,
  key text not null,
  window_started_at timestamptz not null,
  count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (scope, key, window_started_at)
);

create index if not exists sharekit_recovery_attempts_updated_at_idx
  on public.sharekit_recovery_attempts (updated_at desc);
