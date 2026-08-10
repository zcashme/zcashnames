"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { HeaderMenuPanel, HeaderMenuToggle } from "@/components/HeaderMenu";
import { useRouteNavigationProgress } from "@/components/hooks/useRouteNavigationProgress";
import NetworkToggle from "@/components/NetworkToggle";
import ThemeToggle from "@/components/ThemeToggle";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoading, progress, direction } = useRouteNavigationProgress();
  const onOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const progressStyle =
    direction === "rtl"
      ? { right: 0, left: "auto" as const, width: `${progress}%` }
      : { left: 0, right: "auto" as const, width: `${progress}%` };

  return (
    <header className="relative z-50 bg-transparent">
      {isLoading && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-0"
            style={{
              ...progressStyle,
              background:
                "color-mix(in srgb, var(--color-accent-interactive) 20%, transparent)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 z-10 h-[2px]"
            style={{
              ...progressStyle,
              background: "var(--color-accent-interactive)",
            }}
          />
        </>
      )}

      <div className="relative z-[1] mx-auto max-w-[1320px] px-4">
        <div className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <HeaderMenuToggle open={menuOpen} onOpenChange={onOpenChange} />
            <Link
              href="/"
              aria-label="Zcash Names"
              className="group type-section-subtitle inline-flex shrink-0 items-center gap-3 whitespace-nowrap text-fg-heading font-bold tracking-tight leading-tight transition-opacity sm:gap-4 [[data-theme=dark]_&]:hover:opacity-80 [[data-theme=monochrome]_&]:hover:opacity-80"
            >
              <ZcashNamesLogoMark
                alt="Zcash Names"
                size={40}
                priority
                className="transition-transform duration-200 group-hover:rotate-90"
              />
              <span
                className="site-brand-wordmark hidden font-normal tracking-normal sm:inline"
                style={{ fontFamily: "var(--font-brand)" }}
              >
                Zcash Names
              </span>
            </Link>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-4">
            <NetworkToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <HeaderMenuPanel open={menuOpen} onOpenChange={onOpenChange} />
    </header>
  );
}
