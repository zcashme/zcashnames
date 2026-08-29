import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const MAX_HUMAN_REFERRAL_CODE_LENGTH = 62;
const MAX_HUMAN_REFERRAL_CODE_ATTEMPTS = 100;
const PAGE_SIZE = 1000;

function parseArgs(argv) {
  return {
    write: argv.includes("--write"),
    dryRun: !argv.includes("--write"),
  };
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadEnv() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, "..");
  loadEnvFile(path.join(rootDir, ".env.local"));
  loadEnvFile(path.join(rootDir, ".env"));
}

function normalizeHumanReferralCode(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HUMAN_REFERRAL_CODE_LENGTH);

  return normalized.replace(/-+$/g, "");
}

function buildHumanReferralCodeCandidate(base, suffix) {
  const normalizedBase = normalizeHumanReferralCode(base);
  if (!normalizedBase) return "";
  if (suffix <= 0) return normalizedBase;

  const suffixText = `-${suffix + 1}`;
  const maxBaseLength = MAX_HUMAN_REFERRAL_CODE_LENGTH - suffixText.length;
  if (maxBaseLength <= 0) return suffixText.slice(1, MAX_HUMAN_REFERRAL_CODE_LENGTH + 1);

  return `${normalizedBase.slice(0, maxBaseLength)}${suffixText}`;
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function fetchAllRows(db) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("id, name, referral_code, human_referral_code, email_verified, created_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function verifyState(db) {
  const rows = await fetchAllRows(db);
  const verifiedNull = rows.filter((row) => row.email_verified && !row.human_referral_code).length;

  const aliasCounts = new Map();
  for (const row of rows) {
    if (!row.human_referral_code) continue;
    aliasCounts.set(row.human_referral_code, (aliasCounts.get(row.human_referral_code) ?? 0) + 1);
  }

  const duplicateAliases = [...aliasCounts.entries()].filter(([, count]) => count > 1);

  return {
    totalRows: rows.length,
    verifiedNull,
    duplicateAliases,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const allRows = await fetchAllRows(db);
  const targetRows = allRows.filter((row) => row.email_verified && !row.human_referral_code);

  const existingHumanCodes = new Set(
    allRows
      .map((row) => row.human_referral_code)
      .filter((value) => typeof value === "string" && value.trim().length > 0),
  );
  const existingCanonicalCodes = new Set(
    allRows
      .map((row) => String(row.referral_code ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  const stats = {
    scanned: targetRows.length,
    updated: 0,
    skippedExisting: 0,
    skippedInvalidBase: 0,
    collisionWithHuman: 0,
    collisionWithCanonical: 0,
    collisionRetries: 0,
    failed: 0,
  };
  const failures = [];
  const sampleMappings = [];

  console.log(
    `${args.dryRun ? "Dry run" : "Write run"}: processing ${targetRows.length} verified rows with null human_referral_code`,
  );

  for (const row of targetRows) {
    const baseSource = row.name ?? row.referral_code ?? "";
    const baseCandidate = normalizeHumanReferralCode(baseSource);

    if (!baseCandidate) {
      stats.skippedInvalidBase += 1;
      failures.push({ id: row.id, reason: "empty-normalized-base", name: row.name, referral_code: row.referral_code });
      continue;
    }

    let assigned = false;

    for (let suffix = 0; suffix < MAX_HUMAN_REFERRAL_CODE_ATTEMPTS; suffix += 1) {
      const candidate = buildHumanReferralCodeCandidate(baseSource, suffix);
      if (!candidate) continue;

      if (existingHumanCodes.has(candidate)) {
        stats.collisionWithHuman += 1;
        continue;
      }

      if (existingCanonicalCodes.has(candidate.toLowerCase())) {
        stats.collisionWithCanonical += 1;
        continue;
      }

      if (args.dryRun) {
        existingHumanCodes.add(candidate);
        stats.updated += 1;
        assigned = true;
        if (sampleMappings.length < 20) {
          sampleMappings.push({
            id: row.id,
            name: row.name,
            referral_code: row.referral_code,
            human_referral_code: candidate,
          });
        }
        break;
      }

      const { data: updated, error } = await db
        .from("zn_waitlist")
        .update({ human_referral_code: candidate })
        .eq("id", row.id)
        .is("human_referral_code", null)
        .select("human_referral_code")
        .maybeSingle();

      if (error && isUniqueViolation(error)) {
        stats.collisionRetries += 1;
        continue;
      }

      if (error) {
        throw error;
      }

      if (updated?.human_referral_code) {
        existingHumanCodes.add(String(updated.human_referral_code));
        stats.updated += 1;
        assigned = true;
        if (sampleMappings.length < 20) {
          sampleMappings.push({
            id: row.id,
            name: row.name,
            referral_code: row.referral_code,
            human_referral_code: String(updated.human_referral_code),
          });
        }
        break;
      }

      const { data: refreshed, error: refreshError } = await db
        .from("zn_waitlist")
        .select("human_referral_code")
        .eq("id", row.id)
        .limit(1)
        .maybeSingle();

      if (refreshError) {
        throw refreshError;
      }

      if (refreshed?.human_referral_code) {
        existingHumanCodes.add(String(refreshed.human_referral_code));
        stats.skippedExisting += 1;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      stats.failed += 1;
      failures.push({
        id: row.id,
        reason: "exhausted-candidates",
        name: row.name,
        referral_code: row.referral_code,
      });
    }
  }

  console.log(JSON.stringify(stats, null, 2));

  if (sampleMappings.length > 0) {
    console.log("\nSample mappings:");
    console.log(JSON.stringify(sampleMappings, null, 2));
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    console.log(JSON.stringify(failures.slice(0, 20), null, 2));
  }

  if (!args.dryRun) {
    const verification = await verifyState(db);
    console.log("\nPost-run verification:");
    console.log(
      JSON.stringify(
        {
          totalRows: verification.totalRows,
          verifiedNullHumanReferralCodes: verification.verifiedNull,
          duplicateHumanReferralAliases: verification.duplicateAliases.length,
          sampleDuplicateHumanReferralAliases: verification.duplicateAliases.slice(0, 20),
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
