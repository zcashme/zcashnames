import "server-only";
import { createClient } from "@supabase/supabase-js";

//
// Singleton Supabase client — server-only (never ships to the browser).
//
// Uses the service_role key, which bypasses RLS, so all queries run with
// full database access. The `server-only` import ensures this module cannot
// be accidentally imported in a client component.
//
// Tables in use:
//   zn_waitlist          — waitlist signups, referral tracking
//   zn_reserved_names    — blocked / reserved name list
//   beta_testers         — closed-beta tester accounts (v1)
//   beta_testers_v2      — open-beta applications (v2)
//   beta_feedback        — beta feedback submissions
//   beta_checklist_progress — per-tester checklist ticks
//   cabal_invites         — cabal/influencer deck access codes
//   indexer_launch_alert_signups — indexer launch notification signups
//
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
