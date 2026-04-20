import Link from "next/link";
import { BRAND } from "@/lib/zns/brand";
import {
  InlineCollapseChevron,
  InlineNetworkToggle,
  InlinePopoutIcon,
  InlinePreview,
  InlineReadMeBtn,
  InlineReportingBanner,
  InlineSubmitFeedbackBtn,
} from "./BriefInline";

const SOCIAL_PATHS: Record<string, string> = {
  "X / Twitter":
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  Discord:
    "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.227-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  Telegram:
    "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  Signal:
    "M12 1.5C6.202 1.5 1.5 6.202 1.5 12c0 1.93.52 3.735 1.43 5.29L1.5 22.5l5.21-1.43A10.457 10.457 0 0 0 12 22.5c5.798 0 10.5-4.702 10.5-10.5S17.798 1.5 12 1.5zm0 2.1a8.4 8.4 0 1 1 0 16.8 8.357 8.357 0 0 1-4.29-1.178l-.308-.186-3.188.875.875-3.188-.186-.308A8.357 8.357 0 0 1 3.6 12 8.4 8.4 0 0 1 12 3.6z",
};

// Sections — id is the anchor used by BetaToc.
export const BETA_SECTIONS: { id: string; label: string }[] = [
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

const h3: React.CSSProperties = {
  color: "var(--fg-heading)",
  fontSize: "1.05rem",
  fontWeight: 600,
  marginTop: "1.4rem",
  marginBottom: "0.45rem",
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

export default function BetaBrief() {
  const featuredChannels = BRAND.socials.filter(
    (s) => s.label === "Signal" || s.label === "Discord",
  );

  return (
    <article className="max-w-2xl">
      {/* Intro */}
      <section id="intro">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Closed Beta
        </span>
        <p style={p}>
          Welcome. Zcash Name Service (ZNS) is a name registration protocol on Zcash. You
          register a short name (e.g. <code style={inlineCode}>pacu.zcash</code>,{" "}
          <code style={inlineCode}>nullc0py.zcash</code>) and it resolves to your
          unified address.
        </p>

        {/* Apply CTA — for visitors who landed here without an invite */}
        <div
          className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl p-4"
          style={{
            background: "var(--color-raised)",
            border: "1px solid var(--border-muted)",
          }}
        >
          <div className="flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--fg-heading)" }}
            >
              Not in the beta yet?
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}
            >
              Apply for a spot &mdash; we&rsquo;ll review and reach out via your
              preferred contact if there&rsquo;s room.
            </p>
          </div>
          <Link
            href="/closedbeta/apply"
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

      {/* Get Started */}
      <section id="get-started">
        <h2 style={h2}>Get Started</h2>
        <p style={p}>
          You can start testing right away:
        </p>
        <ol className="list-decimal pl-5">
          <li style={li}>
            Go to the <Link href="/" className="underline" style={{ color: "var(--fg-heading)" }}>home page</Link>.
          </li>
          <li style={li}>
            Click <strong>Mainnet</strong> or <strong>Testnet</strong> in the header
            bar.
            <InlinePreview>
              <InlineNetworkToggle />
            </InlinePreview>
          </li>
          <li style={li}>
            When the password modal appears, enter the <strong>invite code I sent
            you</strong>. The same code unlocks both networks.
          </li>
          <li style={li}>
            You&rsquo;ll see a small &ldquo;Welcome&rdquo; toast and a floating{" "}
            <strong>Submit Feedback</strong> button in the bottom-right corner.
            Click it to open the panel on the <strong>Checklist</strong>{" "}
            tab with your test plan. Reports filed from this session will be
            auto-attributed to you.
            <InlinePreview>
              <InlineSubmitFeedbackBtn />
            </InlinePreview>
          </li>
        </ol>
        <p style={{ ...p, marginTop: "1rem" }}>
          See the <a href="#submitting-feedback" style={{ color: "var(--fg-heading)", textDecoration: "underline" }}>The Feedback Panel</a>{" "}
          section below for how the panel works in detail. It&rsquo;s
          worth reading once before you start.
        </p>
      </section>

      <hr style={divider} />

      {/* How It Works */}
      <section id="how-it-works">
        <h2 style={h2}>How It Works</h2>
        <p style={p}>
          You send a shielded transaction to the ZNS registry address with a
          specifically formatted memo. The indexer picks it up, validates the
          admin signature, and updates the registry. Names are resolved with a simple
          JSON-RPC call to the indexer.
        </p>
        <p style={p}>
          For actions that require proving you own the name (update, list, delist,
          release), there is a one-time-password flow: you send a tiny verification
          transaction and receive a 6-digit code back in your memo. The One-Time Passcode (OTP) flow
          proves that you control the unified address linked to the registered name.
          You enter that OTP in the UI to authorize the action.
        </p>
      </section>

      <hr style={divider} />

      {/* Structure */}
      <section id="structure">
        <h2 style={h2}>Beta Structure</h2>

        <h3 style={h3}>Phase 1: Testnet</h3>
        <p style={p}>
          Try everything on testnet first where no real ZEC involved. I&rsquo;ll send you
          a passphrase to a wallet containing TAZ (Testnet Acquired Zcash). Testnet names registered during beta may persist after the
          program ends.
        </p>

        <h3 style={h3}>Phase 2: Mainnet</h3>
        <p style={p}>
          Try the same flows on mainnet but at 1/100th of full pricing. I&rsquo;ll send you a passphrase to a wallet containing {" "}
          <strong>0.125 ZEC</strong> at the start of this phase to cover
          your beta test costs with room to spare.
        </p>
        <p style={p}>
          One thing to be clear about upfront:{" "}
          <strong>mainnet beta names will be wiped when the program ends.</strong>{" "}
          This is a demo environment running at reduced prices. When beta closes,
           the registry resets and the pricing moves to full rates.
        </p>
        <p style={p}>
          The 0.125 ZEC is yours to use for testing. Whatever&rsquo;s left over when
          the program ends is yours to keep or donate.
        </p>
      </section>

      <hr style={divider} />

      {/* What to Test */}
      <section id="what-to-test">
        <h2 style={h2}>What to Test</h2>
        <p style={p}>
          The full beta test plan lives in the <strong>Checklist</strong> tab of the
          feedback panel. It contains every individual test you should run and helps you track progress.
        </p>
        <p style={p}>
        Record which wallet(s), version(s) and operating system(s) you&rsquo;ll
          be using as part of any report. 
        </p>
      </section>

      <hr style={divider} />

      {/* The Feedback Panel */}
      <section id="submitting-feedback">
        <h2 style={h2}>The Feedback Panel</h2>
        <p style={p}>
          Once you&rsquo;ve unlocked Mainnet or Testnet on the home page, a
          floating <strong>Submit Feedback</strong> button stays pinned to the
          bottom-right corner. Clicking it slides a panel in from the right side;
          the rest of the page reflows to fit, so you can keep using the site
          alongside it. The bottom-left chevron <InlineCollapseChevron /> collapses
          the panel; the floating button reappears.
        </p>

        <h3 style={h3}>The two tabs</h3>
        <p style={p}>
          The panel has two tabs and opens on <strong>Checklist</strong> the
          first time:
        </p>
        <ul className="list-disc pl-5">
          <li style={li}>
            <strong>Checklist</strong> &mdash; your test plan with checkboxes.
            Tick the box on the left to mark a task done. Click anywhere on the
            item title (or the arrow on the right) to set it as the active{" "}
            <strong>&ldquo;Reporting on&rdquo;</strong> target.
          </li>
          <li style={li}>
            <strong>Report</strong> &mdash; the form for submitting bug reports
            or comments. <strong>Every report must be tied to a checklist item.</strong>{" "}
            If you switch to Report without one selected, you&rsquo;ll see a red
            prompt to pick one first.
          </li>
        </ul>

        <h3 style={h3}>Checklist &rarr; Report flow</h3>
        <ul className="list-disc pl-5">
          <li style={li}>
            The active item shows a <strong>green outline</strong> in the
            Checklist tab and a <strong>green &ldquo;Reporting on&rdquo; banner</strong>{" "}
            above the Report tab.
            <InlinePreview>
              <InlineReportingBanner />
            </InlinePreview>
          </li>
          <li style={li}>
            <strong>Submitting a report does not check off the item.</strong>{" "}
            The checkbox is yours to mark when <em>you</em> consider that test
            complete. In fact, you might file several reports against one item
            before ticking it off.
          </li>
          <li style={li}>
            Wallet + version + OS is <strong>remembered across reports</strong>{" "}.  Fill it out once and you'll see it on each report until you change it.
          </li>
          <li style={li}>
            All fields are optional, but you need at least one of{" "}
            <em>wallet, steps, expected, actual, txid, notes</em>, or a
            screenshot before you can submit.
          </li>
          <li style={li}>
            After Submit, the form clears (wallet stays). You can immediately
            file another report against the same item.
          </li>
        </ul>

        <h3 style={h3}>General questions and comments</h3>
        <p style={p}>
          The first item on the checklist &mdash; <strong>&ldquo;General
          questions, comments, or anything else&rdquo;</strong> &mdash; is a
          catch-all. Use it for feedback that doesn&rsquo;t fit a specific test:
          questions, suggestions, UX gripes, anything.
        </p>

        <h3 style={h3}>Test in one window, write in another</h3>
        <p style={p}>
          The popout icon <InlinePopoutIcon /> at the top-left of the panel
          opens the same form in a small standalone window. Keep that on one
          side of your screen while you run the test on the other. It syncs the
          same cookie, same attribution, same wallet, same checklist progress
          live across tabs and windows.
        </p>

        <h3 style={h3}>Re-reading the instructions</h3>
        <p style={p}>
          The Read Me button <InlineReadMeBtn /> on the bottom-right
          of the panel opens these instructions in a new tab anytime you need to
          re-read the brief.
        </p>

        <p style={p}>
          For casual feedback or things you&rsquo;d rather discuss live, DM me
          on Signal or Discord (links below).
        </p>
      </section>

      <hr style={divider} />

      {/* Confidentiality */}
      <section id="before-bug">
        <h2 style={h2}>Confidentiality</h2>
        <p style={p}>
          Please don&rsquo;t share screenshots or disclose bugs publicly until
          they&rsquo;re fixed. Use the feedback panel or DM me directly.
        </p>
      </section>

      <hr style={divider} />

      {/* Bug Bounties */}
      <section id="bounties">
        <h2 style={h2}>Bug Bounties</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ color: "var(--fg-body)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--faq-border)" }}>
                <th className="py-2 pr-3 font-semibold" style={{ color: "var(--fg-heading)" }}>Severity</th>
                <th className="py-2 pr-3 font-semibold" style={{ color: "var(--fg-heading)" }}>Examples</th>
                <th className="py-2 font-semibold" style={{ color: "var(--fg-heading)" }}>Reward</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--faq-border)" }}>
                <td className="py-2 pr-3 font-semibold">High</td>
                <td className="py-2 pr-3">Funds at risk, invalid claim accepted, replay attack, core flow broken</td>
                <td className="py-2 font-semibold">1.0 ZEC</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-semibold">Low</td>
                <td className="py-2 pr-3">Edge case failure, OTP issue, wallet compat gap, wrong error, cosmetic</td>
                <td className="py-2 font-semibold">0.1 ZEC</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: "0.85rem" }}>
          First reporter gets the reward. The feedback form prompts you for
          everything I need.
        </p>
      </section>

      <hr style={divider} />

      {/* What You Need */}
      <section id="what-you-need">
        <h2 style={h2}>What You Need for User Flow</h2>
        <ul className="list-disc pl-5">
          <li style={li}>A Zcash wallet that supports unified addresses, custom memos and can display received memos (Zingo and Zodl both work)</li>
          <li style={li}>TAZ for testnet and ZEC for mainnet (I&rsquo;ll send passphrase to a pre-loaded wallet upon request)</li>
          <li style={li}>About one hour</li>
        </ul>
      </section>

      <hr style={divider} />

      {/* Timeline */}
      <section id="timeline">
        <h2 style={h2}>Timeline</h2>
        <p style={p}>
          Rough target: Phase 1 starts within the next two weeks once I confirm
          everyone is onboarded. I&rsquo;ll share the private repo, the endpoint URLs,
          and a testnet wallet passphrase once you confirm you&rsquo;re in.
        </p>
      </section>

      <hr style={divider} />

      {/* Contacts */}
      <section id="contacts">
        <h2 style={h2}>Get In Touch</h2>
        <p style={p}>
          For casual feedback, questions, or anything that doesn&rsquo;t fit the
          structured form, message me on Signal or Discord.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {featuredChannels.map(({ label, href }) => {
            const path = SOCIAL_PATHS[label];
            return (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "var(--color-raised)",
                  border: "1px solid var(--border-muted)",
                  color: "var(--fg-body)",
                  textDecoration: "none",
                }}
              >
                {path && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0" style={{ color: "var(--fg-muted)" }}>
                    <path d={path} />
                  </svg>
                )}
                {label}
              </a>
            );
          })}
        </div>
        <div className="mt-4 pt-4 flex flex-wrap items-center gap-4 text-xs" style={{ borderTop: "1px solid var(--faq-border)", color: "var(--fg-muted)" }}>
          <span>Other channels:</span>
          {BRAND.socials
            .filter((s) => s.label !== "Signal" && s.label !== "Discord")
            .map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                style={{ color: "var(--fg-body)" }}
              >
                {label}
              </a>
            ))}
        </div>
      </section>

      <hr style={divider} />

      {/* Appendix: Links */}
      <section id="appendix">
        <h2 style={h2}>Appendix: Links</h2>

        <h3 style={h3}>Documentation</h3>
        <ul className="list-disc pl-5">
          <li style={li}>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              ZcashNames Docs
            </a>{" "}
            &mdash; protocol overview, wallet integration guide, indexer setup,
            SDK reference, and the JSON-RPC API
          </li>
          <li style={li}>
            <a
              href="/docs/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              SDK Reference
            </a>{" "}
            &mdash; first-party language ports
          </li>
          <li style={li}>
            <a
              href="/docs/indexer/running"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              Running an Indexer
            </a>
          </li>
        </ul>

        <h3 style={h3}>GitHub Repositories</h3>
        <ul className="list-disc pl-5">
          <li style={li}>
            <a
              href="https://github.com/zcashme/zcashnames"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              zcashme/zcashnames
            </a>{" "}
            &mdash; the web app and docs site (this site)
          </li>
          <li style={li}>
            <a
              href="https://github.com/zcashme/ZNS"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              zcashme/ZNS
            </a>{" "}
            &mdash; the Rust indexer, the OpenRPC spec, and the SDK ports
          </li>
          <li style={li}>
            <a
              href="https://github.com/zcashme/directory"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              zcashme/directory
            </a>{" "}
            &mdash; reserved-names directory
          </li>
        </ul>

        <h3 style={h3}>Useful Endpoints</h3>
        <ul className="list-disc pl-5">
          <li style={li}>
            OpenRPC spec:{" "}
            <a
              href="https://github.com/zcashme/ZNS/blob/master/openrpc.json"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--fg-heading)" }}
            >
              openrpc.json
            </a>
          </li>
          <li style={li}>
            Testnet indexer:{" "}
            <code style={inlineCode}>https://light.zcash.me/zns-testnet</code>
          </li>
          <li style={li}>
            Mainnet test indexer:{" "}
            <code style={inlineCode}>https://light.zcash.me/zns-mainnet-test</code>
          </li>
        </ul>

        <h3 style={h3}>File issues</h3>
        <p style={p}>
          During the closed beta, please use the in-panel feedback form. After
          launch, public bug reports go to{" "}
          <a
            href="https://github.com/zcashme/zcashnames/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--fg-heading)" }}
          >
            zcashme/zcashnames/issues
          </a>{" "}
          (web app) or{" "}
          <a
            href="https://github.com/zcashme/ZNS/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--fg-heading)" }}
          >
            zcashme/ZNS/issues
          </a>{" "}
          (indexer/SDKs).
        </p>
      </section>
    </article>
  );
}
