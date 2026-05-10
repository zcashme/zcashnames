"use client";

import { useZns } from "@/components/hooks/useZns";
import { usePathname } from "next/navigation";

export default function NetworkToggle() {
  const pathname = usePathname();
  const { zns, setMode } = useZns();

  if (pathname !== "/") return null;

  return (
    <div className="flex items-center rounded-full h-8 text-sm font-bold">
      {(["mainnet", "testnet", "waitlist"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setMode(mode)}
          className={`h-full px-3 rounded-full transition-all ${
            zns.mode === mode
              ? "bg-[var(--color-raised)] shadow-[0_0_0_2px_var(--fg-heading)]"
              : "text-muted"
          }`}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  );
}
