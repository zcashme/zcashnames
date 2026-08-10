import { Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import Link from "next/link";
import "nextra-theme-docs/style.css";
import "../docs.css";

export const metadata = {
  title: "ZcashNames Docs",
  description: "Documentation for the Zcash Name Service",
  icons: { icon: "/landing/z5.png" },
  alternates: {
    canonical: "https://www.zcashnames.com/docs",
  },
  openGraph: {
    title: "Docs | Zcash Names",
    description: "Documentation for the Zcash Name Service",
    url: "https://www.zcashnames.com/docs",
    images: [
      {
        url: "/og/docs.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names docs preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Docs | Zcash Names",
    description: "Documentation for the Zcash Name Service",
    images: ["/og/docs.png"],
  },
};

const navbar = (
  <Navbar
    logo={
      <span className="docs-navbar-logo" aria-label="Docs">
        <Link
          href="/"
          className="docs-navbar-logo-mark-wrap"
          aria-label="ZcashNames home"
        >
          <img
            src="/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png"
            alt=""
            width={403}
            height={403}
            className="docs-navbar-logo-mark docs-navbar-logo-mark-image"
          />
          <span className="docs-navbar-logo-mark-mono" aria-hidden="true" />
        </Link>
        <Link href="/docs" className="docs-navbar-logo-text">
          Docs
        </Link>
      </span>
    }
    logoLink={false}
    projectLink="https://github.com/zcashme/zcashnames"
  />
);

/* Custom footer — not Nextra <Footer>, which always adds switchers, <hr>, and a tinted band. */
const footer = (
  <footer className="docs-page-footer">
    MIT {new Date().getFullYear()} © ZcashMe, Inc.
  </footer>
);

/**
 * Nextra docs layout: renders the full documentation chrome — Navbar with logo
 * and GitHub link, sidebar page map resolved from /docs, and Footer.
 *
 * Docs are dark-only. Marketing-site light/monochrome themes set data-theme on
 * <html> and that used to leak into /docs (cream body + pale Nextra text).
 * We force dark here and reassert dark tokens in docs.css.
 */
export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout
      navbar={navbar}
      pageMap={await getPageMap("/docs")}
      docsRepositoryBase="https://github.com/zcashme/zcashnames/tree/main/content/docs"
      footer={footer}
      darkMode={false}
      nextThemes={{
        attribute: "class",
        defaultTheme: "dark",
        forcedTheme: "dark",
        storageKey: "zns-docs-theme",
      }}
    >
      {children}
    </Layout>
  );
}
