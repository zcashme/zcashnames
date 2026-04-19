import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import StatusToggle from "@/components/StatusToggle";
import ThemeToggle from "@/components/ThemeToggle";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";

export default function Header() {
  return (
    <header className="relative z-50 bg-transparent">
      <div className="mx-auto flex h-[92px] max-w-[1320px] items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <HeaderMenu />
          <Link
            href="/"
            aria-label="ZcashNames"
            className="group type-section-subtitle inline-flex items-center gap-4 whitespace-nowrap text-fg-heading font-bold tracking-tight leading-tight [[data-theme=dark]_&]:hover:opacity-80 [[data-theme=monochrome]_&]:hover:opacity-80 transition-opacity"
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
          <span id="site-route-title" className="ml-3 min-w-0" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 sm:gap-4">
          <StatusToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
