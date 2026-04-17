import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { getPageMap } from "nextra/page-map";
import Link from "next/link";
import "nextra-theme-docs/style.css";
import "../docs.css";

export const metadata = {
  title: "ZcashNames Docs",
  description: "Documentation for the Zcash Name Service",
  icons: { icon: "/landing/z5.png" },
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

const footer = (
  <Footer>MIT {new Date().getFullYear()} © ZcashMe</Footer>
);

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
      nextThemes={{
        attribute: "class",
        defaultTheme: "dark",
        storageKey: "zns-docs-theme",
      }}
    >
      {children}
    </Layout>
  );
}
