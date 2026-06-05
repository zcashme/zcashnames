import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const KNOWN_DISPOSABLE = new Set([
  "mailinator.com", "mailinator.net", "mailinator.org", "binkmail.com",
  "guerrillamail.com", "sharklasers.com", "grr.la", "guerrillamail.de",
  "guerrillamail.biz", "guerrillamail.net", "guerrillamail.info", "guerrillamailblock.com",
  "tempmail.com", "tempmail.net", "temp-mail.org", "temp-mail.io",
  "10minutemail.com", "10minutemail.net",
  "throwaway.email", "throwawaymail.com", "throwaway.com",
  "yopmail.com", "yopmail.fr", "yopmail.net",
  "maildrop.cc", "trashmail.com", "trashmail.net", "trashmail.io",
  "mailcatch.com", "mailcatch.net",
  "discard.email", "discardmail.com", "discardmail.de",
  "getairmail.com", "dispostable.com", "fakeinbox.com",
  "spamgourmet.com", "mytrashmail.com", "spambox.us",
  "anonbox.net", "anonymbox.com", "tmail.com", "tmail.io",
  "mvrht.com", "tafmail.com", "spam4.me", "spambog.com",
  "mohmal.com", "emailondeck.com", "burnermail.io",
  "mintemail.com", "incognitomail.com",
  "byom.de", "dropmail.me", "minuteinbox.com",
  "mailnesia.com", "spamavert.com",
  "tmpmail.org", "tmpmail.net", "tmpeml.com",
  "mail-temp.com", "mailtemp.info",
  "moakt.com", "moakt.cc", "moakt.ws",
  "harakirimail.com", "lol.dance", "vomoto.com",
  "trashemail.de", "mt2014.com", "easytrashmail.com",
  "tempinbox.com", "tempmailaddress.com",
  "20mail.it", "20mail.in", "1secmail.com", "1secmail.net", "1secmail.org",
  "linshiyou.com", "anonaddy.me", "duck.com",
]);

const KNOWN_FORWARDERS = new Set([
  "duck.com", "icloud.com", // not disposable, but commonly used for hide-my-email
  "anonaddy.me", "anonaddy.com", "simplelogin.com", "simplelogin.co", "slmail.me",
  "fastmail.com", "fastmail.fm",
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
  "tutanota.com", "tutamail.com", "tuta.io",
]);

function gibberishScore(s) {
  // Cheap heuristic: high consonant runs + low vowel ratio + unusual char mix.
  const lower = s.toLowerCase();
  if (lower.length < 4) return 0;
  const vowels = (lower.match(/[aeiouy]/g) ?? []).length;
  const consonants = (lower.match(/[bcdfghjklmnpqrstvwxz]/g) ?? []).length;
  const digits = (lower.match(/\d/g) ?? []).length;
  const vowelRatio = vowels / Math.max(1, lower.length);
  // Find longest consonant run.
  let maxConsRun = 0, run = 0;
  for (const c of lower) {
    if (/[bcdfghjklmnpqrstvwxz]/.test(c)) { run++; if (run > maxConsRun) maxConsRun = run; }
    else run = 0;
  }
  let score = 0;
  if (vowelRatio < 0.18) score += 2;
  else if (vowelRatio < 0.25) score += 1;
  if (maxConsRun >= 5) score += 2;
  else if (maxConsRun >= 4) score += 1;
  if (digits >= Math.max(2, lower.length * 0.4)) score += 1;
  return score;
}

function fmt(n) { return n.toLocaleString(); }

function topN(map, n, label) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `  ${String(v).padStart(6)}  ${k}`)
    .join("\n");
}

