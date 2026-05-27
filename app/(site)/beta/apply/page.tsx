import type { Metadata } from "next";
import Link from "next/link";
import BetaV2ApplicationForm from "@/components/beta/BetaV2ApplicationForm";

export const metadata: Metadata = {
  title: "Apply to the Beta - ZcashNames",
  description: "Apply for the next ZcashNames beta round.",
  openGraph: {
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    url: "https://www.zcashnames.com/beta/apply",
    images: [
      {
        url: "/og/beta.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames beta invitation preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    images: ["/og/beta.png"],
  },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Beta application page — renders a contextual header explaining the current
 * cohort's focus, then the BetaV2ApplicationForm. This is a client-accessible
 * route; the form submits to server actions that write to the beta_testers table
 * and trigger email notifications.
 */
export default function BetaApplyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Applications Open
        </span>
        <h1
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ color: "var(--fg-heading)", marginBottom: "0.75rem" }}
        >
          Apply for the next beta cohort
        </h1>
        <p className="text-base" style={{ color: "var(--fg-body)", lineHeight: 1.65 }}>
          In this round, you will be: buying and selling names, viewing your personal collection, and
          sending ZEC to names in wallets featuring ZNS. Anyone can apply. We&apos;re especially
          looking for people who can spot confusing UX, explain bugs clearly, or both.
        </p>
        <p className="text-sm mt-3" style={{ color: "var(--fg-muted)" }}>
          Need the full context first?{" "}
          <Link href="/beta" style={{ color: "var(--fg-body)" }}>
            Read the <span className="underline">beta brief</span>
          </Link>
          .
          <br />
          What happened last time?{" "}
          <Link
            href="https://x.com/ZcashNames/status/2052521176841494552?s=20"
            style={{ color: "var(--fg-body)" }}
          >
            Read the <span className="underline">thread on X</span>
          </Link>
          .
        </p>
      </header>

      <BetaV2ApplicationForm />
    </div>
  );
}
