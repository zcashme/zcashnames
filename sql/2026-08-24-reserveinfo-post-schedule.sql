create table if not exists public.reserveinfo_post_schedule (
  id text primary key default 'default',
  enabled boolean not null default false,
  destination text not null default 'both' check (destination in ('telegram', 'x', 'both')),
  weekly_timezone text not null default 'America/New_York',
  last_run_started_at timestamptz,
  last_run_completed_at timestamptz,
  last_run_status text,
  last_error text,
  lock_token text,
  lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.reserveinfo_post_schedule (id) values ('default') on conflict (id) do nothing;

create table if not exists public.reserveinfo_post_batches (
  id uuid primary key default gen_random_uuid(),
  source_week_start date not null unique,
  source_week_end date not null,
  weekly_timezone text not null,
  total_names integer not null,
  names jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reserveinfo_post_queue (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.reserveinfo_post_batches(id) on delete cascade,
  page_index integer not null,
  names jsonb not null,
  shown_start integer not null,
  shown_end integer not null,
  total_names integer not null,
  scheduled_at timestamptz not null,
  week_label text not null,
  destination text not null check (destination in ('telegram', 'x', 'both')),
  caption text not null,
  image_status text not null default 'pending',
  local_file_path text,
  storage_object_path text,
  image_generated_at timestamptz,
  telegram_message_id bigint,
  telegram_protection_message_id bigint,
  telegram_error text,
  telegram_protection_error text,
  x_post_id text,
  x_protection_post_id text,
  x_error text,
  x_protection_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, page_index)
);

alter table public.reserveinfo_post_queue add column if not exists week_label text;
update public.reserveinfo_post_queue set week_label = '' where week_label is null;
alter table public.reserveinfo_post_queue alter column week_label set not null;
alter table public.reserveinfo_post_queue add column if not exists telegram_protection_message_id bigint;
alter table public.reserveinfo_post_queue add column if not exists telegram_protection_error text;
alter table public.reserveinfo_post_queue add column if not exists x_protection_post_id text;
alter table public.reserveinfo_post_queue add column if not exists x_protection_error text;

create index if not exists reserveinfo_post_queue_due_idx on public.reserveinfo_post_queue (scheduled_at, page_index);
create index if not exists reserveinfo_post_queue_batch_idx on public.reserveinfo_post_queue (batch_id, page_index);

create or replace function public.acquire_reserveinfo_post_schedule_lock(p_lock_token text, p_lock_expires_at timestamptz)
returns setof public.reserveinfo_post_schedule
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.reserveinfo_post_schedule
  set lock_token = p_lock_token, lock_expires_at = p_lock_expires_at, last_run_started_at = now(), updated_at = now()
  where id = 'default' and (lock_expires_at is null or lock_expires_at < now() or lock_token = p_lock_token)
  returning *;
end;
$$;

create or replace function public.release_reserveinfo_post_schedule_lock(p_lock_token text, p_status text, p_error text default null)
returns setof public.reserveinfo_post_schedule
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.reserveinfo_post_schedule
  set lock_token = null, lock_expires_at = null, last_run_completed_at = now(), last_run_status = p_status, last_error = p_error, updated_at = now()
  where id = 'default' and lock_token = p_lock_token
  returning *;
end;
$$;
