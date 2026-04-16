import type { Metadata } from "next";
import { Head } from "nextra/components";
import { BRAND } from "@/lib/zns/brand";

export const metadata: Metadata = {
  icons: { icon: "/landing/z5.png" },
  metadataBase: new URL(BRAND.url),
};

export default function DocsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>{children}</body>
    </html>
  );
}
