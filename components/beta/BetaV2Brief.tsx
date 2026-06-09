import Link from "next/link";
import { BRAND } from "@/lib/zns/brand";

export const BETA_V2_SECTIONS: { id: string; label: string }[] = [
  { id: "whats-new", label: "What's New" },
  { id: "reporting-rewards", label: "Reporting and Rewards" },
  { id: "you-should-know", label: "Before You Test" },
  { id: "ready", label: "Apply for Beta Access" },
  { id: "resources", label: "Resources" },
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

const summaryStyle: React.CSSProperties = {
  color: "var(--fg-heading)",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: 600,
  marginBottom: "0.75rem",
};

function communityLinks() {
  return BRAND.socials.filter((social) =>
    social.label === "Signal" || social.label === "Discord" || social.label === "Telegram"
  );
}
export default function BetaV2Brief() {
  const community = communityLinks();

  return (
    <article className="max-w-2xl">
      <section id="whats-new">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 [[data-theme=light]_&]:bg-[var(--color-accent-green)] [[data-theme=light]_&]:text-white [[data-theme=monochrome]_&]:bg-[var(--announce-bar-bg)] [[data-theme=monochrome]_&]:text-[var(--announce-bar-fg)]"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Mainnet Beta
        </span>
        <h2 style={{ ...h2, marginTop: 0 }}>What's New</h2>
        <p style={p}>
          Zcash Names resolve to Zcash shielded addresses in supported wallets, so users can send
          to names instead of copying and pasting addresses or scanning QRs.
        </p>
        <p style={p}>
          This feature, and more, are made possible because supported wallets integrated the Zcash
          Name Service (ZNS) SDK.
        </p>
        <p style={p}>
          In this beta, you can test buying, selling, and using ZcashNames inside supported wallets.
          Testing uses public Zcash mainnet, so transactions are real. Beta prices are 1% of planned
          launch pricing.
        </p>
        <p style={p}>
          We are testing the full in-wallet experience. We want to make sure names resolve correctly,
          sends reach the right shielded addresses, sales complete cleanly, and proceeds arrive in the
          correct wallet.
        </p>
        <p style={p}>
          There are several wallets available across mobile, desktop, and browser environments.
          Each integration supports different features and workflows. For the full feature matrix,
          see <Link href="/beta/wallets" style={linkStyle}>/beta/wallets</Link>.
        </p>
      </section>

      <hr style={divider} />

      <section id="reporting-rewards">
        <h2 style={h2}>Reporting and Rewards</h2>
        <p style={p}>
          We are looking for two categories of feedback: wallet experience issues and SDK behavior
          issues. Wallet experience issues include purchases, listings, sale proceeds, outdated sale
          statuses, failed payments, conflicting purchases, and unclear UX. SDK behavior issues
          include resolver accuracy, edge cases, latency, indexing, caching, and differences between
          wallet behavior and JSON-RPC behavior.
        </p>
        <details>
          <summary style={summaryStyle}>For developers</summary>
          <p style={p}>
            Developer-focused testing can go deeper on resolver accuracy, edge cases, latency,
            indexing, caching, and differences between wallet behavior and JSON-RPC behavior.
          </p>
        </details>
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
        <p style={p}>
          The highest priority bugs are funds sent to the wrong place, names resolving to the wrong
          address, sale proceeds not arriving, old sale status still showing, and purchase conflicts.
        </p>
        <p style={p}>
          Rewards go to the first person to report an issue we can reproduce and confirm through the
          feedback panel. Minor confirmed bugs receive 0.05 ZEC. Critical confirmed bugs
          receive 0.5 ZEC.
        </p>
        <p style={p}>
          Duplicate, incomplete, or unverifiable reports may not qualify.
        </p>
      </section>

      <hr style={divider} />

      <section id="you-should-know">
        <h2 style={h2}>Before You Test</h2>
        <p style={p}>
          Beta names are temporary. They will not carry over to Early Access. Beta prices are 1% of
          planned launch pricing. Claim and listing fees may be refundable during testing if requested
          through the feedback panel.
        </p>
        <p style={p}>
          We will only contact you about this beta round.
        </p>
        <p style={p}>
          We will never ask you for your wallet passphrase.
        </p>
        <p style={p}>
          Join Signal, Discord, or Telegram for questions and community discussion. Submit bug
          reports through the feedback panel, not chat.
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
        <h2 style={h2}>Apply for Beta Access</h2>
        <p style={p}>
          <Link href="/beta/apply" style={linkStyle}>Apply for access</Link>. Selected testers will
          receive an access code and setup instructions through their preferred contact method.
        </p>
      </section>

      <hr style={divider} />

      <section id="resources">
        <h2 style={h2}>Resources</h2>
        <ul className="list-disc pl-5">
          <li style={li}>
            <Link href="/beta/instructions" style={linkStyle}>Beta instructions</Link>
          </li>
          <li style={li}>
            <Link href="/docs/zns-developer-guide" style={linkStyle}>Developer guide</Link>
          </li>
          <li style={li}>
            <a href="https://github.com/zcashme/ZNS" target="_blank" rel="noreferrer" style={linkStyle}>
              Code
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
