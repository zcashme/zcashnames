import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  convertSqlPotentialRewardsToQuote,
  WAITLIST_REFERRAL_STATS_SQL_LEVEL_ONE_ZEC,
} from "../lib/campaigns/referral-reward-convert.ts";
import {
  REFERRAL_LEVEL_ONE_REWARD_USD,
  REFERRAL_LOWEST_PRICING_TIER_USD,
  buildReferralRewardQuote,
  fixedReferralRewardForDepth,
} from "../lib/leaders/referral-rewards.ts";

describe("referral rewards quote", () => {
  it("derives Level I from the lowest USD pricing tier", () => {
    const quote = buildReferralRewardQuote(80);
    assert.equal(REFERRAL_LOWEST_PRICING_TIER_USD, 20);
    assert.equal(REFERRAL_LEVEL_ONE_REWARD_USD, 4);
    assert.equal(quote.levelOneRewardZec, 0.05);
  });

  it("halves by depth from the USD-derived Level I reward", () => {
    const quote = buildReferralRewardQuote(40);
    assert.equal(fixedReferralRewardForDepth(1, quote), 0.1);
    assert.equal(fixedReferralRewardForDepth(2, quote), 0.05);
    assert.equal(fixedReferralRewardForDepth(3, quote), 0.025);
    assert.equal(fixedReferralRewardForDepth(0, quote), 0);
  });

  it("returns zero rewards when the exchange rate is missing", () => {
    const quote = buildReferralRewardQuote(null);
    assert.equal(quote.levelOneRewardZec, null);
    assert.equal(fixedReferralRewardForDepth(1, quote), 0);
  });
});

describe("campaign SQL potential_rewards conversion", () => {
  it("keeps SQL rewards when the live Level I amount still equals 0.05 ZEC", () => {
    const quote = buildReferralRewardQuote(80);
    assert.equal(WAITLIST_REFERRAL_STATS_SQL_LEVEL_ONE_ZEC, 0.05);
    assert.equal(convertSqlPotentialRewardsToQuote(1.25, quote.levelOneRewardZec), 1.25);
  });

  it("rescales SQL 0.05-based rewards onto the live Level I quote", () => {
    const quote = buildReferralRewardQuote(40);
    assert.equal(convertSqlPotentialRewardsToQuote(1.25, quote.levelOneRewardZec), 2.5);
    assert.equal(convertSqlPotentialRewardsToQuote(22.85, quote.levelOneRewardZec), 45.7);
  });

  it("returns null when the live quote is unavailable", () => {
    assert.equal(convertSqlPotentialRewardsToQuote(1.25, null), null);
  });
});
