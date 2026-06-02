import Link from "next/link";
import WalletBrandLogo from "@/components/wallets/WalletBrandLogo";
import WalletFeatureMatrix from "@/components/wallets/WalletFeatureMatrix";
import { BRAND } from "@/lib/zns/brand";
import {
  getWalletBrand,
  getWalletVariantsForBrand,
  subcategoryLabel,
  type WalletBrand,
  type WalletBrandDownloadBadge,
  type WalletBrandSlug,
  type WalletVariant,
} from "@/lib/wallets/catalog";

const BASE_BRIEF_SECTIONS = [
  { id: "whats-new", label: "What's New" },
  { id: "feature", label: "Wallet Features" },
  { id: "reporting", label: "Reporting" },
  { id: "rewards", label: "Rewards" },
  { id: "you-should-know", label: "Before You Test" },
  { id: "ready", label: "Apply for Beta Access" },
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

const linkStyle: React.CSSProperties = {
  color: "var(--fg-heading)",
  textDecoration: "underline",
};

const h3: React.CSSProperties = {
  color: "var(--fg-heading)",
  fontSize: "1.08rem",
  fontWeight: 700,
  marginTop: 0,
  marginBottom: 0,
};

const sectionHeaderRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  marginTop: "2.5rem",
  marginBottom: "0.85rem",
};

const sectionHeaderRule: React.CSSProperties = {
  height: 1,
  flex: 1,
  background: "var(--faq-border)",
  opacity: 0.6,
};

const headerBadgeStyle: React.CSSProperties = {
  background: "var(--announce-bar-bg)",
  color: "var(--announce-bar-fg)",
};

function communityLinks() {
  return BRAND.socials.filter((social) =>
    social.label === "Signal" || social.label === "Discord" || social.label === "Telegram"
  );
}

