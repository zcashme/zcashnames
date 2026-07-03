create table if not exists public.referinfo_post_schedule (
  id text primary key default 'default',
  enabled boolean not null default false,
  destination text not null default 'both' check (destination in ('telegram', 'x', 'both')),
  render_mode text not null default 'deterministic' check (render_mode in ('deterministic')),
  schedule_mode text not null default 'weekly_time' check (schedule_mode in ('weekly_time')),
  weekly_weekday integer not null default 1 check (weekly_weekday >= 0 and weekly_weekday <= 6),
  weekly_hour integer not null default 11 check (weekly_hour >= 0 and weekly_hour <= 23),
  weekly_minute integer not null default 30 check (weekly_minute >= 0 and weekly_minute <= 59),
  weekly_timezone text not null default 'America/New_York',
  lock_token text,
  lock_expires_at timestamptz,
  last_run_started_at timestamptz,
  last_run_completed_at timestamptz,
  last_run_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.referinfo_post_schedule (id)
values ('default')
on conflict (id) do nothing;

create or replace function public.acquire_referinfo_post_schedule_lock(
  p_lock_token text,
  p_lock_expires_at timestamptz
)
returns setof public.referinfo_post_schedule
language plpgsql
as $$
begin
  insert into public.referinfo_post_schedule (id)
  values ('default')
  on conflict (id) do nothing;

  return query
  update public.referinfo_post_schedule
  set
    lock_token = p_lock_token,
    lock_expires_at = p_lock_expires_at,
    last_run_started_at = now(),
    last_run_status = 'running',
    last_error = null,
    updated_at = now()
  where id = 'default'
    and (lock_expires_at is null or lock_expires_at < now())
  returning *;
end;
$$;

create or replace function public.release_referinfo_post_schedule_lock(
  p_lock_token text,
  p_status text,
  p_error text default null
)
returns setof public.referinfo_post_schedule
language plpgsql
as $$
begin
  return query
  update public.referinfo_post_schedule
  set
    lock_token = null,
    lock_expires_at = null,
    last_run_completed_at = now(),
    last_run_status = p_status,
    last_error = p_error,
    updated_at = now()
  where id = 'default'
    and lock_token = p_lock_token
  returning *;
end;
$$;
