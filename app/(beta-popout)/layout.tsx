import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Beta Feedback — ZcashNames",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Minimal layout for popout windows. The html/body shell and font variables live
 * in app/layout.tsx; this group adds only theme wiring for the standalone window.
 */
export default function BetaPopoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      themes={["dark", "light", "monochrome"]}
    >
      {children}
    </ThemeProvider>
  );
}
