import type { Metadata } from "next";
import Link from "next/link";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import WalletFeatureMatrix from "@/components/wallets/WalletFeatureMatrix";
import { WALLET_VARIANTS } from "@/lib/wallets/catalog";

export const metadata: Metadata = {
  title: "Beta Wallets - ZcashNames",
  description: "Compare ZcashNames beta wallet features by platform.",
  robots: { index: false, follow: false, nocache: true },
};

const p: React.CSSProperties = {
  color: "var(--fg-body)",
  lineHeight: 1.75,
  fontSize: "0.97rem",
  marginBottom: "0.75rem",
};

const linkStyle: React.CSSProperties = {
  color: "var(--fg-heading)",
  textDecoration: "underline",
};

export default function BetaWalletsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-10">
      <SiteRouteTitle title="Beta Wallets" />
      <main className="max-w-5xl">
        <p style={p}>
          Each planned wallet value is platform-specific. Use this matrix to compare the mobile,
          desktop, and browser integrations available during Beta 2.
        </p>
        <p style={p}>
          Ready to test? <Link href="/beta/apply" style={linkStyle}>Apply today</Link>.
        </p>
        <WalletFeatureMatrix variants={WALLET_VARIANTS} />
      </main>
    </div>
  );
}

