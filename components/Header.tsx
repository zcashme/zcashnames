import Image from "next/image";
import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import StatusToggle from "@/components/StatusToggle";
import ThemeToggle from "@/components/ThemeToggle";

const headerLogos = {
  light: "/brandkit/zcashnames-primary-logo-black-transparent-377x403.png",
  dark: "/brandkit/zcashnames-primary-logo-white-transparent-377x403.png",
  monochrome: "/brandkit/zcashnames-primary-logo-monochrome-green-transparent-377x403.png",
};

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
              src={headerLogos.dark}
              alt="ZcashNames"
              width={377}
              height={403}
              priority
              className="theme-chrome-media block h-10 w-10 object-contain [[data-theme=light]_&]:hidden [[data-theme=monochrome]_&]:hidden"
            />
            <Image
              src={headerLogos.light}
              alt="ZcashNames"
              width={377}
              height={403}
              priority
              className="theme-chrome-media hidden h-10 w-10 object-contain [[data-theme=light]_&]:block"
            />
            <span
              className="absolute inset-0 hidden [[data-theme=monochrome]_&]:block pointer-events-none"
              style={{
                background: "var(--fg-heading)",
                WebkitMaskImage: `url('${headerLogos.monochrome}')`,
                maskImage: `url('${headerLogos.monochrome}')`,
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
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
