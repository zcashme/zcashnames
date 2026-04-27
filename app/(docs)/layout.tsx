import type { Metadata } from "next";
import { Head } from "nextra/components";
import { BRAND } from "@/lib/zns/brand";

export const metadata: Metadata = {
  icons: { icon: "/landing/z5.png" },
  metadataBase: new URL(BRAND.url),
};
import { Manrope } from "next/font/google";

const uiSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export default function DocsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head backgroundColor={{ light: "#fefcf7", dark: "#0a0a0a" }} />
      <body className={uiSans.variable}>{children}</body>
    </html>
  );
}
