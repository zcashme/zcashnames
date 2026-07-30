/*
 * Marketing site layout for the public-facing (site) route group.
 *
 * The actual html/body shell now lives in app/layout.tsx. This layout only owns
 * site-wide providers and chrome for the marketing routes.
 *
 * Providers (ThemeProvider → NetworkProvider) wrap all children so the entire
 * marketing site shares theme state and ZNS network context.
 *
 * Header, Footer, and CabalLaunchBar are site‑wide chrome rendered on every
 * marketing page.  SEO metadata (OpenGraph, Twitter, JSON‑LD) is defined
 * alongside the layout so it applies globally.
 */
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { cookies } from "next/headers";
import { NetworkProvider } from "@/components/hooks/useZns";
import {
  BETA_COOKIE_NAME,
  readCurrentBetaAccessSession,
  readCurrentStage,
} from "@/lib/beta/gate";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CabalLaunchBar from "@/components/influencer/CabalLaunchBar";
import BetaApplyBar from "@/components/waitlist/BetaApplyBar";
import { VerifyEarlyAccessNotice } from "@/components/verify/WaitlistVerifyClient";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/lib/zns/brand";
import PwaShellClient from "@/components/PwaShellClient";
import PurchaseResumeShell from "@/components/purchases/PurchaseResumeShell";
import SiteSupportMenu from "@/components/SiteSupportMenu";
import { WAITLIST_VIEW_EARLY_ACCESS_START_AT } from "@/lib/waitlist/view";

const previewImage = {
  url: BRAND.previewImage,
  width: 1200,
  height: 630,
  alt: "Zcash Names - Personal names for shielded addresses.",
};

export const metadata: Metadata = {
  title: BRAND.title,
  description: BRAND.description,
  icons: { icon: "/landing/z5.png" },
  keywords: [
    "zcashname",
    "zcashnames",
    "ZNS",
    "zecnames",
    "zcash",
    "zcash name service",
  ],
  metadataBase: new URL(BRAND.url),
  openGraph: {
    title: BRAND.title,
    description: BRAND.description,
    url: BRAND.url,
    siteName: BRAND.name,
    type: "website",
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    site: BRAND.twitter,
    title: BRAND.title,
    description: BRAND.description,
    images: [previewImage],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BRAND.url },
};

/* ── Layout ─────────────────────────────────────────────────────────── */

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, stage, session] = await Promise.all([
    cookies(),
    readCurrentStage(),
    readCurrentBetaAccessSession(),
  ]);
  const hasBeta = !!cookieStore.get(BETA_COOKIE_NAME)?.value;
  const initialMode = stage ?? "waitlist";
  const feedbackLauncherEnabled =
    (session?.kind === "tester" && session.tester.cohort === "v2") ||
    (session?.kind === "shared" && session.testerId === "shared_mainnet");

  return (
    <>
      <PwaShellClient />
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="light"
        themes={["dark", "light", "monochrome"]}
      >
        <NetworkProvider initialMode={initialMode} hasBeta={hasBeta}>

        <div data-site-chrome="true">
        <VerifyEarlyAccessNotice
          earlyAccessStartAt={WAITLIST_VIEW_EARLY_ACCESS_START_AT}
          hideOnWide={false}
        />
        <BetaApplyBar />
        <CabalLaunchBar />
        <Header />
        </div>
        {children}
        <PurchaseResumeShell />
        <SiteSupportMenu feedbackLauncherEnabled={feedbackLauncherEnabled} />
        <div data-site-chrome="true">
        <Footer />
        </div>

        </NetworkProvider>
      </ThemeProvider>
      <Analytics />
    </>
  );
}
