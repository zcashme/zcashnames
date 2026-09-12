export const REFERRAL_LOWEST_PRICING_TIER_USD = 20;
export const REFERRAL_REWARD_PRICE_DIVISOR = 5;
export const REFERRAL_LEVEL_ONE_REWARD_USD =
  REFERRAL_LOWEST_PRICING_TIER_USD / REFERRAL_REWARD_PRICE_DIVISOR;

export const REFERRAL_NAME_PRICE_MULTIPLIER_BY_BUCKET = {
  "1": 24,
  "2": 17,
  "3": 12,
  "4": 6,
  "5": 3,
  "6": 2,
  "7+": 1,
} as const;

export type ReferralNameLengthBucket = keyof typeof REFERRAL_NAME_PRICE_MULTIPLIER_BY_BUCKET;
export type ReferralNamePriceByBucket = Record<ReferralNameLengthBucket, number>;

export interface ReferralRewardQuote {
  lowestPricingTierUsd: number;
  levelOneRewardUsd: number;
  usdPerZec: number | null;
  levelOneRewardZec: number | null;
}

export function roundZecReward(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function buildReferralRewardQuote(usdPerZec: number | null): ReferralRewardQuote {
  const rate = Number.isFinite(usdPerZec) && usdPerZec != null && usdPerZec > 0 ? usdPerZec : null;

  return {
    lowestPricingTierUsd: REFERRAL_LOWEST_PRICING_TIER_USD,
    levelOneRewardUsd: REFERRAL_LEVEL_ONE_REWARD_USD,
    usdPerZec: rate,
    levelOneRewardZec: rate == null ? null : REFERRAL_LEVEL_ONE_REWARD_USD / rate,
  };
}

export const REFERRAL_REWARD_UNAVAILABLE_QUOTE = buildReferralRewardQuote(null);

export function referralNamePriceUsdForBucket(bucket: ReferralNameLengthBucket): number {
  return REFERRAL_LOWEST_PRICING_TIER_USD * REFERRAL_NAME_PRICE_MULTIPLIER_BY_BUCKET[bucket];
}

export function buildReferralNamePriceByBucket(quote: ReferralRewardQuote): ReferralNamePriceByBucket {
  return Object.fromEntries(
    Object.keys(REFERRAL_NAME_PRICE_MULTIPLIER_BY_BUCKET).map((bucket) => [
      bucket,
      quote.usdPerZec == null ? 0 : referralNamePriceUsdForBucket(bucket as ReferralNameLengthBucket) / quote.usdPerZec,
    ]),
  ) as ReferralNamePriceByBucket;
}

export function fixedReferralRewardForDepth(
  depth: number,
  quote: ReferralRewardQuote,
): number {
  if (depth <= 0 || quote.levelOneRewardZec == null) return 0;
  return quote.levelOneRewardZec / 2 ** (depth - 1);
}

export function formatReferralRewardBasis(quote: ReferralRewardQuote): string {
  const zec = quote.levelOneRewardZec == null ? "current-rate" : `${roundZecReward(quote.levelOneRewardZec)} ZEC`;
  return `${zec} Level I estimate from $${quote.levelOneRewardUsd} USD`;
}
