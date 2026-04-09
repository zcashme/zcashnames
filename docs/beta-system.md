---
title: ZcashNames Closed Beta — Operator README
audience: maintainers (you)
status: living doc
---

# ZcashNames Closed Beta — How It Works

A short operator's guide to the closed-beta system: what's on the site, how data moves, and how you run it day to day.

The user-facing brief lives at [/closedbeta](../app/(site)/closedbeta/page.tsx) (and [docs/closed-beta.md](./closed-beta.md) as a frozen reference). This doc is for **you** — the person actually running the beta.

---

## TL;DR

1. People apply at `/closedbeta/apply`. A row lands in `beta_testers` with status `applied`. You get an email at `partner@zcash.me` with their details and the auto-generated invite code.
2. You decide who's in. For chosen applicants, you DM the code (from the email) via their preferred contact, then flip the row's `status` to `invited` in Supabase.
3. Tester visits `/`, clicks **Mainnet** or **Testnet** in the header, enters the invite code as the password. The system attributes their session, sets a cookie, and auto-flips their status to `active`.
4. The home page shows a floating **Submit Feedback** button. The panel has a checklist (the test plan) and a report form. Reports are tied to checklist items and saved to `beta_feedback` (with screenshots in Supabase Storage).
5. You read reports straight from the Supabase table editor. To revoke a tester: `update beta_testers set status='revoked', revoked_at=now() where id='...'`. They're locked out instantly.

---

## The four URLs

| URL | Audience | What it does |
|---|---|---|
| `/` | Public | Home page. Header has the network toggle. Once unlocked, a feedback panel slides in from the right. |
| `/closedbeta/apply` | Public | Application form for would-be testers. Generates a tester row + invite code on submit. |
| `/closedbeta` | Public (no gate) | The welcome brief. Read by invited testers, with a CTA at the top for visitors who landed here without an invite. |
| `/closedbeta/feedback` | Popout | Standalone feedback form. Opened by the popout icon in the panel. Shares cookies + state with the main window. |

`/closedbeta` and its children are `noindex`. The apply page is publicly reachable but unlinked from anywhere except `/closedbeta` itself, so it's effectively share-only.

---

## Data model

Three Supabase objects, all RLS-locked to the service role.

### `public.beta_testers`

The authoritative tester registry and the application table, in one. Key columns:

- `id` — `tester_<slug>_<6 hex>`, generated server-side
- `display_name`
- `code_hash` — sha256 of the invite code
- `invite_code` — plaintext
- `status` — enum: `applied | invited | active | revoked`
- `submitted_at`, `code_sent_at`, `activated_at`, `revoked_at`
- Application fields: `why`, `wallets`, `experience`, `referral_source`
- Contact columns: `contact_email`, `contact_signal`, `contact_discord`, `contact_x`, `contact_telegram`, `contact_forum`, plus `best_contact_kind`
- `ip_hash`, `user_agent` — captured at application time
- `notes` — your private scratch space; nothing in the app reads it

**Soft email dedupe** is enforced by a partial unique index: applications fail if `lower(contact_email)` already exists. Other contact methods don't dedupe.

### `public.beta_feedback`

One row per submitted report.

- `id` (uuid), `tester_id` (nullable for anonymous reports), `tester_name_snapshot`
- `stage` — `testnet` or `mainnet`
- `item_id` — the checklist item this report is tied to (always set; UI requires it)
- `severity` — `high | low | none`
- `wallet` (free-text "wallet + version + OS"), `steps`, `expected`, `actual`, `txid`, `notes`
- `screenshot_paths text[]` — paths in the `beta-feedback` Storage bucket
- `user_agent` — captured server-side from request headers
- `created_at`

Indexed on `tester_id`, `(stage, item_id)`, and `created_at desc`.

### `public.beta_checklist_progress`

Empty table. Was originally going to track checkbox state per tester per stage, but the UI moved to localStorage-only after we decided server-side tick state wasn't worth the round-trip. The table is harmless and reserved in case you change your mind.

### `storage.beta-feedback`

