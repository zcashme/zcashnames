import Link from "next/link";
import WalletBrandLogo from "@/components/wallets/WalletBrandLogo";
import WalletFeatureMatrix from "@/components/wallets/WalletFeatureMatrix";
import { BRAND } from "@/lib/zns/brand";
import {
  deviceLabel,
  getWalletBrand,
  getWalletVariantsForBrand,
  subcategoryLabel,
  walletVariantLabel,
  type WalletBrand,
  type WalletBrandSlug,
  type WalletVariant,
} from "@/lib/wallets/catalog";

export const BETA_WALLET_BRIEF_SECTIONS = [
  { id: "whats-new", label: "What's New" },
  { id: "reporting-rewards", label: "Reporting and Rewards" },
  { id: "you-should-know", label: "You Should Know" },
  { id: "ready", label: "Ready? Get Set" },
  { id: "read-more", label: "Read more" },
];

const h2: React.CSSProperties = {
  color: "var(--fg-heading)",
  fontSize: "1.4rem",
  fontWeight: 700,
  marginTop: "2.5rem",
  marginBottom: "0.85rem",
  scrollMarginTop: "5rem",
};

const p: React.CSSProperties = {
  color: "var(--fg-body)",
  lineHeight: 1.75,
  fontSize: "0.97rem",
  marginBottom: "0.75rem",
};

const li: React.CSSProperties = {
  ...p,
  marginBottom: "0.35rem",
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--faq-border)",
  marginTop: "2.5rem",
  marginBottom: 0,
  opacity: 0.6,
};

const linkStyle: React.CSSProperties = {
  color: "var(--fg-heading)",
  textDecoration: "underline",
};

function communityLinks() {
  return BRAND.socials.filter((social) =>
    social.label === "Signal" || social.label === "Discord" || social.label === "Telegram"
  );
}

function platformList(variants: readonly WalletVariant[]): string {
  const platforms = Array.from(
    new Set(variants.map((variant) => `${deviceLabel(variant.device)} ${subcategoryLabel(variant.subcategory)}`)),
  );
  return platforms.join(", ");
}

function featureSummary(variants: readonly WalletVariant[]): string {
  const features = [
    variants.some((variant) => variant.features.resolveName) ? "name resolution" : null,
    variants.some((variant) => variant.features.nameActions.buy) ? "name purchases" : null,
    variants.some((variant) => variant.features.nameActions.list) ? "listings" : null,
    variants.some((variant) => variant.features.viewCollection) ? "collection views" : null,
    variants.some((variant) => variant.features.receiveUaddr || variant.features.receiveTaddr)
      ? "receive flows"
      : null,
    variants.some((variant) => variant.features.scanURI || variant.features.tapURI || variant.features.pasteURI)
      ? "URI handling"
      : null,
  ].filter(Boolean);

  if (features.length === 0) return "its platform-specific ZNS behavior";
  if (features.length === 1) return features[0] ?? "its platform-specific ZNS behavior";
  return `${features.slice(0, -1).join(", ")} and ${features[features.length - 1]}`;
}

function brandedReadMoreLinks(brand: WalletBrand) {
  return [
    brand.supportGuideUrl ? { label: `${brand.displayName} support guide`, href: brand.supportGuideUrl } : null,
    brand.announcementUrl ? { label: `${brand.displayName} x ZcashNames announcement`, href: brand.announcementUrl } : null,
    brand.websiteUrl ? { label: `${brand.displayName} website`, href: brand.websiteUrl } : null,
    brand.liveDiscussionUrl ? { label: `${brand.displayName} x ZcashNames live discussion`, href: brand.liveDiscussionUrl } : null,
    brand.demoUrl ? { label: `${brand.displayName} demo`, href: brand.demoUrl } : null,
    ...(brand.socials ?? []).map((social) => ({ label: `${brand.displayName} on ${social.label}`, href: social.href })),
  ].filter((link): link is { label: string; href: string } => !!link);
}

