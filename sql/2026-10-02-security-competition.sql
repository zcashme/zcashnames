-- ZNS mint bug bounty tickets. Apply in the Supabase SQL editor.
-- The indexer ledger (default public.zn_security_comp) is created by a zn_view_keys
-- row. This file does not create that ledger and does not write view keys.
begin;

create table if not exists public.zn_security_comp_counters (
  year integer primary key,
  last_number integer not null
);

create table if not exists public.zn_security_comp_tickets (
  ticket_id text primary key,
  resume_token_hash text not null,
  status text not null default 'awaiting_payment',
  created_at timestamptz not null default now(),
  payment_txid text,
  payment_amount_zats bigint,
  payment_verified_at timestamptz,
  github_ghsa_id text,
  github_html_url text,
  researcher_handle text,
  github_username text,
  payout_address text,
  claimed_severity text,
  affected_commit text,
  affected_module text,
  report_payload jsonb,
  github_attempt_started_at timestamptz,
  ip_hash text,
  constraint zn_security_comp_tickets_status_check check (
    status in ('awaiting_payment', 'payment_verified', 'submitting', 'submitted', 'github_failed')
  ),
  constraint zn_security_comp_tickets_severity_check check (
    claimed_severity is null or claimed_severity in ('critical', 'high', 'medium', 'low')
  ),
  constraint zn_security_comp_tickets_txid_check check (
    payment_txid is null or payment_txid ~ '^[0-9a-f]{64}$'
  ),
  constraint zn_security_comp_tickets_hash_check check (
    resume_token_hash ~ '^[a-f0-9]{64}$'
  )
);

create unique index if not exists zn_security_comp_payment_txid_idx
  on public.zn_security_comp_tickets (payment_txid)
  where payment_txid is not null;

create table if not exists public.zn_security_comp_rate_limits (
  bucket_key text not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  attempts integer not null,
  primary key (bucket_key, window_started_at)
);

create index if not exists zn_security_comp_rate_limits_expiry_idx
  on public.zn_security_comp_rate_limits (expires_at);

alter table public.zn_security_comp_counters enable row level security;
alter table public.zn_security_comp_tickets enable row level security;
alter table public.zn_security_comp_rate_limits enable row level security;

revoke all on public.zn_security_comp_counters, public.zn_security_comp_tickets, public.zn_security_comp_rate_limits
  from anon, authenticated;
grant all on public.zn_security_comp_counters, public.zn_security_comp_tickets, public.zn_security_comp_rate_limits
  to service_role;

create or replace function public.zn_security_comp_memo_ticket(p_memo text)
returns text
language plpgsql
immutable
as $$
declare
  body text;
  part text;
  separator integer;
  ticket text;
begin
  -- text values cannot contain NUL on this Postgres, so only trim.
  body := btrim(coalesce(p_memo, ''));
  if body = '' then
    return null;
  end if;
  if left(body, 14) = 'ZNS:SECURITY|' then
    body := substr(body, 15);
  end if;
  foreach part in array string_to_array(body, '|') loop
    part := btrim(part);
    separator := position('::' in part);
    if separator > 1 and lower(substr(part, 1, separator - 1)) = 'ticket' then
      ticket := substr(part, separator + 2);
      if ticket ~ '^ZNS-[0-9]{2}-[0-9]{3,}$' then
        return ticket;
      end if;
    end if;
  end loop;
  return null;
end;
$$;

