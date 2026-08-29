# Local-Only Tooling Worktree

This worktree exists so ZcashNames private tooling can run independently from
the deployable public site.

## Repo Contract

- `dotzcash_main` owns the public site.
- `dotzcash_internal_tools` owns local-only tooling.
- This repo is allowed to keep shared support code only when `/admin` or
  `/internal` still needs it.
- This repo is allowed to read or mirror public-site outputs from
  `dotzcash_main`, but it should not re-own those routes.

In practice, this repo should build and serve:

- `/admin/**`
- `/internal/**`
- `/og/**`
- `/api/campaign-worker`

Everything else should be treated as suspect unless it directly supports those
areas.

## What Lives Here

Primary route groups:

- `app/admin/**`
- `app/(site)/internal/**`
- `app/(site)/internal/quotepost/**`
- `app/og/**`

Primary support code:

- `components/admin/**`
- `components/emails/**`
- `lib/admin/**`
- `lib/campaigns/**`
- `lib/email/**`
- `lib/email-preview/**`
- retained beta admin libs
- `public/brandkit/**`
- `public/banner-preview-assets/**`
- `sql/**`

## Current Local Routes

### Admin

- `/admin/beta`
- `/admin/beta-v2`
- `/admin/campaigns`
- `/admin/protected-names`

These routes remain local-only and are the main reason this repo exists.

#### Protected names admin

- Queue: `/admin/protected-names` (default: `under_review` or open disputes)
- Name review: `/admin/protected-names/:name`
- Dispute review: `/admin/protected-names/:name/disputes/:disputeId`
- SQL (apply in Supabase before mutations work):
  `sql/2026-08-06-protected-names-admin-ops.sql`
- Public suggestion/dispute forms stay in `dotzcash_main`.

### Internal

- `/internal/email-preview`
- `/internal/beta-invite-preview`
- `/internal/banner-preview`
- `/internal/link-previews`
- `/internal/text-splitter`
- `/internal/unsubscribe-preview`
- `/internal/quotepost`
- `/internal/blockinfo-post`

### Support

- `/og/*.png`
- `/api/campaign-worker`
- `/api/blockinfo-post`

## Important Boundaries

### Public-site ownership stays in `dotzcash_main`

This repo should not reintroduce:

- docs pages
- landing pages
- waitlist pages
- explorer / collections
- roadmap / gallery / brandkit pages
- beta public routes
- public unsubscribe routes

If an internal tool needs those, it should usually link to or preview the
`dotzcash_main` version instead of rebuilding the route locally.

### Allowed read-only bridge examples

- `/internal/unsubscribe-preview`
  - generates a valid token locally, then opens the live unsubscribe page on
    `dotzcash_main`
- `/internal/link-previews`
  - previews OG output for real public URLs using local `/og/*.png` routes
- email preview tooling
  - can share templates and personalization logic that production also uses

## Access Model

### `/admin`

Admin routes are still guarded in `app/admin/layout.tsx` through
`lib/admin/local-only.ts`:

- allow `localhost`
- allow `127.0.0.1`
- allow `*.local`
- reject everything else

### `/internal`

`/internal` remains private by repo separation, not by the same localhost gate.
That is acceptable because this worktree is not the public deployment target.

## Local Workflow

```powershell
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:3000/admin
http://localhost:3000/internal
```

Useful direct routes:

```text
http://localhost:3000/admin/beta-v2/drafts
http://localhost:3000/admin/campaigns/drafts
http://localhost:3000/internal/email-preview?email=beta-invite
http://localhost:3000/internal/banner-preview
http://localhost:3000/internal/quotepost
```

## Beta Invite Notes

This repo still owns the local beta invite admin and preview tools:

- `/admin/beta/**`
- `/admin/beta-v2/**`
- `/internal/beta-invite-preview`
- `/internal/email-preview?email=beta-invite`

Production send-path code may still be shared here when admin tooling depends
on the same templates or personalization logic. That is acceptable because it
is support code, not duplicate public-site ownership.

## Verification

Useful checks:

```powershell
git branch --show-current
git worktree list
git status --short
pnpm exec tsc --noEmit
pnpm build
```

Expected end state:

- this worktree builds with `/admin` and `/internal`
- public-site route trees are absent
- `dotzcash_main` remains the public-site owner
