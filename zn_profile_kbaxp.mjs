import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Profile KBAXP3jy
const { data: owners } = await db
  .from("zn_waitlist")
  .select("name, email, email_verified, created_at, human_referral_code, referred_by, fluffypony_quarantine")
  .eq("referral_code", "KBAXP3jy");
const owner = owners?.[0];

const recruits = [];
let from = 0;
while (true) {
  const { data } = await db
    .from("zn_waitlist")
    .select("name, email, email_verified, created_at, referral_code, fluffypony_quarantine")
    .eq("referred_by", "KBAXP3jy")
    .order("created_at", { ascending: true })
    .range(from, from + 999);
  recruits.push(...(data ?? []));
  if (!data || data.length < 1000) break;
  from += 1000;
}

console.log("══════════ KBAXP3jy ══════════");
if (owner) {
  console.log(`Owner: ${owner.name} <${owner.email}>`);
  console.log(`  verified=${owner.email_verified}  created=${owner.created_at?.slice(0, 16)}`);
  console.log(`  human_ref=${owner.human_referral_code ?? "(none)"}  referred_by=${owner.referred_by ?? "(direct)"}`);
  console.log(`  fluffypony_quarantine=${owner.fluffypony_quarantine}`);
}
const v = recruits.filter((r) => r.email_verified).length;
console.log(`\nRecruits: ${recruits.length} | verified=${v} (${Math.round((100 * v) / recruits.length)}%) | unverified=${recruits.length - v}`);
console.log(`Date range: ${recruits[0]?.created_at?.slice(0, 16)}  →  ${recruits[recruits.length - 1]?.created_at?.slice(0, 16)}`);

// Downstream chain — KBAXP3jy's recruits who themselves referred others
const recruitCodes = recruits.map((r) => r.referral_code).filter(Boolean);
console.log(`\nDownstream chain — KBAXP3jy's recruits who themselves referred others:`);
const { data: downstream } = await db.from("zn_waitlist").select("referred_by").in("referred_by", recruitCodes);
const downstreamCounts = new Map();
for (const r of downstream ?? []) downstreamCounts.set(r.referred_by, (downstreamCounts.get(r.referred_by) ?? 0) + 1);
const topDownstream = [...downstreamCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [code, n] of topDownstream) {
  const recruit = recruits.find((r) => r.referral_code === code);
  console.log(`  ${String(n).padStart(4)} signups via  ${code}  (recruit: ${recruit?.name} <${recruit?.email}>  fpq=${recruit?.fluffypony_quarantine})`);
}

// Burst minutes
const byMin = new Map();
for (const r of recruits) {
  const m = (r.created_at ?? "").slice(0, 16);
  if (m) byMin.set(m, (byMin.get(m) ?? 0) + 1);
}
const bursts = [...byMin.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`\nTop minutes with ≥3 signups (direct recruits):`);
for (const [m, n] of bursts) console.log(`  ${m}  ${n}`);

// Sample of unverified
const unverified = recruits.filter((r) => !r.email_verified);
console.log(`\nFirst 5 unverified direct recruits:`);
for (const r of unverified.slice(0, 5)) {
  console.log(`  ${r.created_at?.slice(0, 16)}  ${r.email}  name=${r.name}  fpq=${r.fluffypony_quarantine}`);
}

// Sample of VERIFIED recruits — these are the ones we can't delete; check for bot signals
console.log(`\nFirst 5 verified direct recruits (the ones we'd need real proof to touch):`);
const verifiedRecruits = recruits.filter((r) => r.email_verified);
for (const r of verifiedRecruits.slice(0, 5)) {
  console.log(`  ${r.created_at?.slice(0, 16)}  ${r.email}  name=${r.name}  fpq=${r.fluffypony_quarantine}`);
}