async function fetchAll() {
  // Supabase caps at 1000 by default — page through to get them all.
  const PAGE = 1000;
  let from = 0;
  const out = [];
  while (true) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("id, name, email, email_verified, referral_code, referred_by, email_sent_at, created_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

const rows = await fetchAll();
console.log(`\n=== Pulled ${fmt(rows.length)} rows ===\n`);

// ─── Overview ─────────────────────────────────────────────────────────
const verified = rows.filter(r => r.email_verified).length;
const sent = rows.filter(r => r.email_sent_at).length;
const sentNotVerified = rows.filter(r => r.email_sent_at && !r.email_verified).length;
const neverSent = rows.filter(r => !r.email_sent_at).length;

console.log("OVERVIEW");
console.log(`  total              ${fmt(rows.length)}`);
console.log(`  email_verified     ${fmt(verified)}  (${(100*verified/rows.length).toFixed(1)}%)`);
console.log(`  email sent         ${fmt(sent)}`);
console.log(`  sent + unverified  ${fmt(sentNotVerified)}  ← likely bot / typo / disinterest`);
console.log(`  never sent         ${fmt(neverSent)}  ← upstream failure or test data`);

// ─── Email domain distribution ────────────────────────────────────────
const domains = new Map();
const localParts = new Map();
for (const r of rows) {
  const email = (r.email || "").toLowerCase();
  const [local, dom] = email.split("@");
  if (dom) domains.set(dom, (domains.get(dom) ?? 0) + 1);
  if (local) localParts.set(local, (localParts.get(local) ?? 0) + 1);
}
console.log("\nTOP 20 DOMAINS");
console.log(topN(domains, 20));

// ─── Disposable / forwarder ────────────────────────────────────────────
const disposable = rows.filter(r => {
  const dom = (r.email || "").toLowerCase().split("@")[1];
  return dom && KNOWN_DISPOSABLE.has(dom);
});
const forwarders = rows.filter(r => {
  const dom = (r.email || "").toLowerCase().split("@")[1];
  return dom && KNOWN_FORWARDERS.has(dom);
});
console.log(`\nDISPOSABLE (${disposable.length})`);
if (disposable.length) {
  const byDomDisp = new Map();
  for (const r of disposable) {
    const d = r.email.toLowerCase().split("@")[1];
    byDomDisp.set(d, (byDomDisp.get(d) ?? 0) + 1);
  }
  console.log(topN(byDomDisp, 20));
}
console.log(`\nPRIVACY FORWARDERS / HIDE-MY-EMAIL (${forwarders.length})  — not necessarily bots, but worth flagging`);
if (forwarders.length) {
  const byDomFwd = new Map();
  for (const r of forwarders) {
    const d = r.email.toLowerCase().split("@")[1];
    byDomFwd.set(d, (byDomFwd.get(d) ?? 0) + 1);
  }
  console.log(topN(byDomFwd, 20));
}

// ─── Domains with only unverified signups ──────────────────────────────
const domainStats = new Map();
for (const r of rows) {
  const dom = (r.email || "").toLowerCase().split("@")[1];
  if (!dom) continue;
  const s = domainStats.get(dom) ?? { total: 0, verified: 0 };
  s.total++;
  if (r.email_verified) s.verified++;
  domainStats.set(dom, s);
}
const suspiciousDomains = [...domainStats.entries()]
  .filter(([, s]) => s.total >= 5 && s.verified === 0)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 25);
console.log(`\nDOMAINS WITH ≥5 SIGNUPS AND ZERO VERIFICATIONS (top 25)  — bot signature`);
for (const [d, s] of suspiciousDomains) {
  console.log(`  ${String(s.total).padStart(5)}  ${d}`);
}

// ─── Repeated local-parts across domains ───────────────────────────────
const localToDomains = new Map();
for (const r of rows) {
  const [local, dom] = (r.email || "").toLowerCase().split("@");
  if (!local || !dom) continue;
  if (!localToDomains.has(local)) localToDomains.set(local, new Set());
  localToDomains.get(local).add(dom);
}
const localsAcrossDomains = [...localToDomains.entries()]
  .filter(([, ds]) => ds.size >= 3)
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 15);
console.log("\nSAME LOCAL-PART USED ACROSS ≥3 DIFFERENT DOMAINS (top 15)  — referral-farming signature");
for (const [local, ds] of localsAcrossDomains) {
  console.log(`  ${String(ds.size).padStart(3)}  ${local}@*  →  ${[...ds].slice(0, 6).join(", ")}${ds.size > 6 ? ", …" : ""}`);
}

