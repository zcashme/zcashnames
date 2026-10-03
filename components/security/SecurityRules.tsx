import type { ReactNode } from "react";
import type { SecurityPageModel } from "@/lib/security/window";

const SCOPE: Array<[string, string]> = [
  ["Boot / liveness / checkpointing", "src/boot.rs"],
  ["Seed capsule + sealing", "src/capsule.rs"],
  ["TEE seam", "src/tee.rs"],
  ["Key derivation", "src/key.rs"],
  ["Mint protocol", "src/mint/* (registry, otp, treasury, pricing, presale, note, mtp)"],
  ["Wallet", "src/wallet/*"],
  ["Chain client", "src/zcash.rs"],
  ["Patched forks — ZNS-specific code only", "zcashme/orchard, zcashme/zns-zcash_primitives"],
  ["Dev-gate escapes", "regtest / fake-tee features reaching a release build"],
];

const OUT_OF_SCOPE = [
  "zcashnames.com website, frontend, DNS, hosting",
  "Zebra, the Zcash protocol itself, unpatched upstream crates",
  "Infrastructure: AWS, GitHub, CI, operator machines, hypervisor/host attacks, SEV-SNP hardware attacks under the documented V1 trust model",
  "Anything outside the pinned commit",
  "Bugs already reported in a GitHub issue, security advisory, or other sponsor-tracked report before competition open",
  "Bugs already addressed by an open or merged pull request before competition open, even if the fix is not included in the pinned commit",
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
          The ZNS mint runs a SEV-SNP attested enclave that holds the Registry seed, scans the chain, and registers names as shielded Orchard Name Notes. Find the bugs before mainnet does.
        </p>
        <dl className="mx-auto mt-6 max-w-xl space-y-3 text-left text-sm leading-6">
          <div>
            <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Competition window</dt>
            <dd className="break-words" style={{ color: "var(--fg-body)" }}>{windowLabel}</dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Code snapshot</dt>
            <dd className="break-all font-mono" style={{ color: "var(--fg-body)" }}>
              {model.pinnedCommit
                ? `${model.pinnedCommit} (frozen 24 h before start)`
                : "The pinned commit is published at competition open."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Submission fee</dt>
            <dd style={{ color: "var(--fg-body)" }}>{model.feeZec} ZEC per report, non-refundable</dd>
          </div>
        </dl>
      </section>

      <div className="mt-4">{children}</div>

      <section className="mt-4 rounded-2xl border px-5 py-6 sm:px-6 sm:py-8" style={cardStyle}>
        <SectionTitle>Scope</SectionTitle>
        <Body>
          All review is against a single frozen commit of znsme/zns-mint, published at competition open. The snapshot is taken from main 24 hours before start. Anything pushed after the pinned hash is out of scope.
        </Body>
        <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>In scope — code only</h3>
        <RulesTable headers={["Module", "Path"]} rows={SCOPE} />
        <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>Out of scope</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          {OUT_OF_SCOPE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

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
          <h3 className="text-lg font-black tracking-[-0.03em]" style={{ color: "var(--fg-heading)" }}>Severity definitions</h3>
          <dl className="mt-3 space-y-3 text-sm leading-6">
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Critical</dt>
              <dd style={{ color: "var(--fg-body)" }}>Treasury theft or drain; Registry seed or key-material exposure via a code path; claiming names without valid payment; permanent registry corruption; authorization bypass on update/release.</dd>
            </div>
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>High</dt>
              <dd style={{ color: "var(--fg-body)" }}>Mint liveness break that halts claims/updates/releases; name theft or hijack via protocol flaw; OTP/liveness-challenge bypass; oracle manipulation causing mispricing beyond design bounds; name ↔ address linkage beyond intended design.</dd>
            </div>
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Medium</dt>
              <dd style={{ color: "var(--fg-body)" }}>Recoverable DoS of a mint flow; griefing with attacker cost; fee/value leakage.</dd>
            </div>
            <div>
              <dt className="font-semibold" style={{ color: "var(--fg-heading)" }}>Low</dt>
              <dd style={{ color: "var(--fg-body)" }}>Correctness or spec mismatch with no direct fund impact.</dd>
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
          <SectionTitle>Judging and appeals</SectionTitle>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            <li>Sponsor triage sets final severity and duplicate groupings.</li>
            <li>Preliminary results are published at competition close.</li>
            <li>There is a 72-hour appeal window after preliminary results.</li>
            <li>Judges&apos; decisions are final once the appeal window closes.</li>
            <li>Payment is made in ZEC to the address on the report within 7 days of final results.</li>
          </ul>
        </div>

        <div className="mt-8">
          <SectionTitle>Rules of engagement</SectionTitle>
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
          <SectionTitle>Disclosure</SectionTitle>
          <Body>
            After fixes merge, every accepted report is published as a GitHub Security Advisory on the zns-mint repository, with a CVE ID requested through GitHub and the finder credited by handle.
          </Body>
          <Body>The finder owns the credit line.</Body>
        </div>

        <div className="mt-8">
          <SectionTitle>FAQ</SectionTitle>
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
                Can I submit code fixes?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                Suggested fixes are welcome as a report field but are not paid. Rewards are for findings.
              </p>
            </details>
            <details className="border-b border-border-muted py-4">
              <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                Do team submissions split points?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                Teams earn points as one identity. The side-pool tier and payout go to the single registered payout address.
              </p>
            </details>
            <details className="border-b border-border-muted py-4">
              <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                What if the top finding is High? Is the full Critical-gated pool paid?
              </summary>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                No. The unlock follows the highest severity found. High unlocks 5 ZEC, not 8 ZEC.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
