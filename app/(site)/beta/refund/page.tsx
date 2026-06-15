import type { Metadata } from "next";
import Link from "next/link";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BetaRefundForm from "@/components/beta/BetaRefundForm";
import { getCurrentBetaRefundDefaults } from "@/lib/beta/actions";

export const metadata: Metadata = {
  title: "Claim Your Refund - ZcashNames",
  description: "Submit a refund request for mainnet beta claim and buy actions.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function BetaRefundPage() {
  const defaults = await getCurrentBetaRefundDefaults();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <SiteRouteTitle title="Refund" />
      <header className="mb-6 text-center">
        <span
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--color-brand-blue) 14%, transparent)",
            color: "var(--color-brand-blue)",
          }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          Mainnet refund
        </span>
        <h1
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: "var(--fg-heading)", marginBottom: "0.75rem" }}
        >
          Thanks for participating.
        </h1>
        <p className="text-base" style={{ color: "var(--fg-body)", lineHeight: 1.65 }}>
          During the beta, you may have paid to test Zcash name actions. The names you may have
          claimed or purchased are temporary. Use this form to request a refund.
        </p>

      </header>

      {defaults ? (
        <BetaRefundForm defaults={defaults} />
      ) : (
        <div
          className="rounded-[24px] border px-5 py-6 text-center sm:px-6"
          style={{
            borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 58%, transparent), color-mix(in srgb, var(--faq-border) 14%, transparent))",
          }}
        >
          <p className="text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
            A beta mainnet session is required before submitting this form.
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
            Sign in from <Link href="/beta" className="underline" style={{ color: "var(--fg-body)" }}>/beta</Link> with your invite code or shared mainnet password, then return here.
          </p>
        </div>
      )}
    </div>
  );
}
