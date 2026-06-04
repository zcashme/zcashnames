// Canonicalize Gmail addresses (lowercase, strip dots, drop +tag) and count
// how many "distinct" emails collapse to the same real inbox.
//
// Gmail rules: dots in the local part are ignored; everything after + is ignored.
// foo.bar+anything@gmail.com == foobar@gmail.com (same inbox).
// (Same holds for googlemail.com.)

import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function canonicalizeGmail(email) {
  email = email.toLowerCase().trim();
  const at = email.indexOf("@");
  if (at < 0) return email;
  let local = email.slice(0, at);
  const dom = email.slice(at + 1);
  if (dom !== "gmail.com" && dom !== "googlemail.com") return email;
  // Drop everything after + and strip dots.
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  local = local.replace(/\./g, "");
  return `${local}@gmail.com`;
}

async function fetchAll() {
  const out = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("id, name, email, email_verified, referred_by, created_at")
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

// Group by canonical Gmail
const groups = new Map();
for (const r of rows) {
  if (!r.email) continue;
  const dom = r.email.toLowerCase().split("@")[1];
  if (dom !== "gmail.com" && dom !== "googlemail.com") continue;
  const canon = canonicalizeGmail(r.email);
  if (!groups.has(canon)) groups.set(canon, []);
  groups.get(canon).push(r);
}

const multiInbox = [...groups.entries()].filter(([, list]) => list.length >= 2).sort((a, b) => b[1].length - a[1].length);

console.log(`Gmail-domain rows: ${[...groups.values()].reduce((a, b) => a + b.length, 0)}`);
console.log(`Canonical inboxes: ${groups.size}`);
console.log(`Inboxes used by ≥2 'different' emails: ${multiInbox.length}`);

let totalSelfDupes = 0;
for (const [, list] of multiInbox) totalSelfDupes += list.length - 1;
console.log(`Excess rows (canonical-inbox collisions beyond 1 per inbox): ${totalSelfDupes}`);

console.log("\nTop 25 Gmail inboxes with the most signups:");
for (const [canon, list] of multiInbox.slice(0, 25)) {
  const v = list.filter((r) => r.email_verified).length;
  const refs = new Set(list.map((r) => r.referred_by).filter(Boolean));
  console.log(`  ${String(list.length).padStart(3)}  ${canon.padEnd(38)}  verified=${v}  via ${refs.size} referrer(s)`);
  // Show the first three variant emails so you can see the trick
  for (const r of list.slice(0, 3)) {
    console.log(`        - ${r.email}  name=${r.name}  ref=${r.referred_by}  ${r.email_verified ? "✓" : " "}`);
  }
  if (list.length > 3) console.log(`        … and ${list.length - 3} more`);
}

// Show how many of the "208 all-4-signal" pyramid rows are in fact dot-aliases
const PYRAMID_ROOTS = ["KBAXP3jy", "PtYdHPRs"];
// Recompute the pyramid set
const byCode = new Map();
const childrenOf = new Map();
for (const r of rows) {
  if (r.referral_code) byCode.set(r.referral_code, r);
  if (r.referred_by) {
    if (!childrenOf.has(r.referred_by)) childrenOf.set(r.referred_by, []);
    childrenOf.get(r.referred_by).push(r);
  }
}
function bfs(rootCode) {
  const seenNodes = new Set();
  const seenRows = new Set();
  const q = [rootCode];
  const rootRow = byCode.get(rootCode);
  if (rootRow) seenRows.add(rootRow.id);
  while (q.length) {
    const c = q.shift();
    if (seenNodes.has(c)) continue;
    seenNodes.add(c);
    for (const r of childrenOf.get(c) ?? []) {
      seenRows.add(r.id);
      if (r.referral_code) q.push(r.referral_code);
    }
  }
  return seenRows;
}
const pyramidIds = new Set();
for (const root of PYRAMID_ROOTS) for (const id of bfs(root)) pyramidIds.add(id);

const pyramidGroups = new Map();
for (const r of rows) {
  if (!pyramidIds.has(r.id)) continue;
  const dom = (r.email ?? "").toLowerCase().split("@")[1];
  if (dom !== "gmail.com" && dom !== "googlemail.com") continue;
  const canon = canonicalizeGmail(r.email);
  if (!pyramidGroups.has(canon)) pyramidGroups.set(canon, []);
  pyramidGroups.get(canon).push(r);
}
const pyramidMulti = [...pyramidGroups.entries()].filter(([, list]) => list.length >= 2);
const pyramidDupesExcess = pyramidMulti.reduce((s, [, l]) => s + l.length - 1, 0);
console.log(`\nIn the pyramid: ${pyramidGroups.size} canonical Gmail inboxes, ${pyramidMulti.length} of them used multiple times, ${pyramidDupesExcess} 'excess' rows.`);
