import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

async function readRepoFile(filePath: string): Promise<string> {
  return readFile(path.join(repoRoot, filePath), "utf8");
}

test("protected family referrals have human-code schema support", async () => {
  const migration = await readRepoFile("sql/2026-09-04-protected-family-referrals.sql");

  expect(migration).toContain("human_referral_code text");
  expect(migration).toContain("zn_protected_family_referrals_human_referral_code_unique");
  expect(migration).toContain("lower(human_referral_code)");
  expect(migration).toContain("where human_referral_code is not null");
});

test("protected family human codes are lazily assigned through the shared resolver policy", async () => {
  const source = await readRepoFile("lib/referrals.ts");

  expect(source).not.toContain("Protected-family profiles intentionally use their generated public code only");
  expect(source).toContain('row.owner_kind === "protected_family"');
  expect(source).toContain('.from("zn_protected_family_referrals")');
  expect(source).toContain('.eq("family_root_name", protectedKey)');
  expect(source).toContain('.is("human_referral_code", null)');
  expect(source).toContain("PROTECTED_FAMILY_REFERRAL_SELECT");
});

test("protected referral dashboards render display and canonical codes when they differ", async () => {
  const dashboardPage = await readRepoFile("app/(site)/leaders/ref/[code]/page.tsx");

  expect(dashboardPage).toContain("data.canonicalReferralCode !== data.referralCode");
  expect(dashboardPage).toContain('label="display referral code"');
  expect(dashboardPage).toContain('label="machine-readable referral code"');
});
