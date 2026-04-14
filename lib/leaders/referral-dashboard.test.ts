import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReferralDashboard,
  calculateReferralProjection,
  commissionRateForAttributedReferrals,
  DEFAULT_CONVERSION_BY_BUCKET,
  DEFAULT_PRICE_BY_BUCKET,
  fixedRewardForDepth,
  getNameLengthBucket,
  type WaitlistReferralRow,
} from "./referral-dashboard.ts";

let rowIndex = 0;

const rows: WaitlistReferralRow[] = [
  row("Root", "root", null, true),
  row("Alpha", "alpha", "root", true),
  row("Beta", "beta", "root", false),
  row("Gamma", "gamma", "alpha", true),
  row("Delta", "delta", "gamma", true),
  row("Orphan", "orphan", "missing", true),
  row("Cycle", "cycle", "loop", true),
  row("Loop", "loop", "cycle", true),
];

test("buildReferralDashboard builds descendant depth and direct initiated counts", () => {
  const dashboard = buildReferralDashboard("root", rows);

  assert.equal(dashboard.root?.name, "Root");
  assert.equal(dashboard.waitlistPosition, 1);
  assert.equal(dashboard.rootBadge, null);
  assert.equal(dashboard.totalAttributedReferrals, 4);
  assert.deepEqual(dashboard.depthCounts, [
    { depth: 1, count: 2 },
    { depth: 2, count: 1 },
    { depth: 3, count: 1 },
  ]);
  assert.deepEqual(
    dashboard.directReferrals.map((entry) => [entry.referral_code, entry.initiated_referrals]),
    [
      ["alpha", 1],
      ["beta", 0],
    ],
  );
});

test("buildReferralDashboard filters unconfirmed descendants in confirmed scope", () => {
  const dashboard = buildReferralDashboard("root", rows, "confirmed");

  assert.equal(dashboard.totalAttributedReferrals, 3);
  assert.deepEqual(
    dashboard.descendants.map((entry) => entry.referral_code),
    ["alpha", "gamma", "delta"],
  );
});

test("buildReferralDashboard protects against cycles", () => {
  const dashboard = buildReferralDashboard("cycle", rows);

  assert.deepEqual(
    dashboard.descendants.map((entry) => entry.referral_code),
    ["loop"],
  );
});

test("projection helpers calculate depth rewards, commission thresholds, and length buckets", () => {
  assert.equal(fixedRewardForDepth(1), 0.05);
  assert.equal(fixedRewardForDepth(2), 0.025);
  assert.equal(fixedRewardForDepth(3), 0.0125);
  assert.equal(commissionRateForAttributedReferrals(1499), 0.18);
  assert.equal(commissionRateForAttributedReferrals(1500), 0.2);
  assert.equal(getNameLengthBucket("abcdefg"), "7+");

  const dashboard = buildReferralDashboard("root", rows);
  const fixed = calculateReferralProjection({
    data: dashboard,
    model: "fixed",
    prices: DEFAULT_PRICE_BY_BUCKET,
    conversions: DEFAULT_CONVERSION_BY_BUCKET,
  });
  const commission = calculateReferralProjection({
    data: dashboard,
    model: "commission",
    prices: DEFAULT_PRICE_BY_BUCKET,
    conversions: DEFAULT_CONVERSION_BY_BUCKET,
  });

  assert.equal(fixed.projectedConversions, 4);
  assert.equal(Number(fixed.projectedPayout.toFixed(5)), 0.1375);
  assert.equal(commission.commissionRate, 0.15);
  assert.ok(commission.projectedPayout > fixed.projectedPayout);
});

function row(
  name: string,
  referral_code: string,
  referred_by: string | null,
  email_verified: boolean,
): WaitlistReferralRow {
  return {
    name,
    referral_code,
    referred_by,
    email_verified,
    cabal: false,
    created_at: `2026-04-${String((rowIndex += 1)).padStart(2, "0")}T00:00:00.000Z`,
  };
}
