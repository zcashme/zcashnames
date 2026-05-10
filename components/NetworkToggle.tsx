"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useZns } from "@/components/hooks/useZns";
import { verifyBetaPassword, switchToNetwork } from "@/lib/beta/actions";
import BetaPasswordModal from "@/components/beta/BetaPasswordModal";

export default function NetworkToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const { zns, setMode } = useZns();
  const [pendingTarget, setPendingTarget] = useState<"mainnet" | "testnet" | null>(null);

  const onWaitlist = pathname === "/waitlist";
  const onHome = pathname === "/";

  if (!onWaitlist && !onHome) return null;

  function handleClick(mode: "waitlist" | "mainnet" | "testnet") {
    if (onWaitlist) {
      if (mode === "waitlist") return;
      setPendingTarget(mode);
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
      <div className="flex items-center rounded-full h-8 text-sm font-bold">
        {(["mainnet", "testnet", "waitlist"] as const).map((mode) => {
          const active = onWaitlist ? mode === "waitlist" : zns.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleClick(mode)}
              className={`h-full px-3 rounded-full transition-all ${
                active
                  ? "bg-[var(--color-raised)] shadow-[0_0_0_2px_var(--fg-heading)]"
                  : "text-muted"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          );
        })}
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
