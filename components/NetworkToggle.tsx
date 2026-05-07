"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentBetaStage, switchToNetwork } from "@/lib/beta/actions";
import { getWaitlistStats } from "@/lib/leaders/leaders";
import { getHomeStats } from "@/lib/zns/resolve";
import { NetworkContext, useNetwork } from "@/components/hooks/useNetwork";
import type { NetworkData } from "@/components/hooks/useNetwork";
import type { Network } from "@/lib/zns/client";

const TABS: { key: Network | null; label: string }[] = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
  { key: null, label: "Waitlist" },
];

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<Network | null>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageHydrated, setStageHydrated] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  function setNetwork(n: Network | null) {
    setNetworkState(n);
  }

  function refresh() {
    setRefreshCounter((c) => c + 1);
  }

  useEffect(() => {
    let cancelled = false;

    getCurrentBetaStage()
      .then((stage) => {
        if (cancelled || !stage) return;
        setNetworkState(stage);
      })
      .catch(() => {
        // Fall back to waitlist when the stage cookie cannot be read.
      })
      .finally(() => {
        if (!cancelled) setStageHydrated(true);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!stageHydrated) return;

    let cancelled = false;
    setData(null);
    setLoading(true);

    (async () => {
      try {
        if (network) {
          const stats = await getHomeStats(network);
          if (!cancelled) setData({ network, stats });
        } else {
          const stats = await getWaitlistStats();
          if (!cancelled) setData({ network: null, stats });
        }
      } catch {
        // keep data as null on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [network, refreshCounter, stageHydrated]);

  return (
    <NetworkContext.Provider
      value={{ network, setNetwork, data, loading, refresh }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export default function NetworkToggle() {
  const pathname = usePathname();
  const { network, setNetwork } = useNetwork();

  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.key === network));

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [tabMetrics, setTabMetrics] = useState<Array<{ left: number; width: number }>>([]);

  useLayoutEffect(() => {
    function measure() {
      const next = tabRefs.current.map((el) =>
        el ? { left: el.offsetLeft, width: el.offsetWidth } : { left: 0, width: 0 }
      );
      setTabMetrics(next);
    }
    measure();

    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== "undefined") {
      tabRefs.current.forEach((el) => {
        if (!el) return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        observers.push(ro);
      });
    }

    document.fonts?.ready.then(measure).catch(() => {});

    window.addEventListener("resize", measure);
    return () => {
      observers.forEach((ro) => ro.disconnect());
      window.removeEventListener("resize", measure);
    };
  }, []);

  const activeMetrics = tabMetrics[activeIndex];

  function handleTabClick(key: Network | null) {
    if (key === network) return;
    setNetwork(key);
    if (key) switchToNetwork(key);
  }

  if (pathname !== "/") return null;

  return (
    <>

      <div
        className="relative flex items-center rounded-full h-8 text-sm font-bold tracking-tight leading-none"
        style={{ isolation: "isolate", background: "var(--color-raised)" }}
      >
        <span
          className="absolute inset-y-0 rounded-full pointer-events-none"
          style={{
            left: 0,
            width: activeMetrics ? `${activeMetrics.width}px` : 0,
            transform: activeMetrics ? `translateX(${activeMetrics.left}px)` : undefined,
            transition: tabMetrics.length
              ? "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), width 0.28s cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
            willChange: "transform, width",
            background: "var(--color-raised)",
            boxShadow: "0 0 0 2px var(--fg-heading)",
            zIndex: 0,
            opacity: activeMetrics ? 1 : 0,
          }}
          aria-hidden="true"
        />

        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap transition-opacity duration-200 cursor-pointer"
            style={{ opacity: network === tab.key ? 1 : 0.4 }}
            aria-pressed={network === tab.key}
            onClick={() => handleTabClick(tab.key)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

    </>
  );
}