function communityHref(
  links: readonly { label: string; href: string }[],
  label: "Signal" | "Discord" | "Telegram",
) {
  return links.find((link) => link.label === label)?.href ?? "#";
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function platformSummary(variants: readonly WalletVariant[]): string {
  const platforms = Array.from(new Set(variants.map((variant) => subcategoryLabel(variant.subcategory))));
  return joinLabels(platforms) || "its supported platforms";
}

function brandDownloadBadges(brand: WalletBrand): readonly WalletBrandDownloadBadge[] {
  return brand.downloadBadges ?? [];
}

function brandResourceLinks(brand: WalletBrand) {
  return [
    brand.supportGuideUrl ? { label: `${brand.displayName} support guide`, href: brand.supportGuideUrl } : null,
    brand.announcementUrl ? { label: `Official ${brand.displayName} announcement`, href: brand.announcementUrl } : null,
    brand.websiteUrl ? { label: `${brand.displayName} website`, href: brand.websiteUrl } : null,
    brand.liveDiscussionUrl ? { label: `${brand.displayName} live discussion`, href: brand.liveDiscussionUrl } : null,
    brand.demoUrl ? { label: `${brand.displayName} demo`, href: brand.demoUrl } : null,
  ].filter((link): link is { label: string; href: string } => !!link);
}

export function getBetaWalletBriefSections(brand: WalletBrand) {
  const sections = BASE_BRIEF_SECTIONS.map((section) =>
    section.id === "feature"
      ? { ...section, label: `${brand.displayName} Features` }
      : section,
  );

  if (brandResourceLinks(brand).length > 0) {
    sections.push({ id: "resources", label: "Resources" });
  }

  return sections;
}

function SectionTitle({
  id,
  title,
  first = false,
}: {
  id: string;
  title: string;
  first?: boolean;
}) {
  return (
    <div style={{ ...sectionHeaderRow, marginTop: first ? 0 : "2.5rem" }}>
      <h2 id={id} style={{ ...h2, marginTop: 0, marginBottom: 0 }}>
        {title}
      </h2>
      <div style={sectionHeaderRule} aria-hidden="true" />
    </div>
  );
}

function SubsectionTitle({ title }: { title: string }) {
  return (
    <div style={{ ...sectionHeaderRow, marginTop: "1.75rem", marginBottom: "0.75rem" }}>
      <h3 style={h3}>{title}</h3>
      <div style={sectionHeaderRule} aria-hidden="true" />
    </div>
  );
}

export default function BetaWalletBrief({ brandSlug }: { brandSlug: WalletBrandSlug }) {
  const brand = getWalletBrand(brandSlug);
  const variants = getWalletVariantsForBrand(brandSlug);
  const community = communityLinks();

  if (!brand) return null;

  const downloads = brandDownloadBadges(brand);
  const resourceLinks = brandResourceLinks(brand);
  const platforms = platformSummary(variants);
  const signalHref = communityHref(community, "Signal");
  const discordHref = communityHref(community, "Discord");
  const telegramHref = communityHref(community, "Telegram");

  return (
    <article className="max-w-3xl">
      <section>
        <div
          style={{
            ...sectionHeaderRow,
            marginTop: 0,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h2 id="whats-new" style={{ ...h2, marginTop: 0, marginBottom: 0 }}>
            ZNS x {brand.displayName}
          </h2>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold leading-none"
            style={headerBadgeStyle}
          >
            Mainnet Beta
          </span>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold leading-none"
            style={headerBadgeStyle}
          >
            Earn ZEC
          </span>
          <div style={sectionHeaderRule} aria-hidden="true" />
        </div>
        <p style={p}>
          Zcash Names resolve to Zcash shielded addresses in {brand.displayName}, so users can send
          ZEC to names instead of copying and pasting long addresses or scanning unknown QRs.
        </p>
        <p style={p}>
          This feature, and many more, are made possible because {brand.displayName} has integrated
          Zcash Name Service (ZNS).
        </p>
        <p style={p}>
          Now, you can test buying, selling, and using Zcash Names with {brand.displayName} for{" "}
          {platforms}.
        </p>
        <p style={p}>
          In fact, we want you to test the full in-wallet experience during our upcoming beta to
          make sure names resolve correctly, ZEC reaches all the right places, name sales complete
          cleanly, and proceeds arrive as expected.
        </p>
      </section>

      <section>
        <SectionTitle id="feature" title={`${brand.displayName} Features`} />
        <p style={p}>
          The table below lists all ZNS SDK features as rows. Each column shows whether that app
          supports the feature during beta. Support may vary by app, platform, or device, and may
          change in later releases. You should request features that you want to see in the next
          release of {brand.displayName} through the feedback panel.
        </p>
        <WalletFeatureMatrix variants={variants} />
      </section>

      <section>
        <SectionTitle id="reporting" title="Reporting" />
        <p style={p}>
          We are looking for two categories of feedback: wallet experience and SDK behavior. Wallet
          issues include purchases, listings, sale proceeds, outdated sale statuses, failed
          payments, conflicting purchases, and unclear UX. SDK issues include resolver accuracy,
          edge cases, latency, indexing, caching, and differences between wallet behavior and
          JSON-RPC behavior.
        </p>
        <p style={p}>
          Use the feedback panel to report anything you encounter during testing. It will be
          available on the right side of the user interface. It can be expanded, collapsed, or
          opened in a separate window. All bug reports, UX feedback, screenshots, txids, and
          reproduction details should be submitted there.
        </p>
        <p style={p}>
          Good reports include what happened, what you expected, steps to reproduce it, screenshots,
          txids, wallet version, and platform.
        </p>
      </section>

      <section>
        <SectionTitle id="rewards" title="Rewards" />
        <p style={p}>
          Rewards go to the first person to report a reproducible issue through the feedback panel.
          Minor confirmed bugs receive 0.05 ZEC. Critical confirmed bugs receive 0.5 ZEC.
        </p>
        <p style={p}>
          The highest priority bugs are funds sent to the wrong place, names resolving to the wrong
          address, sale proceeds not arriving, old sale status still showing, and purchase conflicts.
        </p>
        <p style={p}>
          Duplicate, incomplete, or unverifiable reports may not qualify.
        </p>
      </section>

      <section>
        <SectionTitle id="you-should-know" title="Before You Test" />
        <p style={p}>
          Testing uses public Zcash mainnet, so transactions are real. Beta prices will be set at
          1% of planned launch pricing. However, the names you use during beta testing are
          temporary and will not carry over after the beta.
        </p>
        <p style={p}>
          Claim and listing fees can be refunded during testing. To request a refund, submit the
          request through the feedback panel.
        </p>
        {downloads.length > 0 && (
          <div>
            <SubsectionTitle title={`Download ${brand.displayName}`} />
            <div className="flex flex-wrap items-center gap-3">
              {downloads.map((badge) => (
                <a
                  key={badge.href}
                  href={badge.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={badge.alt}
                  title={badge.label}
                  className="inline-flex overflow-hidden rounded-[8px]"
                  style={{
                    background: "#3a3a3a",
                    border: "1px solid rgba(255,255,255,0.28)",
                    boxShadow: "none",
                    isolation: "isolate",
                  }}
                >
                  <img
                    src={badge.src}
                    alt={badge.alt}
                    className="block h-14 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                    style={{ filter: "none", mixBlendMode: "normal" }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}
        <SubsectionTitle title="Security and Support" />
        <p style={p}>
          We will only contact you about this beta round. We will never ask for your wallet
          passphrase.
        </p>
        <p style={p}>
          Join{" "}
          <a href={signalHref} target="_blank" rel="noreferrer" style={linkStyle}>
            Signal
          </a>
          ,{" "}
          <a href={discordHref} target="_blank" rel="noreferrer" style={linkStyle}>
            Discord
          </a>
          , or{" "}
          <a href={telegramHref} target="_blank" rel="noreferrer" style={linkStyle}>
            Telegram
          </a>{" "}
          for questions and community discussion. To submit bug reports, use the feedback panel,
          not chats.
        </p>
      </section>

      <section id="ready">
        <SectionTitle id="ready-heading" title="Apply for Beta Access" />
        <p style={{ ...p, marginBottom: "1.5rem" }}>
          Selected testers will receive an access code and setup instructions through their
          preferred contact method.
        </p>
        <Link
          href={`/beta/apply/${brand.slug}`}
          className="mb-6 inline-flex items-center justify-center gap-3 rounded-full border border-[var(--announce-bar-bg)] bg-transparent px-5 py-3 text-sm font-semibold text-[var(--fg-heading)] transition-colors hover:border-[var(--announce-bar-bg)] hover:bg-[var(--announce-bar-bg)] hover:text-[var(--announce-bar-fg)]"
          style={{
            textDecoration: "none",
          }}
        >
          {brand.appIcon ? (
            <img
              src={brand.appIcon.src}
              alt={brand.appIcon.alt}
              className={brand.slug === "zingo"
                ? "h-10 w-10 rounded-[8px] object-contain"
                : "h-6 w-6 rounded-[8px] object-contain"}
            />
          ) : (
            <span
              className={brand.slug === "zingo"
                ? "flex h-10 w-10 items-center justify-center overflow-hidden rounded-[8px]"
                : "flex h-6 w-6 items-center justify-center overflow-hidden rounded-[8px]"}
            >
              <WalletBrandLogo brand={brand} />
            </span>
          )}
          <span>Access Beta with {brand.displayName}</span>
        </Link>
      </section>

      {resourceLinks.length > 0 && (
        <section>
          <SectionTitle id="resources" title="Resources" />
          <ul className="list-disc pl-5">
            {resourceLinks.map((link) => (
              <li key={link.href} style={li}>
                <a href={link.href} target="_blank" rel="noreferrer" style={linkStyle}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
