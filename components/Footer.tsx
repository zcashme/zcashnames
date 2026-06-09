import Link from "next/link";
import { COMMUNITIES } from "@/lib/zns/brand";
import { SOCIAL_ICON_PATHS, socialIconKeyForLabel } from "@/lib/social-icons";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-transparent">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1 items-center sm:items-start">
          <Link
            href="/"
            className="type-section-subtitle leading-tight font-normal tracking-normal text-fg-heading"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            ZcashNames
          </Link>
          <p className="type-chip text-fg-muted">&copy; 2026 ZcashMe</p>
        </div>

        <div className="flex items-center gap-5">
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
                className="text-fg-muted hover:text-brand-blue transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d={path} />
                </svg>
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
