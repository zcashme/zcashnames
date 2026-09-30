# Protected Names Admin

Operational review UI for protected-name suggestions, disputes, and access requests.

## Setup

1. Apply `sql/2026-08-06-protected-names-admin-ops.sql`, `sql/2026-08-25-protected-name-decision-dashboard.sql`, `sql/2026-08-28-approved-protected-name-access-requests-view.sql`, `sql/2026-09-03-protected-name-decision-email-history.sql`, `sql/2026-09-04-protected-name-access-decision-corrections.sql`, `sql/2026-10-01-ens-pending-status.sql`, and `sql/2026-10-01-ens-pending-early-access-reject.sql` in the Supabase SQL editor, in that order.
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
3. Open `/admin/protected-names` (localhost bypasses basic auth; deployed hosts need `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

## Routes

| Path | Purpose |
|------|---------|
| `/admin/protected-names` | Suggestions awaiting protection review |
| `/admin/protected-names/disputes` | Disputes awaiting review |
| `/admin/protected-names/access` | Protected-name access requests awaiting review |
| `/admin/protected-names/:name` | Name review, status, metadata, evidence, disputes |
| `/admin/protected-names/:name/disputes/:disputeId` | Accept / dismiss dispute |
| `/admin/protected-names/access/:requestId` | Approve / deny access request |
| `/admin/protected-names/history` | Search all decisions, corrections, and email attempts |

Public suggestion and dispute forms remain in `dotzcash_main`.

## Decisions and email

- Suggestions, disputes, and access requests require an approval or denial reason.
- Each decision is immutable in `zn_protected_name_decisions`, including a by-value snapshot of every submitted contact method and the preferred contact.
- Later reason changes are immutable corrections, preserving the original reason and becoming the current rationale.
- The dashboard sends the exact reason to the requester's email through Resend after the database decision commits.
- Every delivery attempt stores its exact subject and HTML. Sent emails can be viewed or resent, and failed emails can be retried without changing the underlying decision.
- Decision panels include a preview toggle that renders the exact branded email and subject before sending.

## Manual access-code fulfillment

After applying the view migration, run this in the Supabase SQL editor to recall every approved access request:

```sql
select *
from public.approved_protected_name_access_requests
order by approved_at desc;
```

The view uses the immutable decision log as its source of truth and includes the requester's preferred contact details, approval reason, and supporting context.

## Status rules (summary)

- `under_review` → `protected` | `rejected`
- `protected` ↔ `rejected` (rejecting protected requires `redeemed = false`)
- Return to `under_review` allowed from rejected, or from protected only when not redeemed
- Redeemed names must stay `protected`
- `pending` is the ENS holding state: listed, requestable, claim gate off, `expires_at` null
- Pending ENS names with no `submitted` or `approved` access request auto-reject at Early Access (`2026-10-15T16:00:00.000Z`) with reason `ENS priority access was not requested before Early Access`
- A live `submitted` request keeps the name pending until you decide
- Approving an ENS access request sets `protected` and `expires_at = 2026-11-01T16:00:00.000Z`
- Denying (or correcting away from approved) with no other approved request returns the ENS row to `pending`
- Dispute accept: filed against `protected` aims for `rejected`; filed against `rejected` aims for `protected`
- Corroborating accepts (name already at target status) append reason only
- Variant propagation is optional on real transitions for parent names; redeemed descendants are skipped

## Evidence

- Stored as JSON arrays on the name and dispute rows
- Legacy public submissions may be bare URL strings; admin coerces them for display
- New admin writes use structured objects (`id`, `title`, `url`, …)
- Mutations use optimistic concurrency via `expected_updated_at`

## Error prefixes (SQL)

| Prefix | Meaning |
|--------|---------|
| `PN_NOT_FOUND:` | Missing name, dispute, or evidence id |
| `PN_CONFLICT:` | Illegal status / redeemed / dispute already decided |
| `PN_VALIDATION:` | Bad input |
| `PN_CONCURRENCY:` | Stale `updated_at` |
