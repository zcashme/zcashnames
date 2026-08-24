# Campaigns QA Checklist

Use this checklist to manually verify `/admin/campaigns` after deploys or performance changes.

Assumptions:
- the app is running
- Supabase migrations/functions have been applied
- you have admin access
- there is real data in `zn_waitlist`, `email_subscribers`, and `waitlist_referral_stats`

Keep this query ready in Supabase for spot checks:

```sql
select id, title, source_kind, audience_scope, dedupe_mode, recipient_count, recipient_estimate_generated_at
from public.campaigns
order by created_at desc
limit 10;
```

## Scenario 1: Create Draft

1. Open `/admin/campaigns/drafts`
2. Create a new campaign
3. Open the new draft
4. Set:
   - title: `QA Campaign 2026-06-22 A`
   - subject: `QA Subject A`
   - body:

```text
Hello {{name}}

Your referral link: {{referral_url}}
```

5. Wait for autosave
6. Hard refresh the page

Expected:
- draft still exists
- title, subject, and body persist
- no save error

## Scenario 2: Waitlist Verified Only Estimate

1. Set:
   - source kind: `zn_waitlist`
   - audience scope: `verified_only`
   - dedupe mode: `one_per_email`
2. Click `Refresh recipients`

Expected:
- nonzero recipient count
- sample list populated
- no blocked recipients
- no estimate error

DB check:

```sql
select recipient_count, recipient_sample, recipient_blocked, recipient_estimate_generated_at
from public.campaigns
where title = 'QA Campaign 2026-06-22 A'
order by created_at desc
limit 1;
```

Expected:
- `recipient_count > 0`
- `recipient_sample` is non-null json
- `recipient_estimate_generated_at` is non-null

## Scenario 3: Waitlist All Rows vs Verified Newsletter

1. Set audience scope to `all_rows`
2. Click `Refresh recipients`
3. Record count as `count_all`
4. Set audience scope to `verified_newsletter`
5. Click `Refresh recipients`
6. Record count as `count_verified_newsletter`

Expected:
- `count_all >= count_verified_newsletter`
- both actions succeed
- sample updates each time

DB validation for `verified_newsletter`:

```sql
select count(*)
from public.zn_waitlist
where coalesce(trim(email), '') <> ''
  and email_verified is true
  and newsletter is true;
```

If dedupe mode is `one_per_email`, validate against normalized unique emails:

```sql
select count(*) as contactable_unique_emails
from (
  select lower(trim(email)) as normalized_email
  from public.zn_waitlist
  where coalesce(trim(email), '') <> ''
    and email_verified is true
    and newsletter is true
  group by lower(trim(email))
) t;
```

## Scenario 3b: Waitlist Verified Unreserved

Requires `sql/2026-08-24-campaign-audience-verified-unreserved.sql` applied in Supabase.

1. Set:
   - source kind: `zn_waitlist`
   - audience scope: `verified_unreserved`
   - dedupe mode: `one_per_email`
2. Click `Refresh recipients`
3. Record count as `count_verified_unreserved`
4. Set audience scope to `verified_only`
5. Click `Refresh recipients`
6. Record count as `count_verified_only`

Expected:
- `count_verified_only >= count_verified_unreserved`
- both actions succeed
- sample updates each time

DB validation for `verified_unreserved` with `one_per_email`:

```sql
select count(*) as verified_unreserved_unique_emails
from (
  select lower(trim(email)) as normalized_email
  from public.zn_waitlist
  where coalesce(trim(email), '') <> ''
    and email_verified is true
    and name_reserved is not true
  group by lower(trim(email))
) t;
```

This count is an upper bound versus the campaign estimate: suppressions and waitlist unsubscribes are excluded at estimate time.

## Scenario 4: Waitlist Selected Emails Happy Path

1. Set audience scope to `selected_emails`
2. In the waitlist emails box enter two known real waitlist emails:

```text
known1@example.com
known2@example.com
```

3. Click `Refresh recipients`

Expected:
- count is `1` or `2+` depending on dedupe mode and data
- sample contains those people
- blocked section is empty

If you need real emails:

```sql
select email
from public.zn_waitlist
where email is not null
limit 5;
```

## Scenario 5: Waitlist Selected Emails Missing + Invalid

1. Keep `selected_emails`
2. Replace text with:

```text
not-on-waitlist@example.com
bad-email
```

3. Click `Refresh recipients`

Expected:
- invalid email error shown because of `bad-email`
- no successful estimate update

4. Remove invalid email and leave:

```text
not-on-waitlist@example.com
```

5. Click `Refresh recipients`

Expected:
- count `0`
- blocked contains `not-on-waitlist@example.com`
- reason is `not_on_waitlist`

## Scenario 6: Dedupe Mode

1. Use `selected_emails`
2. Enter one real email that has multiple waitlist rows if available
3. Set dedupe mode to `one_per_email`
4. Click `Refresh recipients`
5. Record count
6. Set dedupe mode to `one_per_row`
7. Click `Refresh recipients`

Expected:
- `one_per_row >= one_per_email`
- if duplicate rows exist, `one_per_row` should be larger

## Scenario 7: Preview With Live Stats

1. Set source kind: `zn_waitlist`
2. Subject:

```text
Stats for {{name}}
```

3. Body:

```text
Direct: {{direct_referrals}}

Rank: {{leaderboard_rank}}

Waitlist position: {{waitlist_position}}

Link: {{referral_url}}
```

4. Click `Refresh preview`

Expected:
- preview renders successfully
- no runtime error
- tokens resolve to values or `N/A`
- no missing `waitlist_referral_stats` error

