/** Shared waitlist referral-jump thresholds. Client-safe so FAQ, terms, and waitlist UI stay aligned. */

export const WAITLIST_VIEW_REFERRALS_PER_SPOT = 1;
export const WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT = 3;

export function waitlistReferralAdjustment(
  directReferrals: number,
  indirectReferrals: number,
): number {
  return (
    Math.floor(directReferrals / WAITLIST_VIEW_REFERRALS_PER_SPOT)
    + Math.floor(indirectReferrals / WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT)
  );
}

export function reservedReferralSpotPhrase(
  kind: "direct" | "indirect",
  count: number = kind === "direct"
    ? WAITLIST_VIEW_REFERRALS_PER_SPOT
    : WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT,
): string {
  if (count === 1) return `each ${kind} reserved referral`;
  return `every ${count} ${kind} reserved referrals`;
}

export const RESERVED_DIRECT_REFERRAL_SPOT_PHRASE = reservedReferralSpotPhrase("direct");
export const RESERVED_INDIRECT_REFERRAL_SPOT_PHRASE = reservedReferralSpotPhrase("indirect");
