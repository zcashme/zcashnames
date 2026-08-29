# ENS Outreach Queue

Apply `sql/2026-08-25-ens-outreach.sql` in Supabase before opening `/internal/ens-outreach`.

The tool reads `zn_protected_names` with `ens_priority_claim = true`, parses the standardized Top-1000 reason, and never sends an X post. It looks for the latest authored post containing `zec`, `zcash`, `privacy`, or `zkp`; rows without a match link to a prefilled X search. It uses the existing OAuth credentials for X reads first. If X returns 401 or 403, create a Project/App in the [X Developer Portal](https://developer.x.com/en/portal/dashboard), generate an app bearer token with read access, and set `X_READ_BEARER_TOKEN` in the internal-tools environment.

Install Chromium once wherever this tool runs:

```powershell
pnpm exec playwright install chromium
```

Optional environment values:

- `ENS_OUTREACH_OUTPUT_DIR`: temporary local capture directory; defaults to `output/ens-outreach`.
- `ENS_OUTREACH_MODAL_SELECTOR`: selector used to validate the protected-name popup; defaults to `[role="dialog"], [aria-modal="true"]`.

Static popup images are uploaded to the public `ens-outreach-assets` bucket and can be copied from the internal queue.
