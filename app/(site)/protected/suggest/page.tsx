import type { Metadata } from "next";
import Link from "next/link";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ProtectedSuggestionForm from "@/components/protected/ProtectedSuggestionForm";

export const metadata: Metadata = {
  title: "Protect a Name - Zcash Names",
  description: "Submit a public protected-name suggestion for Zcash Names review.",
  alternates: { canonical: "https://www.zcashnames.com/protected/suggest" },
  openGraph: {
    title: "Suggest Protected Names | Zcash Names",
    description: "Submit a public protected-name suggestion for Zcash Names review.",
    url: "https://www.zcashnames.com/protected/suggest",
    images: [
      {
        url: "/og/protected-suggest.png",
        width: 1200,
        height: 630,
        alt: "Suggest a protected Zcash Name preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Suggest Protected Names | Zcash Names",
    description: "Submit a public protected-name suggestion for Zcash Names review.",
    images: ["/og/protected-suggest.png"],
  },
};

export const dynamic = "force-dynamic";

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M12 5L5 12L12 19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ProtectedSuggestPageProps = {
  searchParams?: Promise<{
    name?: string;
  }>;
};

export default async function ProtectedSuggestPage({
  searchParams,
}: ProtectedSuggestPageProps) {
  const params = (await searchParams) ?? {};
  const initialName = typeof params.name === "string" ? params.name : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title="Protect a Name" href="/protected/suggest" />

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/protected"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-muted bg-transparent px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Names
          </Link>
        </div>

        <section
          className="relative w-full rounded-t-2xl border border-b-0 px-6 py-8 sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <HeroShareButton
            message="Suggest a name that should be protected in the Zcash Name Space at ZcashNames. If they accept, earn $ZEC:"
            xMessage="Suggest a name that should be protected in the Zcash Name Space at @ZcashNames. If they accept, earn $ZEC:"
            shareUrl="https://www.zcashnames.com/protected/suggest"
            emailSubject="Protect Zcash Name Space from Impersonation"
          />
          <div className="grid gap-4">
          <h1
            className="text-center text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
            style={{ color: "var(--fg-heading)" }}
          >
            Protect a Name
          </h1>
          <p
            className="mx-auto max-w-3xl text-center text-base leading-8 sm:text-lg"
            style={{ color: "var(--fg-body)" }}
          >
            Protected names help reduce impersonation, phishing, fraud, and public confusion across
            the Zcash Names ecosystem.
          </p>
          </div>
        </section>

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <ProtectedSuggestionForm returnHref="/protected" initialName={initialName} />
        </div>
      </div>
    </div>
  );
}
