"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useZns, type ZnsMode } from "@/components/hooks/useZns";

const LABELS: Record<ZnsMode["mode"], string> = {
  waitlist: "Waitlist",
  mainnet: "Mainnet",
  testnet: "Testnet",
};

const MODES: ZnsMode["mode"][] = ["mainnet", "testnet", "waitlist"];

export default function NetworkToggle() {
  const pathname = usePathname();
  const { zns, setMode } = useZns();
  const activeIndex = MODES.findIndex((m) => m === zns.mode);
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

  if (pathname !== "/") return null;

  return (
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

      {MODES.map((m, i) => (
        <button
          key={m}
          ref={(el) => { tabRefs.current[i] = el; }}
          type="button"
          className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap transition-opacity duration-200 cursor-pointer"
          style={{ opacity: zns.mode === m ? 1 : 0.4 }}
          aria-pressed={zns.mode === m}
          onClick={() => setMode(m)}
        >
          <span>{LABELS[m]}</span>
        </button>
      ))}
    </div>
  );
}