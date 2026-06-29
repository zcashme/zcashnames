create table if not exists public.job_applications (
  id text primary key,
  job_slug text not null,
  job_title text not null,
  status text not null default 'new',
  submitted_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  cover_note text not null,
  screening_answers jsonb not null default '[]'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_applications_status_check check (status in ('new', 'reviewing', 'interview', 'rejected', 'hired'))
);

create index if not exists job_applications_job_slug_submitted_at_idx
  on public.job_applications (job_slug, submitted_at desc);

create index if not exists job_applications_status_submitted_at_idx
  on public.job_applications (status, submitted_at desc);
