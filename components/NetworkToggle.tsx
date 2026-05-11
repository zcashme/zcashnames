"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useZns, type ZnsMode } from "@/components/hooks/useZns";
import { verifyBetaPassword, switchToNetwork } from "@/lib/beta/actions";
import BetaPasswordModal from "@/components/beta/BetaPasswordModal";

const MODES: ZnsMode[] = ["mainnet", "testnet", "waitlist"];

export default function NetworkToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const { zns, setMode } = useZns();
  const [pendingTarget, setPendingTarget] = useState<"mainnet" | "testnet" | null>(null);

  const onWaitlist = pathname === "/waitlist";
  const onHome = pathname === "/";

  if (!onWaitlist && !onHome) return null;

  const activeMode: ZnsMode = onWaitlist ? "waitlist" : zns.mode;
  function handleClick(mode: ZnsMode) {
    if (onWaitlist) {
      if (mode === "waitlist") return;
      setPendingTarget(mode as "mainnet" | "testnet");
      return;
    }
    if (mode === "waitlist") {
      router.push("/waitlist");
      return;
    }
    setMode(mode);
    switchToNetwork(mode);
  }

  async function handlePasswordSubmit(password: string): Promise<boolean> {
    if (!pendingTarget) return false;
    const result = await verifyBetaPassword(password, pendingTarget);
    if (result.ok) {
      setPendingTarget(null);
      router.push("/");
    }
    return result.ok;
  }

  return (
    <>
      <div
        className="relative flex items-center rounded-full h-8 text-sm font-bold tracking-tight leading-none"
        style={{ "--i": MODES.indexOf(activeMode), isolation: "isolate", background: "var(--color-raised)" }}
      >
        <span
          className="absolute inset-y-0 rounded-full pointer-events-none"
          style={{
            left: 0,
            width: `${100 / MODES.length}%`,
            transform: "translateX(calc(var(--i) * 100%))",
            transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            background: "var(--color-raised)",
            boxShadow: "0 0 0 2px var(--fg-heading)",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap transition-opacity duration-200 cursor-pointer"
            style={{ width: `${100 / MODES.length}%`, opacity: activeMode === mode ? 1 : 0.4 }}
            aria-pressed={activeMode === mode}
            onClick={() => handleClick(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {pendingTarget && (
        <BetaPasswordModal
          target={pendingTarget}
          onCancel={() => setPendingTarget(null)}
          onSubmit={handlePasswordSubmit}
        />
      )}
    </>
  );
}
