import "server-only";
import { createClient } from "@supabase/supabase-js";

//
// Singleton Supabase client â€” server-only (never ships to the browser).
//
// Uses the service_role key, which bypasses RLS, so all queries run with
// full database access. The `server-only` import ensures this module cannot
// be accidentally imported in a client component.
//
// Tables in use:
//   zn_waitlist          â€” waitlist signups, referral tracking
//   zn_reserved_names    â€” blocked / reserved name list
//   beta_testers         â€” closed-beta tester accounts (v1)
//   beta_testers_v2      â€” open-beta applications (v2)
//   beta_feedback        â€” beta feedback submissions
//   beta_checklist_progress â€” per-tester checklist ticks
//   cabal_invites         â€” cabal/influencer deck access codes
//   indexer_launch_alert_signups â€” indexer launch notification signups
//   email_subscribers    â€” confirmed blog-series subscribers
//
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
