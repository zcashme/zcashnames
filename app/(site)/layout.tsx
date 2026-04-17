import type { Metadata } from "next";
import { Manrope, Dancing_Script } from "next/font/google";
import { StatusProvider } from "@/components/StatusToggle";
import { ThemeProvider } from "next-themes";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BetaApplyBar from "@/components/closedbeta/BetaApplyBar";
import CabalLaunchBar from "@/components/influencer/CabalLaunchBar";
import { Analytics } from "@vercel/analytics/next";
import { BRAND } from "@/lib/zns/brand";
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
  return (
    <html lang="en" data-status="waitlist" suppressHydrationWarning>
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
      <body className={`${uiSans.variable} ${uiCursive.variable}`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={["dark", "light", "monochrome"]}
        >
        <StatusProvider>

        <BetaApplyBar />
        <CabalLaunchBar />
        <Header />
        {children}
        <Footer />

        </StatusProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

