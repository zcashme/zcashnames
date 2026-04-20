"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentBetaStage, verifyNetworkAccess } from "@/lib/beta/actions";
import { getWaitlistStats } from "@/lib/leaders/leaders";
import { getHomeStats } from "@/lib/zns/resolve";
import type { Network } from "@/lib/zns/name";

type StatusState = "mainnet" | "testnet" | "waitlist";

export type WaitlistStatsData = {
  waitlist: number;
  referred: number;
  rewardsPot: number;
};

export type HomeStatsData = {
  claimed: number;
  forSale: number;
  verifiedOnZcashMe: number;
  syncedHeight: number;
  uivk: string;
};

export type StatusData =
  | { mode: "waitlist"; stats: WaitlistStatsData }
  | { mode: "search"; network: Network; stats: HomeStatsData };

interface StatusContextValue {
  status: StatusState;
  setStatus: (s: StatusState) => void;
  networkPassword: string;
  setNetworkPassword: (v: string) => void;
  isSearchMode: boolean;
  network: Network;
  data: StatusData | null;
  loading: boolean;
  refresh: () => void;
}

const StatusContext = createContext<StatusContextValue>({
  status: "waitlist",
  setStatus: () => {},
  networkPassword: "",
  setNetworkPassword: () => {},
  isSearchMode: false,
  network: "testnet",
  data: null,
  loading: true,
  refresh: () => {},
});

export function useStatus() {
  return useContext(StatusContext);
}

function applyStatus(s: StatusState) {
  document.documentElement.setAttribute("data-status", s);
}

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<StatusState>("waitlist");
  const [networkPassword, setNetworkPassword] = useState("");
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageHydrated, setStageHydrated] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const isSearchMode = status === "testnet" || status === "mainnet";
  const network: Network = status === "mainnet" ? "mainnet" : "testnet";

  function setStatus(s: StatusState) {
    setStatusState(s);
    applyStatus(s);
  }

  function refresh() {
    setRefreshCounter((c) => c + 1);
  }

  useEffect(() => {
    let cancelled = false;

    getCurrentBetaStage()
      .then((stage) => {
        if (cancelled || !stage) return;
        setStatusState(stage);
        applyStatus(stage);
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
        if (isSearchMode) {
          const stats = await getHomeStats(network);
          if (!cancelled) setData({ mode: "search", network, stats });
        } else {
          const stats = await getWaitlistStats();
          if (!cancelled) setData({ mode: "waitlist", stats });
        }
      } catch {
        // keep data as null on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [status, refreshCounter, stageHydrated, isSearchMode, network]);

  return (
    <StatusContext.Provider
      value={{ status, setStatus, networkPassword, setNetworkPassword, isSearchMode, network, data, loading, refresh }}
    >
      {children}
    </StatusContext.Provider>
  );
}

const TABS: { key: StatusState; label: string }[] = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
  { key: "waitlist", label: "Waitlist" },
];

export default function StatusToggle() {
  const pathname = usePathname();
  const { status, setStatus, setNetworkPassword } = useStatus();

  const [showModal, setShowModal] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<"testnet" | "mainnet">("testnet");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.key === status));

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

  function handleTabClick(key: StatusState) {
    if (key === status) return;

    if (key === "waitlist") {
      setStatus("waitlist");
      return;
    }

    setPendingTarget(key);
    setInput("");
    setError(false);
    setShowModal(true);
  }

  async function handleSubmit() {
    if (checking) return;
    setChecking(true);
    try {
      const result = await verifyNetworkAccess(pendingTarget, input);
      if (result.ok) {
        setNetworkPassword(input);
        setStatus(pendingTarget);
        setShowModal(false);
        setInput("");
        setError(false);
        if (result.attributedTo) {
          setWelcomeName(result.attributedTo);
          window.setTimeout(() => setWelcomeName(null), 4000);
        }
      } else {
        setError(true);
        setInput("");
        inputRef.current?.focus();
      }
    } finally {
      setChecking(false);
    }
  }

  function handleCancel() {
    setShowModal(false);
    setInput("");
    setError(false);
  }

  if (pathname !== "/") return null;

  return (
    <>
      {welcomeName && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[10001] rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg pointer-events-none"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
            border: "1px solid var(--color-accent-green)",
          }}
        >
          Welcome, {welcomeName} &mdash; reports will be attributed to you.
        </div>
      )}
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
            key={tab.key}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap transition-opacity duration-200 cursor-pointer"
            style={{ opacity: status === tab.key ? 1 : 0.4 }}
            aria-pressed={status === tab.key}
            onClick={() => handleTabClick(tab.key)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <div
            className="rounded-2xl px-8 py-7 w-full max-w-sm flex flex-col gap-5"
            style={{
              background: "var(--feature-card-bg)",
              border: "1px solid var(--faq-border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
            }}
          >
            <div>
              <h2 className="type-card-title text-fg-heading m-0">
                {pendingTarget === "mainnet" ? "Mainnet Access" : "Testnet Access"}
              </h2>
              <p className="type-body mt-1.5" style={{ color: "var(--fg-muted)" }}>
                Enter the {pendingTarget} password to continue.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={inputRef}
                type="password"
                autoFocus
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") handleCancel();
                }}
                placeholder="Password"
                className="w-full rounded-xl px-4 py-3 type-body outline-none"
                style={{
                  background: "var(--color-raised)",
                  border: error
                    ? "1.5px solid var(--accent-red, #e05252)"
                    : "1.5px solid var(--faq-border)",
                  color: "var(--fg-heading)",
                }}
              />
              {error && (
                <p className="type-chip" style={{ color: "var(--accent-red, #e05252)" }}>
                  Incorrect password.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-full type-body font-bold transition-opacity duration-200 hover:opacity-60 cursor-pointer"
                style={{ color: "var(--fg-muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-full type-body font-bold cursor-pointer transition-opacity duration-200 hover:opacity-80"
                style={{
                  background: "var(--sf-search-btn-bg)",
                  color: "var(--sf-claim-text)",
                  boxShadow: "var(--sf-search-btn-shadow)",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