If it fails:

```sql
select public.refresh_waitlist_referral_stats();
```

Then retry.

## Scenario 8: Estimate Cache Persists

1. Click `Refresh recipients`
2. Reload page
3. Observe recipient section immediately after load

Expected:
- count and sample already populated from cached campaign fields
- page should not show stale estimate state unless targeting changed

## Scenario 9: Email Subscribers Source

1. Create a second draft
2. Title: `QA Campaign Subscribers`
3. Source kind: `email_subscribers`
4. Series: choose a known active series such as `general`
5. Subject:

```text
Subscriber QA
```

6. Body:

```text
Hello {{name}}
```

7. Click `Refresh recipients`

Expected:
- count equals active confirmed subscribers in that series
- no blocked recipients
- sample populated

DB validation:

```sql
select count(*)
from public.email_subscribers
where series = 'general'
  and unsubscribed_at is null
  and confirmed_at is not null;
```

Expected:
- count matches or closely matches UI count

## Scenario 10: Custom Emails Without Series

1. Create third draft
2. Title: `QA Campaign Custom No Series`
3. Source kind: `custom_emails`
4. Leave series blank if allowed
5. Enter:

```text
alpha@example.com
beta@example.com
```

6. Click `Refresh recipients`

Expected:
- count `2`
- sample contains both
- no blocked list
- unsubscribe footer is unavailable or disabled for one-off send

## Scenario 11: Custom Emails With Series

1. In the same draft set series to `general`
2. Enter:

```text
active@example.com
unsubscribed@example.com
```

Use real addresses if needed:

```sql
select email, confirmed_at, unsubscribed_at
from public.email_subscribers
where series = 'general'
limit 20;
```

3. Click `Refresh recipients`

Expected:
- active email included
- unsubscribed email appears under blocked with reason `unsubscribed`

## Scenario 12: Send Now Small Audience

1. Use a draft with a very small audience, ideally `selected_emails` with 1-2 real recipients
2. Click `Send now`

Expected:
- success notice appears
- delivery batches appear
- no full-page jank
- delivery state updates

DB checks:

```sql
select campaign_id, batch_number, status, recipient_count, sent_count, failed_count
from public.campaign_delivery_batches
order by created_at desc
limit 10;
```

```sql
select campaign_id, recipient_key, email, send_status, campaign_delivery_batch_id
from public.campaign_recipient_snapshots
order by created_at desc
limit 20;
```

Expected:
- batch rows created
- snapshot rows created
- pending, sent, and failed statuses make sense

## Scenario 13: Queue Paced Send

1. Use a draft with more than a handful of recipients
2. Click `Queue paced send`

Expected:
- multiple batches created if audience is large enough
- delivery progress section shows batch counts
- next eligible time populated

## Scenario 14: Pause / Resume / Cancel

1. With a queued or active paced campaign, click `Pause delivery`

Expected:
- paused state shown
- button changes to resume
- no page reload required for UI update

2. Click `Resume delivery`

Expected:
- pause flag cleared
- active state returns

3. Click `Cancel remaining batches`

Expected:
- canceled state shown
- remaining pending or sending batches marked canceled

## Scenario 15: Scheduled Send

1. Create a draft with a small audience
2. Enable schedule
3. Pick a valid future Eastern time a few minutes ahead
4. Click `Queue scheduled send`

Expected:
- scheduled notice appears
- batches created
- next eligible time equals selected Eastern time

## Scenario 16: Sent View

1. Open `/admin/campaigns/sent`
2. Open a campaign that has already run
3. Verify:
   - recipient count shown
   - status shown
   - preview renders
   - send attempts visible

DB check:

```sql
select id, email, status, provider_message_id, error, attempted_at
from public.campaign_send_attempts
order by attempted_at desc
limit 20;
```

Expected:
- attempts exist for sent or failed recipients
- timestamps are recent for the test run

## Scenario 17: Waitlist Updates Unsubscribe

Requires `sql/2026-08-19-waitlist-honor-updates-unsubscribe.sql`.

1. Create a new `zn_waitlist` draft
2. Confirm include-unsubscribe is on
3. Preview the email

Expected:
- footer says `Unsubscribe from waitlist campaigns`
- footer mentions early-access / waitlist mail vs transactional mail

4. Pick a verified waitlist email and set `email_subscribers.unsubscribed_at` for series `waitlist`
5. Use audience `selected_emails` with that address and one still-subscribed verified address
6. Refresh recipients

Expected:
- unsubscribed address is blocked with reason `unsubscribed`
- subscribed address remains in the count

7. Open `/internal/unsubscribe-preview?series=waitlist`
8. Turn Waitlist campaigns off and save

Expected:
- success copy says they will no longer receive waitlist campaign emails

9. Turn Waitlist campaigns back on and save (same verified waitlist inbox)

Expected:
- no confirmation email
- success copy says they will receive waitlist campaign emails again
- a new recipient refresh no longer blocks that address

## Fast Failure Checks

Referral stats table:

```sql
select count(*), min(refreshed_at), max(refreshed_at)
from public.waitlist_referral_stats;
```

Recipient estimate cache:

```sql
select title, recipient_count, recipient_sample, recipient_blocked, recipient_estimate_generated_at, recipient_estimate_cache_key
from public.campaigns
order by created_at desc
limit 10;
```

Delivery state:

```sql
select campaign_id, batch_number, status, next_eligible_at, sent_count, failed_count
from public.campaign_delivery_batches
order by created_at desc
limit 20;
```
