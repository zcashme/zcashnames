# Internal expense reports

Shared-link team submissions with required receipts. Review stays on admin credentials.

## Setup

1. Apply `sql/2026-09-23-zn-expenses.sql` in the Supabase SQL editor.
2. Set `EXPENSE_FORM_SECRET` on the Vercel project. Use a long random value (at least 16 characters) that is different from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Hex from two GUIDs works:

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```
3. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set.

## Links

- Team submit: `https://<host>/expenses?access=<EXPENSE_FORM_SECRET>`
- Review inbox: `/admin/expenses` (existing admin basic auth)

The first visit with the shared link sets an httpOnly cookie on `/expenses` and strips `access` from the URL. Later visits from that browser can submit without the query string.

Localhost skips the shared-link check so you can fill the form at `http://localhost:3000/expenses`.

## Data

- Table: `public.zn_expenses` (RLS on, no anon/authenticated grants)
- Receipts: private Storage bucket `expense-receipts`
- Admin receipt buttons mint 2-minute signed URLs
