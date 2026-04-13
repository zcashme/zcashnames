import Image from "next/image";
import Link from "next/link";
import StatusToggle from "@/components/StatusToggle";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  return (
    <header className="relative z-10 bg-transparent">
      <div className="mx-auto flex h-[92px] max-w-[1320px] items-center justify-between px-4">
        <Link
          href="/"
          aria-label="ZcashNames"
          className="group type-section-subtitle inline-flex items-center gap-4 whitespace-nowrap text-fg-heading font-bold tracking-tight leading-tight [[data-theme=dark]_&]:hover:opacity-80 [[data-theme=monochrome]_&]:hover:opacity-80 transition-opacity"
        >
          <span className="relative block w-10 h-10 shrink-0 rotate-90 group-hover:rotate-0 transition-transform duration-300 ease-out">
            <Image
              src="/landing/z4.png"
              alt="ZcashNames"
              width={56}
              height={56}
              priority
              className="theme-chrome-media w-10 h-10 [[data-theme=monochrome]_&]:hidden"
              style={{ filter: "var(--logo-filter)" }}
            />
            <span
              className="absolute inset-0 hidden [[data-theme=monochrome]_&]:block pointer-events-none"
              style={{
                background: "var(--fg-heading)",
                WebkitMaskImage: "url('/landing/z4.png')",
                maskImage: "url('/landing/z4.png')",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
              aria-hidden="true"
            />
          </span>
          <span className="hidden sm:inline">ZcashNames</span>
        </Link>
        <span id="site-route-title" className="ml-3 min-w-0" />

        <div className="flex-1" />

        <div className="flex items-center gap-3 sm:gap-4">
          <StatusToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
