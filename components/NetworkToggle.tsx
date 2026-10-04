"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import { useTheme } from "next-themes";
import { useZns, type ZnsMode } from "@/components/hooks/useZns";
import { isMintNetworkEnabled } from "@/lib/zns/mint-config";

// Two networks, one live: testnet runs the attested Mint today; mainnet is
// coded end-to-end but hardcoded offline (mint-config), so its menu entry is
// visible but disabled. The waitlist mode is gone — the purchase flow is the
// product.
const NETWORK_OPTIONS: Array<{ mode: ZnsMode; label: string; disabled?: boolean }> = [
  { mode: "testnet", label: "Testnet" },
  { mode: "mainnet", label: "Mainnet", disabled: true },
];

export default function NetworkToggle() {
  const pathname = usePathname();
  const router = useAppRouter();
  const { resolvedTheme } = useTheme();
  const { zns, setMode } = useZns();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const monochrome = resolvedTheme === "monochrome";

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const activeMode: ZnsMode = zns.mode;
  const activeLabel =
    NETWORK_OPTIONS.find((option) => option.mode === activeMode)?.label ?? "Testnet";

  function handleSelect(mode: ZnsMode) {
    const option = NETWORK_OPTIONS.find((entry) => entry.mode === mode);
    if (option?.disabled) return;
    if (mode === activeMode) {
      setMenuOpen(false);
      return;
    }
    setMode(mode);
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        type="button"
        className={`relative flex h-8 items-center justify-center gap-1 rounded-full px-3 text-sm font-bold leading-none tracking-tight transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)] ${
          menuOpen
            ? "text-[var(--color-accent-interactive)]"
            : "text-fg-heading hover:text-[var(--color-accent-interactive)]"
        }`}
        style={{ background: "var(--color-raised)" }}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span className="px-1.5">{activeLabel}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="h-3 w-3 transition-transform duration-200"
          style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M4 6.5L8 10L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className={`absolute right-0 top-[calc(100%+0.45rem)] z-50 min-w-[11rem] overflow-hidden rounded-[18px] border p-2 ${
            monochrome
              ? "border-[rgba(155,188,15,0.62)] bg-[rgba(15,56,15,0.96)] shadow-[0_18px_40px_rgba(15,56,15,0.62)]"
              : "border-border-muted bg-[var(--color-raised)] shadow-2xl"
          }`}
        >
          {NETWORK_OPTIONS.map(({ mode, label, disabled }) => {
            const selected = mode === activeMode;
            return (
              <button
                key={mode}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                aria-disabled={disabled}
                disabled={disabled}
                title={disabled ? "The mainnet mint is not online yet" : undefined}
                className={`flex w-full items-center justify-between rounded-md px-4 py-2 text-left transition-colors duration-150 disabled:cursor-not-allowed ${
                  disabled ? "" : "zns-menu-hover"
                }`}
                style={{
                  color: disabled
                    ? "color-mix(in srgb, var(--fg-body) 48%, transparent)"
                    : selected
                      ? "var(--color-accent-interactive)"
                      : "var(--fg-body)",
                  background: selected
                    ? monochrome
                      ? "rgba(155,188,15,0.16)"
                      : "color-mix(in srgb, var(--color-accent-interactive) 14%, transparent)"
                    : "transparent",
                  opacity: disabled ? 0.65 : 1,
                }}
                onClick={() => handleSelect(mode)}
              >
                <span className="pr-3">{label}</span>
                {selected ? (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--color-accent-interactive)" }}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
