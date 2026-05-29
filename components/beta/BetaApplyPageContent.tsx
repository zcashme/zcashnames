import Link from "next/link";
import BetaV2ApplicationForm from "@/components/beta/BetaV2ApplicationForm";
import WalletBrandLogo from "@/components/wallets/WalletBrandLogo";
import { getWalletBrand, type WalletBrandSlug } from "@/lib/wallets/catalog";

export default function BetaApplyPageContent({ brandSlug }: { brandSlug?: WalletBrandSlug }) {
  const brand = brandSlug ? getWalletBrand(brandSlug) : null;
  const briefHref = brand ? `/beta/${brand.slug}` : "/beta";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        {brand && (
          <div className="mb-5 flex justify-center">
            <WalletBrandLogo brand={brand} />
          </div>
        )}
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Applications Open
        </span>
        <h1
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ color: "var(--fg-heading)", marginBottom: "0.75rem" }}
        >
          {brand ? `Apply for the ${brand.displayName} beta` : "Apply for the next beta cohort"}
        </h1>
        <p className="text-base" style={{ color: "var(--fg-body)", lineHeight: 1.65 }}>
          {brand
            ? `${brand.intro} We are especially looking for people who can spot confusing UX, explain bugs clearly, or both.`
            : "In this round, you will be: buying and selling names, viewing your personal collection, and sending ZEC to names in wallets featuring ZNS. Anyone can apply. We're especially looking for people who can spot confusing UX, explain bugs clearly, or both."}
        </p>
        <p className="text-sm mt-3" style={{ color: "var(--fg-muted)" }}>
          Need the full context first?{" "}
          <Link href={briefHref} style={{ color: "var(--fg-body)" }}>
            Read the <span className="underline">{brand ? `${brand.displayName} beta brief` : "beta brief"}</span>
          </Link>
          .
          <br />
          What happened last time?{" "}
          <Link
            href="https://x.com/ZcashNames/status/2052521176841494552?s=20"
            style={{ color: "var(--fg-body)" }}
          >
            Read the <span className="underline">thread on X</span>
          </Link>
          .
        </p>
      </header>

      <BetaV2ApplicationForm brandSlug={brandSlug} />
    </div>
  );
}
