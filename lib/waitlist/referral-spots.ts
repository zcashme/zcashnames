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

export type WaitlistNameRankFields = {
  id: string;
  basePosition: number;
  directReferrals: number;
  indirectReferrals: number;
};

/** Per-name Early Access rank among reserved peers: adjusted line, then original waitlist line, then id. */
export function compareWaitlistNameRank(
  a: WaitlistNameRankFields,
  b: WaitlistNameRankFields,
): number {
  const aAdjusted = a.basePosition - waitlistReferralAdjustment(a.directReferrals, a.indirectReferrals);
  const bAdjusted = b.basePosition - waitlistReferralAdjustment(b.directReferrals, b.indirectReferrals);
  if (aAdjusted !== bAdjusted) return aAdjusted - bAdjusted;
  if (a.basePosition !== b.basePosition) return a.basePosition - b.basePosition;
  return a.id.localeCompare(b.id);
}

export type WaitlistNameRankResult = {
  position: number;
  total: number;
};

/**
 * Rank only completed reservations for a name. `total` is everyone interested;
 * unreserved peers stay at position 0 so the UI can show N/A of `total`.
 */
export function assignWaitlistNameRanks(
  peers: Array<WaitlistNameRankFields & { reserved: boolean }>,
): Map<string, WaitlistNameRankResult> {
  const total = peers.length;
  const ranks = new Map<string, WaitlistNameRankResult>();

  for (const peer of peers) {
    ranks.set(peer.id, { position: 0, total });
  }

  [...peers]
    .filter((peer) => peer.reserved)
    .sort(compareWaitlistNameRank)
    .forEach((peer, index) => {
      ranks.set(peer.id, { position: index + 1, total });
    });

  return ranks;
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
