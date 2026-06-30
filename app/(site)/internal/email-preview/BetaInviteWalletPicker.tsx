"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getWalletVariant, WALLET_VARIANTS, subcategoryLabel, type WalletVariantId } from "@/lib/wallets/catalog";

export default function BetaInviteWalletPicker({
  value,
}: {
  value: WalletVariantId | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedVariants = useMemo(
    () =>
      [...WALLET_VARIANTS].sort((a, b) => {
        const byName = a.displayName.localeCompare(b.displayName);
        if (byName !== 0) return byName;
        return a.sortOrder - b.sortOrder;
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  function onChange(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextValue) {
      params.delete("wallet");
    } else {
      params.set("wallet", nextValue);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const selectedLabel = value
    ? (() => {
        const variant = getWalletVariant(value);
        return variant ? `${variant.displayName} / ${subcategoryLabel(variant.subcategory)}` : "No wallet download CTA";
      })()
    : "No wallet download CTA";

  const opaqueSurface = "var(--color-background, #0f1115)";
  const opaqueRaisedSurface = "var(--color-raised, #18181b)";

  return (
    <div className="mt-3 flex flex-col gap-1">
      <label className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
        Wallet
      </label>
      <div ref={menuRef} className="relative w-full max-w-sm">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold outline-none transition-opacity hover:opacity-90"
          style={{
            background: opaqueRaisedSurface,
            borderColor: "var(--tool-panel-border)",
            color: "var(--fg-heading)",
          }}
        >
          <span className="truncate pr-3">{selectedLabel}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-lg shadow-lg"
          style={{
            background: opaqueSurface,
            border: "1px solid var(--tool-panel-border)",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45)",
          }}
        >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!value}
              onClick={() => onChange("")}
              className="block w-full px-3 py-2 text-left text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                color: !value ? "var(--fg-heading)" : "var(--fg-body)",
                background: !value ? "var(--color-raised, #18181b)" : opaqueSurface,
                borderBottom: "1px solid var(--tool-panel-border)",
              }}
            >
              No wallet download CTA
            </button>
            {sortedVariants.map((variant) => {
              const active = value === variant.variantId;
              return (
                <button
                  key={variant.variantId}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => onChange(variant.variantId)}
                  className="block w-full px-3 py-2 text-left text-sm font-semibold transition-colors hover:opacity-90"
                  style={{
                    color: active ? "var(--fg-heading)" : "var(--fg-body)",
                    background: active ? "var(--color-raised, #18181b)" : opaqueSurface,
                    borderBottom: "1px solid var(--tool-panel-border)",
                  }}
                >
                  {variant.displayName}
                  <span className="block text-[0.68rem] font-normal" style={{ color: "var(--fg-muted)" }}>
                    {subcategoryLabel(variant.subcategory)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
