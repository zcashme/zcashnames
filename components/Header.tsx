import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import NetworkToggle from "@/components/NetworkToggle";
import ThemeToggle from "@/components/ThemeToggle";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";

export default function Header() {
  return (
    <header className="relative z-50 bg-transparent">
      <div className="mx-auto max-w-[1320px] px-4 py-4">
        <div
          className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-[18px] border px-3 py-2 sm:gap-4 sm:px-4"
          style={{
            borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent), color-mix(in srgb, var(--faq-border) 18%, transparent))",
            boxShadow: "0 12px 34px color-mix(in srgb, #000 10%, transparent)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <HeaderMenu />
            <Link
              href="/"
              aria-label="ZcashNames"
              className="group type-section-subtitle inline-flex shrink-0 items-center gap-4 whitespace-nowrap text-fg-heading font-bold tracking-tight leading-tight [[data-theme=dark]_&]:hover:opacity-80 [[data-theme=monochrome]_&]:hover:opacity-80 transition-opacity"
            >
              <ZcashNamesLogoMark
                alt="ZcashNames"
                size={40}
                priority
                className="transition-transform duration-200 group-hover:rotate-90"
              />
              <span className="hidden font-normal tracking-normal sm:inline" style={{ fontFamily: "var(--font-brand)" }}>
                ZcashNames
              </span>
            </Link>
            <span id="site-route-title" className="min-w-0 flex-1" />
          </div>

          <div />

          <div className="flex min-w-0 items-center justify-end gap-2">
            <NetworkToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
