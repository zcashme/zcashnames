import type { ReactNode } from "react";
import CompetitionCountdown from "@/components/security/CompetitionCountdown";
import RegistryPublicDetails from "@/components/security/RegistryPublicDetails";
import type { SecurityPageModel } from "@/lib/security/window";

const REPOSITORIES = [
  { label: "zcashme/zns-mint", href: "https://github.com/zcashme/zns-mint", detail: "ZNS mint, wallet, and chain integration" },
];

const OUT_OF_SCOPE = [
  "All ZNS repositories other than zcashme/zns-mint, including zns-resolver, zns-orchard, zns-zcash_primitives, and every other zns-* repository",
  "zcashnames.com website, frontend, DNS, hosting",
  "Zebra, the Zcash protocol itself, unpatched upstream crates",
  "Cloud, hosting, CI, operator machines, and host or hypervisor attacks",
  "Unmodified upstream dependencies and protocol-level issues",
  "Denial-of-service against live infrastructure. All testing must run locally against the regtest harness.",
];

const POOL: Array<[string, string]> = [
  ["Critical", "8 ZEC"],
  ["High", "5 ZEC"],
  ["Medium", "2 ZEC"],
  ["Low", "0.5 ZEC"],
];

const SIDE: Array<[string, string]> = [
  ["≥ 50", "1 ZEC"],
  ["≥ 30", "0.4 ZEC"],
  ["≥ 15", "0.1 ZEC"],
  ["< 15", "0"],
];

const cardStyle = {
  borderColor: "var(--faq-border)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--fg-heading)" }}>
      {children}
    </h2>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
      {children}
    </p>
  );
}

