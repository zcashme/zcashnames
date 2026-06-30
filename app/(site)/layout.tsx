/*
 * Shared layout for retained site-group routes, now primarily internal tools.
 *
 * The actual html/body shell now lives in app/layout.tsx. This layout only owns
 * shared providers and metadata for the remaining (site) routes.
 *
 * Providers (ThemeProvider → NetworkProvider) wrap all children so the retained
 * internal tools still share theme state and ZNS network context. SEO metadata
 * stays here because app/og and remaining preview routes still rely on it.
 */
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { cookies } from "next/headers";
import { NetworkProvider } from "@/components/hooks/useZns";
import { BETA_COOKIE_NAME, readCurrentStage } from "@/lib/beta/gate";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/lib/zns/brand";

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
  const initialMode = stage ?? "mainnet";

  return (
    <>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="dark"
        themes={["dark", "light", "monochrome"]}
      >
        <NetworkProvider initialMode={initialMode} hasBeta={hasBeta}>
          {children}
        </NetworkProvider>
      </ThemeProvider>
      <Analytics />
    </>
  );
}
