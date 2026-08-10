import Link from "next/link";
import FooterSitemap from "@/components/FooterSitemap";
import { COMMUNITIES } from "@/lib/zns/brand";
import { SOCIAL_ICON_PATHS, socialIconKeyForLabel } from "@/lib/social-icons";

export default function Footer() {
  return (
    <footer data-site-footer className="w-full bg-transparent">
      <FooterSitemap />

      {/*
        Brand / social bar. Vertical gap below © → social icons (mobile stack)
        matches Top/Sitemap button bottoms → Zcash Names (via FooterSitemap pb).
      */}
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-0 sm:pb-8">
        <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <Link
              href="/"
              className="type-section-subtitle leading-tight font-normal tracking-normal text-fg-heading"
              style={{ fontFamily: "var(--font-brand)" }}
            >
              Zcash Names
            </Link>
            <p className="type-chip text-fg-muted">&copy; 2026 ZcashMe</p>
          </div>

          <div className="flex items-center justify-center gap-5 sm:justify-end">
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