// ─── Sequential / numbered emails ──────────────────────────────────────
const numberedLocals = new Map();
for (const r of rows) {
  const local = (r.email || "").toLowerCase().split("@")[0];
  if (!local) continue;
  const stripped = local.replace(/[0-9]+$/, "");
  if (stripped !== local && stripped.length >= 3) {
    const dom = (r.email || "").toLowerCase().split("@")[1];
    const key = `${stripped}@${dom}`;
    numberedLocals.set(key, (numberedLocals.get(key) ?? 0) + 1);
  }
}
const sequentialPatterns = [...numberedLocals.entries()]
  .filter(([, n]) => n >= 3)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
console.log("\nSEQUENTIAL EMAILS LIKE foo1@x, foo2@x, foo3@x (top 15)  — strong bot signature");
for (const [pat, n] of sequentialPatterns) {
  console.log(`  ${String(n).padStart(4)}  ${pat}`);
}

// ─── Name frequency ───────────────────────────────────────────────────
const names = new Map();
for (const r of rows) {
  const n = (r.name || "").toLowerCase();
  if (n) names.set(n, (names.get(n) ?? 0) + 1);
}
const repeatedNames = [...names.entries()]
  .filter(([, n]) => n >= 5)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
console.log("\nMOST REPEATED NAMES (≥5 occurrences, top 20)");
for (const [name, n] of repeatedNames) {
  console.log(`  ${String(n).padStart(4)}  ${name}`);
}

// ─── Gibberish names ──────────────────────────────────────────────────
const gibberishNames = rows
  .map(r => ({ ...r, score: gibberishScore(r.name ?? "") }))
  .filter(r => r.score >= 3 && !r.email_verified);
console.log(`\nGIBBERISH NAMES (score ≥3) AND UNVERIFIED  — ${gibberishNames.length} candidates`);
const sampleGib = gibberishNames.slice(0, 15);
for (const r of sampleGib) {
  console.log(`  score=${r.score}  name=${r.name.padEnd(12)}  email=${r.email}`);
}

// ─── Time clustering — bursts of signups in a minute ───────────────────
const byMinute = new Map();
for (const r of rows) {
  if (!r.created_at) continue;
  const minute = r.created_at.slice(0, 16); // YYYY-MM-DDTHH:MM
  byMinute.set(minute, (byMinute.get(minute) ?? 0) + 1);
}
const burstMinutes = [...byMinute.entries()]
  .filter(([, n]) => n >= 20)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
console.log(`\nMINUTES WITH ≥20 SIGNUPS (top 15) — sudden bursts often = bot wave`);
for (const [m, n] of burstMinutes) {
  console.log(`  ${String(n).padStart(4)} signups in  ${m}`);
}

// ─── Top referrers ────────────────────────────────────────────────────
const refererCounts = new Map();
for (const r of rows) {
  if (r.referred_by) refererCounts.set(r.referred_by, (refererCounts.get(r.referred_by) ?? 0) + 1);
}
const topReferrers = [...refererCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log("\nTOP 15 REFERRERS (referral codes that brought the most signups)");
for (const [code, n] of topReferrers) {
  // Lookup the verified-vs-not ratio for that referrer's recruits
  const recruits = rows.filter(r => r.referred_by === code);
  const v = recruits.filter(r => r.email_verified).length;
  console.log(`  ${String(n).padStart(5)} signups via ${code}  (${v} verified, ${n - v} unverified)`);
}

console.log("\nDone.");
