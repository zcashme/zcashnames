// Full profile of two suspected referral pyramids rooted at KBAXP3jy and
// PtYdHPRs. Walks the referral tree, collects every descendant, then runs
// objective bot-evidence tests against every row.
//
// Objective bot signatures (no fluffypony_quarantine reliance):
//   1. name === email-local-part      (generator signature)
//   2. trailing-digit suffix on name OR email local-part
//   3. typo-domain (gmgmail/gnail/gamil/etc) or pseudo-random domain
//   4. burst-minute (≥3 signups in the same minute from same referrer)
//   5. closed referral cycle (A→B & B→A)

import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ROOTS = ["KBAXP3jy", "PtYdHPRs"];

const KNOWN_TYPO_DOMAINS = new Set([
  "gmgmail.com", "gnail.com", "gamil.com", "gmail.con", "gmial.com", "gemail.com",
  "outlok.com", "hotmial.com", "yhaoo.com", "yahooo.com", "yaoo.com",
]);

const PSEUDO_RANDOM_DOMAINS = new Set([
  "bltiwd.com", "bwmyga.com", "ozsaip.com", "lnovic.com", "wnbaldwy.com",
  "yzcalo.com", "gmeenramy.com", "ruutukf.com", "dollicons.com", "atomicmail.io",
]);