create or replace function public.consume_security_comp_limits(p_buckets jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bucket jsonb;
  window_start timestamptz;
  window_end timestamptz;
  observed_count integer;
  retry_seconds integer := 0;
  seconds integer;
  ceiling integer;
begin
  if jsonb_typeof(p_buckets) <> 'array' or jsonb_array_length(p_buckets) not between 1 and 10 then
    raise exception 'Invalid rate-limit buckets';
  end if;
  delete from public.zn_security_comp_rate_limits where expires_at < now() - interval '1 day';
  for bucket in select value from jsonb_array_elements(p_buckets) order by value->>'key' loop
    seconds := (bucket->>'seconds')::integer;
    ceiling := (bucket->>'limit')::integer;
    if seconds not between 1 and 86400 or ceiling not between 1 and 1000 or (bucket->>'key') !~ '^[a-f0-9]{64}$' then
      raise exception 'Invalid rate-limit bucket';
    end if;
    window_start := to_timestamp(floor(extract(epoch from now()) / seconds) * seconds);
    window_end := window_start + make_interval(secs => seconds);
    insert into public.zn_security_comp_rate_limits(bucket_key, window_started_at, expires_at, attempts)
      values (bucket->>'key', window_start, window_end, 1)
      on conflict (bucket_key, window_started_at) do update
        set attempts = least(public.zn_security_comp_rate_limits.attempts + 1, 1000000)
      returning attempts into observed_count;
    if observed_count > ceiling then
      retry_seconds := greatest(retry_seconds, ceil(extract(epoch from (window_end - now())))::integer);
    end if;
  end loop;
  return jsonb_build_object('allowed', retry_seconds = 0, 'retry_after', retry_seconds);
end;
$$;

create or replace function public.create_zn_security_comp_ticket(
  p_resume_token_hash text,
  p_ip_hash text,
  p_year integer
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_number integer;
  number_text text;
  new_id text;
begin
  if p_resume_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid resume token hash';
  end if;
  if p_ip_hash is not null and p_ip_hash <> '' and p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid ip hash';
  end if;
  if p_year < 2024 or p_year > 2100 then
    raise exception 'invalid year';
  end if;
  insert into public.zn_security_comp_counters(year, last_number)
    values (p_year, 1)
    on conflict (year) do update
      set last_number = public.zn_security_comp_counters.last_number + 1
    returning last_number into next_number;
  -- lpad truncates, so 1000 must not be forced back to three characters.
  number_text := next_number::text;
  if next_number < 1000 then
    number_text := lpad(number_text, 3, '0');
  end if;
  new_id := 'ZNS-' || lpad((p_year % 100)::text, 2, '0') || '-' || number_text;
  insert into public.zn_security_comp_tickets(ticket_id, resume_token_hash, status, ip_hash)
    values (new_id, p_resume_token_hash, 'awaiting_payment', nullif(p_ip_hash, ''));
  return new_id;
end;
$$;

create or replace function public.verify_zn_security_comp_payment(
  p_ticket_id text,
  p_txid text,
  p_min_zats bigint,
  p_fee_address text,
  p_tx_table text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_bound text;
  v_row record;
  v_low boolean := false;
  v_ok boolean := false;
  v_amount bigint;
  v_paid bigint;
begin
  if p_ticket_id !~ '^ZNS-[0-9]{2}-[0-9]{3,}$' or p_min_zats is null or p_min_zats <= 0 or p_fee_address is null or p_fee_address = '' then
    return 'invalid';
  end if;
  if p_txid !~ '^[0-9a-f]{64}$' or p_tx_table !~ '^[a-z][a-z0-9_]{0,62}$' then
    return 'invalid';
  end if;

  select status, payment_txid into v_status, v_bound
    from public.zn_security_comp_tickets
    where ticket_id = p_ticket_id
    for update;
  if not found then
    return 'missing';
  end if;
  if v_status <> 'awaiting_payment' then
    if v_bound = p_txid then
      return 'already_verified';
    end if;
    return 'not_awaiting';
  end if;

  begin
    for v_row in execute format(
      'select amount_zats, memo, is_outgoing, status, recipient_address from public.%I where lower(txid) = $1',
      p_tx_table
    ) using p_txid
    loop
      if v_row.is_outgoing is not true
        and v_row.status in ('mempool', 'confirmed')
        and v_row.recipient_address = p_fee_address
        and public.zn_security_comp_memo_ticket(v_row.memo) = p_ticket_id
      then
        v_amount := case
          when v_row.amount_zats is null then null
          else trunc(v_row.amount_zats)::bigint
        end;
        if v_amount is not null and v_amount >= p_min_zats then
          if not v_ok then
            v_paid := v_amount;
          end if;
          v_ok := true;
        else
          v_low := true;
        end if;
      end if;
    end loop;
  exception
    when undefined_table then
      return 'unavailable';
  end;

  if not v_ok then
    if v_low then
      return 'wrong_amount';
    end if;
    return 'not_found';
  end if;

  if exists (
    select 1 from public.zn_security_comp_tickets
    where payment_txid = p_txid and ticket_id <> p_ticket_id
  ) then
    return 'already_used';
  end if;

  begin
    update public.zn_security_comp_tickets
      set status = 'payment_verified',
          payment_txid = p_txid,
          payment_amount_zats = v_paid,
          payment_verified_at = now()
      where ticket_id = p_ticket_id
        and status = 'awaiting_payment';
  exception
    when unique_violation then
      return 'already_used';
  end;

  if not found then
    return 'not_awaiting';
  end if;
  return 'verified';
end;
$$;

create or replace function public.begin_zn_security_comp_submit(
  p_ticket_id text,
  p_researcher_handle text,
  p_github_username text,
  p_payout_address text,
  p_claimed_severity text,
  p_affected_commit text,
  p_affected_module text,
  p_report_payload jsonb
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_started timestamptz;
begin
  if p_ticket_id !~ '^ZNS-[0-9]{2}-[0-9]{3,}$' then
    return 'missing';
  end if;
  if p_report_payload is null
    or jsonb_typeof(p_report_payload) <> 'object'
    or octet_length(p_report_payload::text) > 200000
    or p_claimed_severity not in ('critical', 'high', 'medium', 'low')
    or p_affected_commit !~ '^[0-9a-f]{7,64}$'
    or char_length(coalesce(p_researcher_handle, '')) not between 1 and 64
    or char_length(coalesce(p_affected_module, '')) not between 1 and 200
    or char_length(coalesce(p_payout_address, '')) not between 1 and 512
  then
    return 'invalid';
  end if;

  select status, github_attempt_started_at into v_status, v_started
    from public.zn_security_comp_tickets
    where ticket_id = p_ticket_id
    for update;
  if not found then
    return 'missing';
  end if;
  if v_status = 'submitted' then
    return 'submitted';
  end if;
  if v_status = 'submitting' and v_started is not null and v_started > now() - interval '45 seconds' then
    return 'in_progress';
  end if;
  if v_status not in ('payment_verified', 'github_failed', 'submitting') then
    return 'payment_required';
  end if;

  update public.zn_security_comp_tickets
    set status = 'submitting',
        github_attempt_started_at = now(),
        researcher_handle = p_researcher_handle,
        github_username = nullif(p_github_username, ''),
        payout_address = p_payout_address,
        claimed_severity = p_claimed_severity,
        affected_commit = p_affected_commit,
        affected_module = p_affected_module,
        report_payload = p_report_payload
    where ticket_id = p_ticket_id;
  return 'started';
end;
$$;

create or replace function public.finish_zn_security_comp_submit(
  p_ticket_id text,
  p_ok boolean,
  p_ghsa_id text,
  p_html_url text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status
    from public.zn_security_comp_tickets
    where ticket_id = p_ticket_id
    for update;
  if not found or v_status <> 'submitting' then
    return 'ignored';
  end if;
  if p_ok then
    if p_ghsa_id is null or p_ghsa_id !~ '^[A-Za-z0-9-]{1,64}$' then
      return 'invalid';
    end if;
    update public.zn_security_comp_tickets
      set status = 'submitted',
          github_ghsa_id = p_ghsa_id,
          github_html_url = case
            when p_html_url like 'https://github.com/%' and char_length(p_html_url) <= 300 then p_html_url
            else null
          end,
          report_payload = null
      where ticket_id = p_ticket_id
        and status = 'submitting';
    return 'saved';
  end if;
  update public.zn_security_comp_tickets
    set status = 'github_failed'
    where ticket_id = p_ticket_id
      and status = 'submitting';
  return 'saved';
end;
$$;

revoke all on function public.zn_security_comp_memo_ticket(text) from public, anon, authenticated;
revoke all on function public.consume_security_comp_limits(jsonb) from public, anon, authenticated;
revoke all on function public.create_zn_security_comp_ticket(text, text, integer) from public, anon, authenticated;
revoke all on function public.verify_zn_security_comp_payment(text, text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.begin_zn_security_comp_submit(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.finish_zn_security_comp_submit(text, boolean, text, text) from public, anon, authenticated;

grant execute on function public.zn_security_comp_memo_ticket(text) to service_role;
grant execute on function public.consume_security_comp_limits(jsonb) to service_role;
grant execute on function public.create_zn_security_comp_ticket(text, text, integer) to service_role;
grant execute on function public.verify_zn_security_comp_payment(text, text, bigint, text, text) to service_role;
grant execute on function public.begin_zn_security_comp_submit(text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.finish_zn_security_comp_submit(text, boolean, text, text) to service_role;

commit;
