/*
 * Marketing site layout — the root layout for the public-facing (site) route group.
 *
 * Fonts (Manrope, Dancing Script, Inter) are loaded into CSS variables here and
 * applied on the <body> so every page below inherits them.  The <html> element
 * lives in this file because Next.js App Router layouts must own the root shell.
 *
 * Providers (ThemeProvider → NetworkProvider) wrap all children so the entire
 * marketing site shares theme state and ZNS network context.
 *
 * Header, Footer, and CabalLaunchBar are site‑wide chrome rendered on every
 * marketing page.  SEO metadata (OpenGraph, Twitter, JSON‑LD) is defined
 * alongside the layout so it applies globally.
 */
import type { Metadata } from "next";
import { Manrope, Dancing_Script, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cookies } from "next/headers";
import { NetworkProvider } from "@/components/hooks/useZns";
import { BETA_COOKIE_NAME, readCurrentStage } from "@/lib/beta/gate";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CabalLaunchBar from "@/components/influencer/CabalLaunchBar";
import BetaApplyBar from "@/components/waitlist/BetaApplyBar";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/lib/zns/brand";
import PwaShellClient from "@/components/PwaShellClient";
import PurchaseResumeShell from "@/components/purchases/PurchaseResumeShell";
import "../globals.css";

const uiSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const uiCursive = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cursive",
  display: "swap",
});

const brandSans = Inter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brand",
  display: "swap",
});

const previewImage = {
  url: BRAND.previewImage,
  width: 1200,
  height: 630,
  alt: "ZcashNames - Personal names for shielded addresses.",
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
  const cookieStore = await cookies();
  const hasBeta = !!cookieStore.get(BETA_COOKIE_NAME)?.value;
  const stage = await readCurrentStage();
  const initialMode = stage ?? "waitlist";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="me" href="https://zcash.me/zcashnames" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: BRAND.name,
              url: BRAND.url,
              logo: BRAND.logo,
              description: BRAND.description,
              foundingDate: "2026",
              parentOrganization: { "@type": "Organization", name: "ZcashMe" },
              contactPoint: {
                "@type": "ContactPoint",
                email: "support@zcash.me",
                contactType: "customer support",
              },
              sameAs: BRAND.socials.map((s) => s.href),
            }),
          }}
        />
      </head>
      <body className={`${uiSans.variable} ${uiCursive.variable} ${brandSans.variable}`}>
        <PwaShellClient />
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={["dark", "light", "monochrome"]}
        >
        <NetworkProvider initialMode={initialMode} hasBeta={hasBeta}>

        <div data-site-chrome="true">
        <BetaApplyBar />
        <CabalLaunchBar />
        <Header />
        </div>
        {children}
        <PurchaseResumeShell />
        <div data-site-chrome="true">
        <Footer />
        </div>

        </NetworkProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