// Pull everything in one pass
async function fetchAll() {
  const out = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("id, name, email, email_verified, referral_code, referred_by, created_at, email_sent_at, fluffypony_quarantine, human_referral_code")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

const rows = await fetchAll();
console.log(`Pulled ${rows.length} total rows.\n`);

const byCode = new Map();      // referral_code → row
const childrenOf = new Map();  // referral_code → list of rows referred_by it
for (const r of rows) {
  if (r.referral_code) byCode.set(r.referral_code, r);
  if (r.referred_by) {
    if (!childrenOf.has(r.referred_by)) childrenOf.set(r.referred_by, []);
    childrenOf.get(r.referred_by).push(r);
  }
}

// BFS each root, collect every descendant row (and the chain depth)
function bfs(rootCode) {
  const seenNodes = new Map(); // code → depth
  const seenRows = new Set();
  const queue = [{ code: rootCode, depth: 0 }];
  while (queue.length) {
    const { code, depth } = queue.shift();
    if (seenNodes.has(code)) continue;
    seenNodes.set(code, depth);
    for (const r of childrenOf.get(code) ?? []) {
      seenRows.add(r.id);
      if (r.referral_code) queue.push({ code: r.referral_code, depth: depth + 1 });
    }
  }
  return { seenNodes, seenRows };
}

const ringRows = new Set();
const ringRoots = [];
for (const root of ROOTS) {
  const ownerRow = byCode.get(root);
  if (!ownerRow) { console.log(`Root ${root}: owner row NOT FOUND`); continue; }
  ringRows.add(ownerRow.id);
  const { seenRows } = bfs(root);
  for (const id of seenRows) ringRows.add(id);
  ringRoots.push({ root, ownerRow });
}

// ─── Bot evidence per row ─────────────────────────────────────────────
function trailingDigits(s) { return /[a-zA-Z][0-9]{2,}$/.test(s ?? ""); }
function gmailPlusVariant(local) { return /[+].+/.test(local ?? ""); }

const ringRowsList = rows.filter(r => ringRows.has(r.id));

function evidence(r) {
  const reasons = [];
  const email = (r.email ?? "").toLowerCase();
  const [local, dom] = email.split("@");
  const name = (r.name ?? "").toLowerCase();

  if (local && name && local === name) reasons.push("name===email-local");
  if (local && trailingDigits(local)) reasons.push("digit-suffix-email");
  if (name && trailingDigits(name)) reasons.push("digit-suffix-name");
  if (gmailPlusVariant(local) && dom === "gmail.com") reasons.push("gmail-plus-alias");
  if (dom && KNOWN_TYPO_DOMAINS.has(dom)) reasons.push("typo-domain");
  if (dom && PSEUDO_RANDOM_DOMAINS.has(dom)) reasons.push("pseudo-random-domain");

  // Burst signal — set in a second pass below
  return reasons;
}

// Burst signal: ≥3 signups in the same minute from same referrer
const burstByReferrer = new Map(); // referred_by → Set<minute strings with ≥3>
const burstCounter = new Map();    // `${ref}|${minute}` → count
for (const r of ringRowsList) {
  const ref = r.referred_by;
  const minute = (r.created_at ?? "").slice(0, 16);
  if (!ref || !minute) continue;
  const k = `${ref}|${minute}`;
  burstCounter.set(k, (burstCounter.get(k) ?? 0) + 1);
}
for (const [k, n] of burstCounter) {
  if (n >= 3) {
    const [ref, minute] = k.split("|");
    if (!burstByReferrer.has(ref)) burstByReferrer.set(ref, new Set());
    burstByReferrer.get(ref).add(minute);
  }
}
function inBurst(r) {
  const ref = r.referred_by;
  const minute = (r.created_at ?? "").slice(0, 16);
  if (!ref || !minute) return false;
  return burstByReferrer.get(ref)?.has(minute) === true;
}

// Closed cycles: A.referred_by===B and B.referred_by===A
const cycleSet = new Set();
for (const r of ringRowsList) {
  const me = r.referral_code;
  const parent = r.referred_by;
  if (!me || !parent) continue;
  const parentRow = byCode.get(parent);
  if (parentRow && parentRow.referred_by === me) {
    cycleSet.add(r.id);
    cycleSet.add(parentRow.id);
  }
}

// Per-row final classification
const enriched = ringRowsList.map(r => {
  const reasons = evidence(r);
  if (inBurst(r)) reasons.push("burst-minute");
  if (cycleSet.has(r.id)) reasons.push("closed-cycle");
  return { ...r, reasons };
});

// ─── Output ───────────────────────────────────────────────────────────
console.log(`══════════ PYRAMID PROFILE (roots: ${ROOTS.join(", ")}) ══════════`);
console.log(`Total rows in pyramid: ${enriched.length}`);
const verified = enriched.filter(r => r.email_verified).length;
const unverified = enriched.length - verified;
console.log(`  verified:   ${verified}`);
console.log(`  unverified: ${unverified}\n`);

// Per-referrer breakdown
const refStats = new Map();
for (const r of enriched) {
  if (!r.referred_by) continue;
  const s = refStats.get(r.referred_by) ?? { total: 0, v: 0, u: 0, withEvidence: 0 };
  s.total++;
  if (r.email_verified) s.v++; else s.u++;
  if (r.reasons.length > 0) s.withEvidence++;
  refStats.set(r.referred_by, s);
}
console.log("Per-referrer breakdown (sorted by total recruits):");
const sortedRefs = [...refStats.entries()].sort((a, b) => b[1].total - a[1].total);
for (const [ref, s] of sortedRefs) {
  const owner = byCode.get(ref);
  const fpq = owner?.fluffypony_quarantine === true ? "✓" : " ";
  const ownerLabel = owner ? `${owner.name} <${owner.email}>` : "(owner row not found)";
  console.log(`  [${fpq}] ${ref}  ${String(s.total).padStart(4)} total  | v=${String(s.v).padStart(3)} u=${String(s.u).padStart(3)} | evidence=${String(s.withEvidence).padStart(3)}  ← ${ownerLabel}`);
}

// Evidence distribution
console.log("\nObjective evidence counts (a row can match multiple signals):");
const reasonCounts = new Map();
for (const r of enriched) for (const reason of r.reasons) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
for (const [reason, n] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${reason}`);
}

// Verified rows with strong evidence (would constitute "proof" for the user's rule)
const verifiedWithProof = enriched.filter(r => r.email_verified && r.reasons.length >= 1);
console.log(`\nVerified rows WITH objective evidence: ${verifiedWithProof.length} / ${verified}`);
const byEvidenceCount = new Map();
for (const r of verifiedWithProof) byEvidenceCount.set(r.reasons.length, (byEvidenceCount.get(r.reasons.length) ?? 0) + 1);
for (const [n, c] of [...byEvidenceCount.entries()].sort()) {
  console.log(`  ${c} rows with exactly ${n} signal(s)`);
}

// Sample verified-with-multiple-signals (strongest cases)
const strongest = verifiedWithProof
  .filter(r => r.reasons.length >= 2)
  .sort((a, b) => b.reasons.length - a.reasons.length);
console.log(`\nStrongest verified bot candidates (≥2 signals, top 15):`);
for (const r of strongest.slice(0, 15)) {
  console.log(`  ${r.created_at?.slice(0, 16)}  ${r.email.padEnd(40)}  name=${(r.name ?? "").padEnd(20)}  signals=[${r.reasons.join(", ")}]`);
}

// Closed-cycle rows specifically
if (cycleSet.size > 0) {
  console.log(`\nClosed referral cycles (mutual referrals) — ${cycleSet.size} rows:`);
  for (const id of cycleSet) {
    const r = rows.find(x => x.id === id);
    console.log(`  ${r.referral_code}  ${r.name} <${r.email}>  verified=${r.email_verified}  referred_by=${r.referred_by}`);
  }
}

// Roots themselves — independent profile
console.log(`\n══════════ ROOT NODES ══════════`);
for (const { root, ownerRow } of ringRoots) {
  console.log(`\n${root}: ${ownerRow.name} <${ownerRow.email}>`);
  console.log(`  created ${ownerRow.created_at?.slice(0, 16)}  verified=${ownerRow.email_verified}  fpq=${ownerRow.fluffypony_quarantine}`);
  console.log(`  human_ref=${ownerRow.human_referral_code ?? "(none)"}  referred_by=${ownerRow.referred_by ?? "(direct)"}`);
  const ev = evidence(ownerRow);
  console.log(`  evidence on the root row itself: [${ev.join(", ") || "none"}]`);
}
