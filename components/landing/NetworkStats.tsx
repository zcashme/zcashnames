import type { NetworkStats as Stats } from "@/lib/network-stats";

export default function NetworkStats({ stats }: { stats: Stats }) {
  if (stats.mode === "waitlist") {
    return (
      <div className="flex gap-6 justify-center text-sm text-[var(--home-result-link-fg)]">
        <span>{stats.waitlist.toLocaleString()} signed up</span>
        <span>{stats.referred.toLocaleString()} referred</span>
        <span>{stats.rewardsPot.toFixed(3)} ZEC pot</span>
      </div>
    );
  }

  return (
    <div className="flex gap-6 justify-center text-sm text-[var(--home-result-link-fg)]">
      <span>{stats.claimed.toLocaleString()} claimed</span>
      <span>{stats.forSale.toLocaleString()} for sale</span>
      <span>block {stats.syncedHeight.toLocaleString()}</span>
    </div>
  );
}
