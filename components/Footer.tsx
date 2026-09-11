"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FooterSitemap from "@/components/FooterSitemap";
import { COMMUNITIES } from "@/lib/zns/brand";
import { SOCIAL_ICON_PATHS, socialIconKeyForLabel } from "@/lib/social-icons";

export default function Footer() {
  const pathname = usePathname();
  const showLandingDisclaimer = pathname === "/" || pathname === "/waitlist";

  return (
    <footer data-site-footer className="w-full bg-transparent">
      <FooterSitemap />

      {/*
        Brand / social bar. Vertical gap below © → social icons (mobile stack)
        matches Top/Sitemap button bottoms → Zcash Names (via FooterSitemap pb).
      */}
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-0 sm:pb-8">
        <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
          {showLandingDisclaimer ? (
            <p
              className="order-1 text-center text-xs lg:order-2"
              style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}
            >
              Not affiliated with Zcash Foundation
            </p>
          ) : (
            <div className="hidden lg:order-2 lg:block" aria-hidden="true" />
          )}

          <div className="order-2 flex flex-col items-center gap-1 lg:order-1 lg:items-start">
            <Link
              href="/"
              className="type-section-subtitle leading-tight font-normal tracking-normal text-fg-heading"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Zcash Names
            </Link>
            <p className="type-chip text-fg-muted">&copy; 2026 ZcashMe</p>
          </div>

          <div className="order-3 flex items-center justify-center gap-5 lg:justify-end">
            {COMMUNITIES.map(({ label, href }) => {
              const key = socialIconKeyForLabel(label);
              if (!key) return null;
              const path = SOCIAL_ICON_PATHS[key];

              return (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-fg-muted transition-colors hover:text-[var(--color-accent-interactive)]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d={path} />
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
