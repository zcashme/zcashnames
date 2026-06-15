import type { Metadata } from "next";
import Link from "next/link";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BetaRebateForm from "@/components/beta/BetaRebateForm";
import { getCurrentBetaRebateDefaults } from "@/lib/beta/actions";

export const metadata: Metadata = {
  title: "Claim Yours Rebate - ZcashNames",
  description: "Submit a rebate request for mainnet beta claim and buy actions.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function BetaRebatePage() {
  const defaults = await getCurrentBetaRebateDefaults();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <SiteRouteTitle title="Rebate" />
      <header className="mb-6 text-center">
        <span
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--color-brand-blue) 14%, transparent)",
            color: "var(--color-brand-blue)",
          }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          Mainnet rebate
        </span>
        <h1
          className="text-3xl font-bold tracking-tight md:text-4xl"
          style={{ color: "var(--fg-heading)", marginBottom: "0.75rem" }}
        >
          Names are temporary. Claim yours.
        </h1>
        <p className="text-base" style={{ color: "var(--fg-body)", lineHeight: 1.65 }}>
          Submit the name action details and proof image for beta-paid mainnet actions. We lock the beta identifier and access code from your current session, then store the rest with your uploaded screenshot in Supabase.
        </p>
      </header>

      {defaults ? (
        <BetaRebateForm defaults={defaults} />
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
