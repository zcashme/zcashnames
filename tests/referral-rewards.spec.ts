import { test, expect } from "@playwright/test";
import {
  REFERRAL_LEVEL_ONE_REWARD_USD,
  REFERRAL_LOWEST_PRICING_TIER_USD,
  buildReferralNamePriceByBucket,
  buildReferralRewardQuote,
  fixedReferralRewardForDepth,
} from "@/lib/leaders/referral-rewards";
import {
  buildFixedDepthReferralSummaries,
  calculateReferralProjection,
  priceByBucketFromRewardQuote,
  type ReferralDashboardData,
  type WaitlistReferralRow,
} from "@/lib/leaders/referral-dashboard";

function row(
  name: string,
  referralCode: string,
  referredBy: string | null,
  createdAt: string,
): WaitlistReferralRow {
  return {
    name,
    referral_code: referralCode,
    human_referral_code: null,
    preferred_referral_code: referralCode,
    referred_by: referredBy,
    created_at: createdAt,
    email_verified: true,
    name_reserved: false,
    name_reserved_at: null,
    cabal: false,
  };
}

test("Level I referral reward derives from the lowest USD pricing tier", () => {
  const quote = buildReferralRewardQuote(80);

  expect(REFERRAL_LOWEST_PRICING_TIER_USD).toBe(20);
  expect(REFERRAL_LEVEL_ONE_REWARD_USD).toBe(4);
  expect(quote.levelOneRewardZec).toBe(0.05);
});

test("fixed referral rewards halve by depth from the USD-derived Level I reward", () => {
  const quote = buildReferralRewardQuote(40);

  expect(fixedReferralRewardForDepth(1, quote)).toBe(0.1);
  expect(fixedReferralRewardForDepth(2, quote)).toBe(0.05);
  expect(fixedReferralRewardForDepth(3, quote)).toBe(0.025);
  expect(fixedReferralRewardForDepth(0, quote)).toBe(0);
});

test("fixed-depth summaries use the shared USD-derived reward quote", () => {
  const quote = buildReferralRewardQuote(100);
  const summaries = buildFixedDepthReferralSummaries(
    [
      row("root", "ROOT", null, "2026-01-01T00:00:00.000Z"),
      row("direct", "DIRECT", "ROOT", "2026-01-02T00:00:00.000Z"),
      row("indirect", "INDIRECT", "DIRECT", "2026-01-03T00:00:00.000Z"),
    ],
    quote,
  );

  expect(summaries.get("ROOT")?.potentialRewards).toBe(0.06);
  expect(summaries.get("ROOT")?.directReferrals).toBe(1);
  expect(summaries.get("ROOT")?.indirectReferrals).toBe(1);
});

test("commission price defaults derive from the current USD pricing policy", () => {
  const quote = buildReferralRewardQuote(80);
  const prices = buildReferralNamePriceByBucket(quote);

  expect(prices["7+"]).toBe(0.25);
  expect(prices["6"]).toBe(0.5);
  expect(prices["5"]).toBe(0.75);
  expect(prices["4"]).toBe(1.5);
  expect(prices["3"]).toBe(3);
  expect(prices["2"]).toBe(4.25);
  expect(prices["1"]).toBe(6);
});

test("commission projections use the USD-derived price table", () => {
  const quote = buildReferralRewardQuote(100);
  const root = row("root", "ROOT", null, "2026-01-01T00:00:00.000Z");
  const descendant = row("sevenup", "DIRECT", "ROOT", "2026-01-02T00:00:00.000Z");
  const data: ReferralDashboardData = {
    ownerKind: "waitlist",
    protectedFamilyVariants: [],
    root,
    referralCode: "ROOT",
    canonicalReferralCode: "ROOT",
    waitlistPosition: 1,
    waitlistTotal: 2,
    rootBadge: null,
    directReferrals: [{ ...descendant, depth: 1, initiated_referrals: 0 }],
    descendants: [{ ...descendant, depth: 1, initiated_referrals: 0 }],
    depthCounts: [{ depth: 1, count: 1 }],
    totalAttributedReferrals: 1,
    maxDepth: 1,
    referralRewardQuote: quote,
    leaderboardRank: 1,
    nameQueuePosition: 1,
    nameQueueTotal: 2,
    commissionUnlocked: true,
    referralsUnlocked: true,
  };

  const projection = calculateReferralProjection({
    data,
    model: "commission",
    prices: priceByBucketFromRewardQuote(quote),
    conversions: { "1": 100, "2": 100, "3": 100, "4": 100, "5": 100, "6": 100, "7+": 100 },
  });

  expect(projection.rows.find((projectionRow) => projectionRow.bucket === "7+")?.price).toBe(0.2);
  expect(projection.projectedRevenue).toBe(0.2);
  expect(projection.projectedPayout).toBe(0.03);
});
