# ZcashNames Internal Tools

This repository is the local-only tooling worktree for ZcashNames.

Its purpose is narrow:

- `/admin/**`
- `/internal/**`
- shared support code those routes need
- local OG preview rendering under `/og/**`

The deployable public site lives in `dotzcash_main`. This repo should not
re-implement public-site ownership unless an internal tool needs a read-only
bridge to it.

## Current Route Surface

Expected local routes:

- `http://localhost:3000/admin`
- `http://localhost:3000/internal`

Supporting local routes intentionally still exist:

- `/api/campaign-worker`
- `/api/blockinfo-post`
- `/og/*.png`

## What Stays Here

- admin campaign tooling
- admin beta invite tooling
- internal email preview tooling
- internal banner/link/unsubscribe preview tooling
- internal quotepost and text-splitter tools
- internal blockinfo-post tooling
- email rendering, personalization, and campaign support code

## What Does Not Belong Here

- public docs
- public landing pages
- public waitlist flows
- public explorer, collections, roadmap, gallery, brandkit, or beta pages
- production unsubscribe pages

Those belong to `dotzcash_main`.

## Local Development

```powershell
pnpm install
pnpm dev
```

Then open:

- `http://localhost:3000/admin`
- `http://localhost:3000/internal`

## Notes

- `/internal/unsubscribe-preview` generates tokens locally and opens the live
  unsubscribe flow hosted by `dotzcash_main`.
- `/internal/link-previews` is allowed to preview real public OG images through
  local `/og/*` routes.
- `public/brandkit/**` stays here because internal previews still use those
  assets locally.

See [INTERNAL_TOOLS.md](./INTERNAL_TOOLS.md) for the detailed repo contract.
