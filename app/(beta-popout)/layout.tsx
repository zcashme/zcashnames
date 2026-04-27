import type { Metadata } from "next";
import { Manrope, Dancing_Script } from "next/font/google";
import { ThemeProvider } from "next-themes";
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

export const metadata: Metadata = {
  title: "Beta Feedback — ZcashNames",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/landing/z5.png" },
  metadataBase: new URL(BRAND.url),
};

/**
 * Minimal layout for popout windows. No Header, no Footer, no StatusProvider —
 * just the html shell, fonts, and theme. Used by the standalone feedback window
 * so it looks identical to the in-page panel without the surrounding site chrome.
 */
export default function BetaPopoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${uiSans.variable} ${uiCursive.variable}`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={["dark", "light", "monochrome"]}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