function RulesTable({ headers, rows }: { headers: [string, string]; rows: Array<[string, string]> }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[18rem] text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--faq-border)" }}>
            <th className="py-2 pr-4 font-semibold" style={{ color: "var(--fg-heading)" }}>{headers[0]}</th>
            <th className="py-2 font-semibold" style={{ color: "var(--fg-heading)" }}>{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([left, right]) => (
            <tr key={left} className="border-b" style={{ borderColor: "var(--faq-border)" }}>
              <td className="py-2 pr-4 align-top" style={{ color: "var(--fg-body)" }}>{left}</td>
              <td className="py-2 align-top break-all font-mono text-xs" style={{ color: "var(--fg-heading)" }}>{right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SecurityRules({
  model,
  children,
}: {
  model: SecurityPageModel;
  children: ReactNode;
}) {
  const windowLabel = model.startLabel && model.endLabel
    ? `${model.startLabel} → ${model.endLabel}`
    : "Competition dates are not set.";

  return (
    <>
      <section className="rounded-2xl border px-6 py-8 text-center sm:px-8 sm:py-10" style={cardStyle}>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
          Testnet pre-launch · 10 ZEC total pool · Public competition
        </p>
        <h1 className="mt-4 text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl" style={{ color: "var(--fg-heading)" }}>
          ZNS Mint Bug Bounty Competition
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8" style={{ color: "var(--fg-body)" }}>
          Help protect the ZNS mint before mainnet launch. Find and privately report vulnerabilities in the competition repositories.
        </p>
        <dl className="mx-auto mt-6 max-w-xl space-y-3 text-left text-sm leading-6">
          <div>
            <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Competition window</dt>
            <dd className="break-words" style={{ color: "var(--fg-body)" }}>{windowLabel}</dd>
            <CompetitionCountdown startAt={model.startAt} endAt={model.endAt} />
          </div>
          <div>
            <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Submission fee</dt>
            <dd style={{ color: "var(--fg-body)" }}>{model.feeZec} ZEC per report, non-refundable</dd>
          </div>
        </dl>
      </section>

      <div className="mt-4">{children}</div>
      <RegistryPublicDetails />

      <section className="mt-4 rounded-2xl border px-5 py-6 sm:px-6 sm:py-8" style={cardStyle}>
        <SectionTitle>Scope</SectionTitle>
        <Body>
          The only in-scope repository is zcashme/zns-mint. Reports must show a security impact to people using or relying on the ZNS mint.
        </Body>
        <Body>
          A finding is eligible only if it affects <code>master</code> as it existed 24 hours before your report is submitted. Maintainer issues and pull requests that already cover the finding before submission make it ineligible.
        </Body>
        <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>Competition repositories</h3>
        <ul className="mt-3 space-y-3 text-sm leading-6">
          {REPOSITORIES.map((repository) => (
            <li key={repository.href} className="rounded-xl border px-4 py-3" style={{ borderColor: "var(--faq-border)" }}>
              <a href={repository.href} target="_blank" rel="noreferrer" className="font-semibold underline decoration-dotted underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>
                {repository.label} ↗
              </a>
              <span className="ml-2" style={{ color: "var(--fg-body)" }}>{repository.detail}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>Out of scope</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          {OUT_OF_SCOPE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="mt-8">
          <SectionTitle>Rules</SectionTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            <li>Local testing only using the regtest harness.</li>
            <li>Never touch live infrastructure or other users.</li>
            <li>No public disclosure before the program&apos;s publication date.</li>
            <li>No phishing, social engineering, or physical attacks.</li>
            <li>Sponsor employees and their households are ineligible.</li>
            <li>Automated submission of unverified scanner output is spam and earns nothing.</li>
          </ul>
        </div>

        <div className="mt-8">
          <SectionTitle>Rewards</SectionTitle>
          <Body>Main pool: 8 ZEC.</Body>
          <Body>The pool unlocked depends on the highest-severity valid finding.</Body>
          <RulesTable headers={["Top valid finding", "Pool unlocked"]} rows={POOL} />
          <Body>Weights: Critical 12, High 6, Medium 3, Low 1.</Body>
          <Body>The unlocked pool is split pro-rata by weight across all accepted unique findings.</Body>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-black tracking-[-0.03em]" style={{ color: "var(--fg-heading)" }}>Side pool — 2 ZEC</h3>
          <Body>Total points are the sum of weights of accepted unique findings. Critical is 12, High is 6, Medium is 3, and Low is 1.</Body>
          <RulesTable headers={["Points", "Bonus"]} rows={SIDE} />
          <Body>The side pool is capped at 2 ZEC. Pay top-down from the ≥50 tier, then ≥30, then ≥15. A partially funded tier splits evenly. Any remainder is unspent.</Body>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-black tracking-[-0.03em]" style={{ color: "var(--fg-heading)" }}>Severity by impact on users</h3>
          <dl className="mt-3 space-y-3 text-sm leading-6">
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Critical</dt>
              <dd style={{ color: "var(--fg-body)" }}>A reproducible attack can directly steal or drain funds, give an attacker control of another person&apos;s registered name, expose key material that enables those attacks, or permanently corrupt the registry. Examples include unauthorized claims, updates, or releases; treasury theft; and irreversible registry damage.</dd>
            </div>
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>High</dt>
              <dd style={{ color: "var(--fg-body)" }}>A serious, demonstrated impact occurs without direct theft or unauthorized control of a name. Examples include a recoverable halt to claims, updates, or releases; bypassing an OTP or liveness challenge without taking over a name; mispricing beyond intended bounds; or linking a name to an address beyond the design.</dd>
            </div>
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Medium</dt>
              <dd style={{ color: "var(--fg-body)" }}>A user flow is temporarily disrupted but recovers; an attacker can cause costly griefing; or users lose a limited amount of fees or value.</dd>
            </div>
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Low</dt>
              <dd style={{ color: "var(--fg-body)" }}>A minor behavior or specification mismatch with no direct impact on user funds, name ownership, privacy, or access to the mint.</dd>
            </div>
          </dl>
        </div>

        <div className="mt-8">
          <SectionTitle>Duplicate rule</SectionTitle>
          <Body>First valid report of a unique root cause wins.</Body>
          <Body>Later duplicates earn nothing.</Body>
          <Body>There is no insight/QA tier. Rewards are for code bugs.</Body>
        </div>

        <div className="mt-8">
          <SectionTitle>Judging and payouts</SectionTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            <li>Sponsor triage sets final severity and duplicate groupings.</li>
            <li>Accepted rewards are paid in ZEC to the Unified address on the ticket.</li>
            <li>Payouts are sent within 7 days after final results.</li>
          </ul>
        </div>

        <div className="mt-8">
          <SectionTitle>Submitting a finding</SectionTitle>
          <Body>Pay the submission fee, create a private GitHub Security Advisory for the finding, attach a valid, reproducible proof of concept to the GHSA, then submit its link here with your claimed severity, GitHub username, and Unified payout address. The ticket page stores the link and tracking details; it does not file the advisory for you.</Body>
          <Body><a href="https://github.com/zcashme/zns-mint/security/advisories/new" target="_blank" rel="noreferrer" className="underline underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>Create a GitHub Security Advisory ↗</a></Body>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border px-5 py-6 sm:px-6 sm:py-8" style={cardStyle}>
          <SectionTitle>Frequently asked questions</SectionTitle>
          <div className="mt-2">
            <details className="border-b border-border-muted py-4">
              <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                Is the {model.feeZec} ZEC fee refunded if my report is valid?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                No. The fee is anti-spam and non-refundable regardless of outcome. Rewards come from the prize pools, not the fee.
              </p>
            </details>
            <details className="border-b border-border-muted py-4">
              <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                Which repository is in scope?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                Only <a href="https://github.com/zcashme/zns-mint" target="_blank" rel="noreferrer" className="underline underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>zcashme/zns-mint</a> is in scope. Findings in zns-resolver, zns-orchard, zns-zcash_primitives, or other repositories are out of scope.
              </p>
            </details>
            <details className="border-b border-border-muted py-4">
              <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                Which version of the code is eligible?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                The finding must affect <code>master</code> as it existed 24 hours before you submit. If a maintainer issue or pull request already covers it before submission, it is ineligible.
              </p>
            </details>
            <details className="border-b border-border-muted py-4">
              <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                How do I submit a finding?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                Pay the submission fee, create a private GitHub Security Advisory, and attach a valid, reproducible proof of concept to it. Then submit the GHSA link, your GitHub username, claimed severity, and Unified payout address here. The finding details and proof of concept belong in the GHSA.
              </p>
            </details>
          </div>
      </section>
    </>
  );
}
