create table if not exists public.ens_outreach_batches (
  id uuid primary key default gen_random_uuid(),
  total_items integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ens_outreach_queue (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.ens_outreach_batches(id) on delete cascade,
  queue_order integer not null,
  name text not null,
  normalized_name text not null,
  x_username text not null,
  follower_count integer not null,
  source_reason text not null,
  source_evidence text not null,
  protected_url text not null,
  draft_text text not null,
  lookup_status text not null default 'pending' check (lookup_status in ('pending', 'matched', 'no_match', 'failed')),
  target_tweet_id text,
  target_tweet_url text,
  target_tweet_text text,
  png_url text,
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'no_match', 'failed', 'reviewed', 'sent')),
  error text,
  reviewed_at timestamptz,
  review_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (batch_id, queue_order)
);

create index if not exists ens_outreach_queue_batch_order_idx on public.ens_outreach_queue(batch_id, queue_order);

alter table public.ens_outreach_batches enable row level security;
alter table public.ens_outreach_queue enable row level security;

insert into storage.buckets (id, name, public)
values ('ens-outreach-assets', 'ens-outreach-assets', true)
on conflict (id) do update set public = true;