Private Supabase Storage bucket. Screenshots upload to `{tester_id ?? 'anonymous'}/{report_uuid}/{filename}`. Reads require signed URLs (mint them with `db.storage.from('beta-feedback').createSignedUrl(path, 60)` when you need to view one).

---

## The lifecycle of a tester

```
[applied] → DM the code, manually flip → [invited] → tester logs in → [active]
                                                                          ↓
                                                                     [revoked]
```

The transitions:

- **`applied`**: form submission. Row inserted with the auto-generated invite code. Email fires to `partner@zcash.me`.
- **`invited`**: you flip this manually after sending the code. Optional but useful for tracking.
- **`active`**: automatic, the moment they successfully use the code on the home page. Set inside `verifyNetworkAccess` as a fire-and-forget UPDATE.
- **`revoked`**: you flip this manually. `findTesterByCode` and `findTesterById` filter `revoked_at IS NULL`, so revoked testers are locked out on the next request.

A new code can be issued by editing the row: generate a new code string, update both `invite_code` and `code_hash` (sha256). Old code stops working immediately because the hash changes. There's no helper for this — do it in the SQL editor.

---

## The lifecycle of a report

The flow inside the feedback panel:

1. Tester opens the panel → it defaults to the **Checklist** tab, populated from [lib/beta/checklist.ts](../lib/beta/checklist.ts). Tick state lives in localStorage, keyed by tester + stage. Per-item save indicators are cosmetic; nothing is written to the DB on tick.
2. Tester clicks an item title (or its arrow) → that item becomes the active "Reporting on" target. The Report tab is forced; the form mounts with the green banner showing the linked item.
3. Tester fills any subset of the optional fields (wallet, steps, expected, actual, txid, notes, screenshots). At least one of these must be present, or a screenshot.
4. **Submit** → server action validates, uploads screenshots to Storage, inserts a row into `beta_feedback`. On success the form clears (wallet stays — it's persisted in localStorage so the tester only types it once across the whole beta). The linked checklist item is **not** cleared, so multiple reports against one item are easy.
5. Severity defaults back to `none` after each submit.

Anonymous reports work too: if a tester unlocked the network with the literal `mainnet` / `testnet` env password instead of an invite code, `tester_id` is `null` and `tester_name_snapshot` is `'anonymous'`.

---

## Environment variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `RESEND_API_KEY` — for the application notification email
- `BETA_GATE_SECRET` — HMAC for the `zn_beta` and `zn_beta_stage` cookies, also used to salt `ip_hash`. Falls back to `WAITLIST_CONFIRM_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` if unset, but you should set it explicitly
- `MAINNET_PASSWORD`, `TESTNET_PASSWORD` — anonymous-access passwords for the network gate (still works alongside invite codes)

Notification email sender / recipient are hardcoded in [lib/email/beta-application.ts](../lib/email/beta-application.ts):

- `FROM_EMAIL = "zechariah@updates.zcashnames.com"`
- `TO_EMAIL = "partner@zcash.me"`

Edit those if either address changes.

---

## Day-to-day operator tasks

### Reading new applications

```sql
select id, display_name, status, submitted_at, contact_email, best_contact_kind, why
from public.beta_testers
where status = 'applied'
order by submitted_at desc;
```

You'll usually catch them via the email notification first.

### Sending an invite

Open the email or the row in the table editor. Copy the `invite_code`. DM via the contact in `best_contact_kind`. Then:

```sql
update public.beta_testers
set status = 'invited', code_sent_at = now()
where id = 'tester_xxx';
```

(Updating status is optional — the auto-flip to `active` will happen anyway when they log in. But it's useful for "have I sent this person their code yet?" sanity checks.)

### Reviewing reports

```sql
select created_at, tester_name_snapshot, stage, item_id, severity, wallet, steps, actual, screenshot_paths
from public.beta_feedback
order by created_at desc
limit 50;
```

Group by item:

```sql
select item_id, count(*) as reports, max(created_at) as last_report
from public.beta_feedback
group by item_id
order by reports desc;
```

### Viewing a screenshot

Bucket is private. Either:

- Open Supabase → Storage → `beta-feedback`, navigate to the path.
- Or from a query, `select storage.create_signed_url('beta-feedback', '<path>', 600)` — gives you a 10-minute URL.

### Adding a tester manually (bypass the application form)

Hash the code first:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOURCODE').digest('hex'))"
```

Then:

```sql
insert into public.beta_testers (id, display_name, code_hash, invite_code, status)
values ('tester_alice', 'Alice', '<sha256 hex>', 'YOURCODE', 'invited');
```

### Revoking a tester

```sql
update public.beta_testers
set status = 'revoked', revoked_at = now()
where id = 'tester_xxx';
```

They lose access on their next request. Existing cookies become useless because `findTesterById` filters revoked rows.

### Killing the whole beta

Either set every tester to revoked, or invalidate the password env vars (`MAINNET_PASSWORD`, `TESTNET_PASSWORD`) and rotate `BETA_GATE_SECRET` (which invalidates every existing cookie).

---

## File map

The system is small enough to keep in your head:

```
app/(site)/
  closedbeta/
    page.tsx              Welcome brief + TOC sidebar
    apply/page.tsx        Public application form
    feedback/page.tsx     Standalone popout for the feedback form

components/closedbeta/
  BetaBrief.tsx           The flat brief content (with the apply CTA)
  BetaToc.tsx             Sidebar with scroll-spy
  BetaApplicationForm.tsx Apply page form with dynamic contact rows
  FeedbackModal.tsx       Right-docked panel with checklist + report tabs
  FeedbackForm.tsx        The report form body (severity, wallet, fields, screenshots)
  FeedbackChecklist.tsx   The interactive checklist with per-item save indicators
  FeedbackStandaloneShell.tsx  Wraps form + checklist for the popout window
  useChecklistProgress.ts Hook backing the checklist (localStorage + sync events)

lib/beta/
  actions.ts              ALL server actions: apply, verify access, submit feedback,
                          checklist progress, sign out, etc.
  gate.ts                 HMAC cookie helpers + stage cookie
  testers.ts              Tester lookup
  checklist.ts            Canonical test items (single source of truth)

lib/email/
  beta-application.ts     Application notification email (Resend, plain text)
```

---

## Cookies

Two httpOnly cookies, both signed/scoped, both 30-day TTL:

- `zn_beta` — `<tester_id>.<expiresAt>.<hmac>`. Set by `verifyNetworkAccess` on a successful invite-code login. Identifies the active tester for feedback attribution and checklist scoping.
- `zn_beta_stage` — plain `testnet` or `mainnet`. Set on every successful network unlock (both invite-code and anonymous paths). Read by the standalone popout window so it knows which stage to log against.

Both cleared by `signOutBetaTester` (currently unwired — there's no UI to call it).

---

## Things that aren't built (and probably don't need to be)

- **No admin UI.** You operate everything from the Supabase table editor and SQL editor. For a closed beta of this size, that's faster than building a custom view.
- **No "mark report as triaged" workflow.** `beta_feedback` has no `status` column. Add one if reports start piling up.
- **No checklist progress sync to DB.** The table exists but the hook never writes to it. Per-stage progress lives in localStorage only. Move to DB later if you want cross-device sync.
- **No re-issue invite-code helper.** Run an UPDATE manually if you need to rotate.
- **No abuse/captcha on the application form.** Two-tier rate limit (30 submissions / 10 min globally + 3 / hour per IP) should be enough for a quiet share-link flow. Add Turnstile if it ever gets shared widely.
- **No `signOutBetaTester` UI.** The action exists; nothing calls it. If a tester wants to "log out" of the beta, they can clear cookies.

---

## Common gotchas

- **Don't forget to seed `beta_testers` for early manual testers.** The application form is the only path that writes to that table now; manually-added testers need an INSERT.
- **The `tester_demo` row from the original schema seed is still there.** Either delete it, or set its status to `revoked` once you're past testing.
- **Screenshot uploads don't deduplicate.** Each upload gets a fresh path under a fresh report UUID. No risk of collision.
- **The popout window inherits the stage cookie at the moment it's opened.** If a tester opens the popout, then switches networks in the main window, the popout still thinks it's on the old stage. They need to close + reopen it. Acceptable edge case.
