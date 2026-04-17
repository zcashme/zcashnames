import Image from "next/image";
import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import StatusToggle from "@/components/StatusToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { BRAND } from "@/lib/zns/brand";

export default function Header() {
  return (
    <header className="relative z-10 bg-transparent">
      <div className="mx-auto flex h-[92px] max-w-[1320px] items-center justify-between px-4">
        <Link
          href="/"
          aria-label="ZcashNames"
          className="group type-section-subtitle inline-flex items-center gap-4 whitespace-nowrap text-fg-heading font-bold tracking-tight leading-tight [[data-theme=dark]_&]:hover:opacity-80 [[data-theme=monochrome]_&]:hover:opacity-80 transition-opacity"
        >
          <span className="relative block w-10 h-10 shrink-0">
            <Image
              src={BRAND.logoPath}
              alt="ZcashNames"
              width={403}
              height={403}
              priority
              className="theme-chrome-media h-10 w-10"
            />
          </span>
          <span className="hidden sm:inline">ZcashNames</span>
        </Link>
        <span id="site-route-title" className="ml-3 min-w-0" />

        <div className="flex-1" />

        <div className="flex items-center gap-3 sm:gap-4">
          <StatusToggle />
          <ThemeToggle />
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
