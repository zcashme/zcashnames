import { Head } from "nextra/components";
import { Manrope } from "next/font/google";

const uiSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

/**
 * Root HTML shell for the (docs) route group. Injects the Nextra <Head> component
 * (which sets meta, favicon, and theme-color based on light/dark) and loads only
 * the Manrope font. All other Nextra chrome (Navbar, Sidebar, TOC) is provided by
 * the inner DocsLayout one level down.
 */
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
