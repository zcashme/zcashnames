-- Expense submissions for the internal shared-link form.
-- Apply in the Supabase SQL editor. Safe to re-run.

begin;

create table if not exists public.zn_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitter_name text not null,
  submitter_email text not null,
  amount numeric(20, 8) not null check (amount > 0),
  currency text not null check (currency in ('USD', 'ZEC')),
  expense_date date not null,
  category text not null,
  merchant text,
  description text not null,
  receipts jsonb not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewed', 'reimbursed', 'rejected')),
  admin_note text,
  reviewed_at timestamptz,
  user_agent text,
  constraint zn_expenses_receipts_required_check
    check (jsonb_typeof(receipts) = 'array' and jsonb_array_length(receipts) >= 1)
);

create index if not exists zn_expenses_created_at_idx
  on public.zn_expenses (created_at desc);

create index if not exists zn_expenses_status_idx
  on public.zn_expenses (status);

alter table public.zn_expenses enable row level security;

revoke all on table public.zn_expenses from anon, authenticated;
grant all on table public.zn_expenses to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
