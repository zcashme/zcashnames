alter table public.blockinfo_post_schedule
add column if not exists template_variant text not null default 'original'
check (template_variant in ('original', 'light'));

alter table public.referinfo_post_schedule
add column if not exists template_variant text not null default 'original'
check (template_variant in ('original', 'light'));

alter table public.reserveinfo_post_schedule
add column if not exists template_variant text not null default 'original'
check (template_variant in ('original', 'light'));
