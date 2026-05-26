/**
 * Static informational content for the beta v2 brief page. Renders sections covering
 * what's being tested, focus areas, expectations, timeline, and contact channels.
 * Exports BETA_V2_SECTIONS — a structured section manifest consumed by BetaV2Toc
 * for scroll-spy sidebar navigation.
 */
import Link from "next/link";
import { BRAND } from "@/lib/zns/brand";

export const BETA_V2_SECTIONS: { id: string; label: string }[] = [
  { id: "intro", label: "Welcome" },
  { id: "get-started", label: "Get Started" },
  { id: "how-it-works", label: "How It Works" },
  { id: "structure", label: "Beta Structure" },
  { id: "what-to-test", label: "What to Test" },
  { id: "submitting-feedback", label: "The Feedback Panel" },
  { id: "before-bug", label: "Confidentiality" },
  { id: "bounties", label: "Bug Bounties" },
  { id: "what-you-need", label: "What You Need" },
  { id: "timeline", label: "Timeline" },
  { id: "contacts", label: "Get In Touch" },
  { id: "appendix", label: "Appendix: Links" },
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

const inlineCode: React.CSSProperties = {
  background: "var(--color-raised)",
  border: "1px solid var(--border-muted)",
  borderRadius: "0.35rem",
  padding: "0.1rem 0.4rem",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.86em",
};

export default function BetaV2Brief() {
  const featuredChannels = BRAND.socials.filter(
    (social) => social.label === "Signal" || social.label === "Discord",
  );

  return (
    <article className="max-w-2xl">
      <section id="intro">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Beta
        </span>
        <p style={p}>
          Welcome back. The first ZcashNames closed beta proved the core flows: claiming names,
          updating them, listing or delisting them, and releasing them back into the wild.
        </p>
        <p style={p}>
          This next round is about what comes after that. We are testing wallet-connected behavior:
          resolving names to shielded addresses in wallets, buying and selling names end to end,
          receiving proceeds, and sending ZEC to names instead of raw addresses.
        </p>
        <p style={p}>
          Edge Wallet is already using the SDK to resolve the Zcash namespace, which makes this round the first serious pass over the full wallet-facing experience.
        </p>

        <div
          className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl p-4"
          style={{
            background: "var(--color-raised)",
            border: "1px solid var(--border-muted)",
          }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
              Want in?
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}>
              Apply for the next beta cohort and tell us whether you want to test wallet flows, SDK integration work, or both.
            </p>
          </div>
          <Link
            href="/beta/apply"
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
              textDecoration: "none",
            }}
          >
            Apply to the beta
          </Link>
        </div>
      </section>

      <hr style={divider} />

      <section id="get-started">
        <h2 style={h2}>Get Started</h2>
        <ol className="list-decimal pl-5">
          <li style={li}>Apply at <Link href="/beta/apply" className="underline" style={{ color: "var(--fg-heading)" }}>/beta/apply</Link>.</li>
          <li style={li}>If selected, you will receive an invite and passcode through your preferred contact method.</li>
          <li style={li}>Use that passcode to unlock the beta when your access window opens.</li>
          <li style={li}>Work through the wallet and SDK flows below, then report what breaks, what feels sharp, and what still confuses real users.</li>
        </ol>
      </section>

      <hr style={divider} />

      <section id="how-it-works">
        <h2 style={h2}>How It Works</h2>
        <p style={p}>
          ZcashNames maps short names like <code style={inlineCode}>pacu.zcash</code> to real
          Zcash identities and addresses. In the first closed beta, that meant proving the namespace
          itself worked. In this round, the goal is proving that the namespace behaves correctly once
          it is embedded inside wallets and sale flows.
        </p>
        <p style={p}>
          Edge Wallet is the flagship integration for this phase. If the wallet can resolve names,
          route ZEC to them, and surface sale flows correctly, the namespace becomes meaningfully usable outside the demo environment.
        </p>
      </section>

      <hr style={divider} />

      <section id="structure">
        <h2 style={h2}>Beta Structure</h2>
        <ul className="list-disc pl-5">
          <li style={li}>Closed beta one validated the core protocol operations.</li>
          <li style={li}>Beta two validates wallet resolution, wallet-side UX, and sale proceeds behavior.</li>
          <li style={li}>We still want both user-flow testers and SDK-minded testers in the cohort.</li>
          <li style={li}>Priority goes to applicants who can give precise reproduction notes, environment details, and repeatable results.</li>
        </ul>
      </section>

      <hr style={divider} />

      <section id="what-to-test">
        <h2 style={h2}>What to Test</h2>
        <p style={p}>This round centers on the flows that were not complete in the first beta:</p>
        <ul className="list-disc pl-5">
          <li style={li}>Resolve ZcashNames entries to shielded addresses in Edge Wallet.</li>
          <li style={li}>Buy a name through the wallet-connected flow.</li>
          <li style={li}>List a name for sale and confirm the listing state is correct.</li>
          <li style={li}>Complete a sale and verify the transfer finishes cleanly.</li>
          <li style={li}>Receive proceeds from the transaction in the correct wallet.</li>
          <li style={li}>Send ZEC directly to names and confirm the resolution target is correct.</li>
        </ul>
        <p style={p}>
          SDK testers should focus on resolution behavior, identity verification, edge cases, and any differences between wallet output and raw JSON-RPC behavior.
        </p>
      </section>

      <hr style={divider} />

      <section id="submitting-feedback">
        <h2 style={h2}>The Feedback Panel</h2>
        <p style={p}>
          The reporting expectation stays the same: when you are invited in, document the wallet, version, operating system, network, and exact steps you took. Reports that include the expected result, the actual result, and any txid or screenshots are the most useful.
        </p>
        <p style={p}>
          For this round, we care as much about confusing UX and mismatched wallet behavior as we do about outright bugs. If a flow technically works but a normal user would misread it, report that too.
        </p>
      </section>

      <hr style={divider} />

      <section id="before-bug">
        <h2 style={h2}>Confidentiality</h2>
        <p style={p}>
          Treat invite codes, unreleased wallet behavior, and any incomplete sale or proceeds flows as beta-only information until we say otherwise. Public bug reports are fine after coordination, but not before we have had a chance to reproduce and classify them.
        </p>
      </section>

      <hr style={divider} />

      <section id="bounties">
        <h2 style={h2}>Bug Bounties</h2>
        <p style={p}>
          We are especially interested in bugs that misroute value, misreport sale state, fail to deliver proceeds, or resolve names incorrectly. Clear reports that isolate those failures will be prioritized for follow-up and may qualify for bounty handling where applicable.
        </p>
      </section>

      <hr style={divider} />

      <section id="what-you-need">
        <h2 style={h2}>What You Need</h2>
        <ul className="list-disc pl-5">
          <li style={li}>A reliable way to test Edge Wallet behavior.</li>
          <li style={li}>Enough familiarity with Zcash to describe shielded-address expectations accurately.</li>
          <li style={li}>If you are applying as an SDK tester, enough development context to compare wallet behavior against the SDK or JSON-RPC directly.</li>
        </ul>
      </section>

      <hr style={divider} />

      <section id="timeline">
        <h2 style={h2}>Timeline</h2>
        <p style={p}>
          Applications are open now. Invites will go out in batches, and the first people in will shape how aggressively we expand the cohort. If you are invited later, that does not mean we are less interested; it usually means we are pacing access against fixes.
        </p>
      </section>

      <hr style={divider} />

      <section id="contacts">
        <h2 style={h2}>Get In Touch</h2>
        <p style={p}>
          Use the form to tell us how to reach you. If you need to contact us outside the application flow, these are the channels we watch most closely during beta:
        </p>
        <ul className="list-disc pl-5">
          {featuredChannels.map((social) => (
            <li key={social.href} style={li}>
              <a href={social.href} target="_blank" rel="noreferrer" style={{ color: "var(--fg-heading)", textDecoration: "underline" }}>
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <hr style={divider} />

      <section id="appendix">
        <h2 style={h2}>Appendix: Links</h2>
        <ul className="list-disc pl-5">
          <li style={li}><Link href="/beta/apply" className="underline" style={{ color: "var(--fg-heading)" }}>Beta application</Link></li>
          <li style={li}><Link href="/docs/zns-developer-guide" className="underline" style={{ color: "var(--fg-heading)" }}>Developer guide</Link></li>
          <li style={li}><a href="https://github.com/zcashme/ZNS" target="_blank" rel="noreferrer" style={{ color: "var(--fg-heading)", textDecoration: "underline" }}>Indexer and protocol code</a></li>
        </ul>
      </section>
    </article>
  );
}
