import type { ReactNode } from "react";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";

const HERO_STYLE = {
  borderColor: "var(--faq-border)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
} as const;

export const PREFERENCES_PANE_STYLE = {
  borderColor: "var(--faq-border)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
  boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
} as const;

export default function PreferencesPageShell({
  eyebrow,
  title,
  description,
  pills,
  children,
}: {
  eyebrow?: string;
  title?: ReactNode;
  description: ReactNode;
  pills?: string[];
  children: ReactNode;
}) {
  return (
    <main className="w-full">
      <SiteRouteTitle title="Email preferences" href="/unsubscribe" />
      <section className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        {/*
          Same join as /protected/suggest: open-bottom hero, fully rounded form card,
          vertical side rails bridging the short gap between them.
        */}
        <div className="mx-auto w-full max-w-[920px]">
          <div
            className="relative w-full rounded-t-2xl border border-b-0 px-6 py-8 text-center sm:px-8 sm:py-10"
            style={HERO_STYLE}
          >
            <HeroShareButton
              message="Manage ZcashNames email preferences, including early-access and waitlist updates:"
              shareUrl="https://www.zcashnames.com/unsubscribe"
              emailSubject="Zcash Names email preferences"
            />
            {eyebrow ? (
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--fg-muted)" }}
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={`${eyebrow ? "mt-3 " : ""}mx-auto max-w-[calc(100%-3.25rem)] text-balance text-4xl font-black tracking-[-0.05em] sm:max-w-[calc(100%-3.75rem)] sm:text-5xl md:text-6xl`}
              style={{ color: "var(--fg-heading)" }}
            >
              {title ?? (
                <>
                  Email{" "}
                  <span style={{ color: "var(--color-accent-interactive)" }}>preferences</span>
                </>
              )}
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-base leading-8 sm:text-lg"
              style={{ color: "var(--fg-body)" }}
            >
              {description}
            </p>
          </div>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
              style={{ background: "var(--faq-border)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[calc(100%-1px)] top-[-1rem] z-10 block h-8 w-px"
              style={{ background: "var(--faq-border)" }}
            />
            {pills && pills.length > 0 ? (
              <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                <div className="flex max-w-[min(100vw-2rem,36rem)] flex-wrap items-center justify-center gap-2">
                  {pills.map((label) => (
                    <span
                      key={label}
                      className="inline-flex max-w-full items-center rounded-full border border-border-muted bg-[var(--color-background)] px-5 py-2 text-base font-semibold text-fg-heading sm:px-6 sm:text-lg"
                    >
                      <span className="truncate">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div
              className={`rounded-2xl border px-5 sm:px-6 ${pills && pills.length > 0 ? "pb-5 pt-8 sm:pb-6 sm:pt-10" : "py-5 sm:py-6"}`}
              style={PREFERENCES_PANE_STYLE}
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
