"use client";

import { useEffect, useState } from "react";
import { getEvents, getHomeStats } from "@/lib/zns/resolve";
import type { Network } from "@/lib/zns/name";
import type { ZnsEvent } from "@/lib/zns/client";
import ActionBadge from "@/components/ActionBadge";

function Skeleton({ w = "w-12" }: { w?: string }) {
  return <span className={`inline-block h-[0.85em] ${w} animate-pulse rounded-md bg-fg-dim/20 align-middle`} />;
}

export default function ExplorerActivity({
  network,
  onNameClick,
}: {
  network: Network;
  onNameClick: (name: string) => void;
}) {
  const [tab, setTab] = useState<"activity" | "forsale">("activity");
  const [events, setEvents] = useState<ZnsEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [forSaleCount, setForSaleCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsOffset(0);
    getEvents({ limit: 20 }, network).then((r) => {
      if (cancelled) return;
      setEvents(r.events);
      setEventsTotal(r.total);
      setEventsLoading(false);
    });
    getHomeStats(network).then((s) => {
      if (!cancelled) setForSaleCount(s.forSale);
    });
    return () => { cancelled = true; };
  }, [network]);

  async function loadMoreEvents() {
    const newOffset = eventsOffset + 20;
    const r = await getEvents({ limit: 20, offset: newOffset }, network);
    setEvents((prev) => [...prev, ...r.events]);
    setEventsOffset(newOffset);
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          className="font-semibold"
          style={{ fontSize: "var(--type-section-subtitle)", color: "var(--fg-heading)" }}
        >
          Activity
        </h2>
        <div
          className="inline-flex items-center rounded-full border p-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
          style={{ borderColor: "var(--leaders-card-border)" }}
        >
          {(["activity", "forsale"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="cursor-pointer rounded-full px-3 py-1 transition-colors"
              style={
                tab === t
                  ? { background: "var(--leaders-rank-gold)", color: "var(--leaders-rank-text)" }
                  : { color: "var(--fg-muted)" }
              }
            >
              {t === "activity" ? "Events" : "For Sale"}
            </button>
          ))}
        </div>
      </div>

      {tab === "activity" && (
        <div className="flex flex-col gap-2">
          {eventsLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm border"
                  style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
                >
                  <Skeleton w="w-16" />
                  <Skeleton w="w-24" />
                  <span className="ml-auto"><Skeleton w="w-14" /></span>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-fg-muted">No events yet.</p>
          ) : (
            <>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm border"
                  style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
                >
                  <ActionBadge action={ev.action} />
                  <button
                    type="button"
                    onClick={() => onNameClick(ev.name)}
                    className="font-semibold text-fg-heading hover:underline cursor-pointer"
                  >
                    {ev.name || "(admin)"}
                  </button>
                  {ev.ua && (
                    <span className="hidden sm:inline font-mono text-fg-dim text-xs truncate max-w-[14rem]">
                      {ev.ua}
                    </span>
                  )}
                  <span className="ml-auto text-fg-dim text-xs tabular-nums">{ev.height.toLocaleString()}</span>
                </div>
              ))}
              {events.length < eventsTotal && (
                <button
                  type="button"
                  onClick={loadMoreEvents}
                  className="mx-auto mt-2 cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                >
                  Load More
                </button>
              )}
            </>
          )}
        </div>
      )}

      {tab === "forsale" && (
        <p className="text-sm text-fg-muted">
          {forSaleCount !== null && forSaleCount > 0
            ? `${forSaleCount} name${forSaleCount === 1 ? "" : "s"} listed.`
            : "No names listed for sale."}
        </p>
      )}
    </section>
  );
}