export default function BetaWalletBrief({ brandSlug }: { brandSlug: WalletBrandSlug }) {
  const brand = getWalletBrand(brandSlug);
  const variants = getWalletVariantsForBrand(brandSlug);
  const community = communityLinks();

  if (!brand) return null;

  const readMoreLinks = brandedReadMoreLinks(brand);
  const getStartedUrl = brand.downloadUrl ?? brand.demoUrl ?? brand.websiteUrl;

  return (
    <article className="max-w-3xl">
      <section id="whats-new">
        <div className="mb-5">
          <WalletBrandLogo brand={brand} />
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Beta 2
        </span>
        <h2 style={{ ...h2, marginTop: 0 }}>What's New</h2>
        <p style={p}>
          In this round, you will be buying and selling names, viewing your personal collection, and
          sending ZEC to names inside wallets that support ZNS. Everything will be tested on public
          mainnet with beta prices set to 1/100th of planned pricing.
        </p>
        <p style={p}>
          The beta also focuses on real wallet flows. We want to make sure names resolve correctly,
          sends reach the right shielded addresses, sales complete cleanly, and proceeds arrive in
          the correct wallet.
        </p>
        {brand.partner ? (
          <p style={p}>
            That's why ZcashNames is partnering with {brand.displayName} to offer{" "}
            {variants.map((variant) => variant.variantId).join(", ")} on {platformList(variants)}.
            It is especially useful for testing {featureSummary(variants)}.
          </p>
        ) : (
          <p style={p}>
            {brand.displayName} is included in the beta plan as{" "}
            {variants.map((variant) => variant.variantId).join(", ")} on {platformList(variants)}.
            It is especially useful for testing {featureSummary(variants)}.
          </p>
        )}
        <WalletFeatureMatrix variants={variants} />
      </section>

      <hr style={divider} />

      <section id="reporting-rewards">
        <h2 style={h2}>Reporting and Rewards</h2>
        <p style={p}>
          We are looking for both wallet testers and SDK testers. Wallet testing includes purchases,
          listings, proceeds, stale states, failed payments, conflicting purchases, and confusing UX.
          SDK testing includes resolver correctness, edge cases, latency, indexing, caching, and
          wallet vs JSON-RPC behavior.
        </p>
        <p style={p}>
          A feedback panel is available on the right side of the interface. It can be expanded,
          collapsed, or opened in a separate window. All bug reports, UX feedback, screenshots,
          txids, and reproduction details should be submitted there.
        </p>
        <p style={p}>
          Good reports include your wallet version, platform, network, reproduction steps, expected
          result, actual result, txids, and screenshots when possible.
        </p>
        <p style={p}>
          The highest priority bugs are value misrouting, incorrect resolution targets, broken
          proceeds, stale sale state, and purchase conflicts.
        </p>
        <p style={p}>
          Rewards go to the first person to report a confirmed reproducible issue through the
          feedback panel. Minor confirmed bugs may receive 0.05 ZEC. Critical confirmed bugs may
          receive 0.5 ZEC.
        </p>
      </section>

      <hr style={divider} />

      <section id="you-should-know">
        <h2 style={h2}>You Should Know</h2>
        <p style={p}>
          All testing will be performed on public mainnet. Beta names are temporary and will reset
          before Early Access. Prices during beta are heavily discounted at 1/100th of planned
          pricing. Claim and listing fees can also be refunded on request during testing.
        </p>
        <p style={p}>
          We will only contact you about this beta round. We will never ask you for your wallet
          passphrase.
        </p>
        <p style={p}>
          Join us on Signal, Discord, or Telegram to meet the community, post questions, and leave
          comments while the beta is live.
        </p>
        <ul className="list-disc pl-5">
          {community.map((social) => (
            <li key={social.href} style={li}>
              <a href={social.href} target="_blank" rel="noreferrer" style={linkStyle}>
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <hr style={divider} />

      <section id="ready">
        <h2 style={h2}>Ready? Get Set</h2>
        <p style={p}>
          <Link href={`/beta/apply/${brand.slug}`} style={linkStyle}>Apply today</Link>. If
          selected, you will receive an access code and further instructions through your preferred
          contact method.
        </p>
        {getStartedUrl && (
          <p style={p}>
            <a href={getStartedUrl} target="_blank" rel="noreferrer" style={linkStyle}>
              Download {brand.displayName} and get a feel for it today.
            </a>
          </p>
        )}
      </section>

      <hr style={divider} />

      <section id="read-more">
        <h2 style={h2}>Read more</h2>
        <ul className="list-disc pl-5">
          {variants.map((variant) => (
            <li key={variant.variantId} style={li}>
              {walletVariantLabel(variant)}
            </li>
          ))}
          {readMoreLinks.map((link) => (
            <li key={link.href} style={li}>
              <a href={link.href} target="_blank" rel="noreferrer" style={linkStyle}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
