import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Referral Terms | ZcashNames",
  description: "Terms for the ZcashNames early access referral rewards program.",
};

const terms = [
  {
    title: "Eligibility",
    body: "Referral rewards are available to eligible early access participants who receive a ZcashNames referral link and share it with people who sign up using that link.",
  },
  {
    title: "Reward Basis",
    body: "During early access, direct referral rewards may earn up to 0.05 ZEC for each referred signup that buys a name. Indirect referral rewards may also apply when those referred users refer others.",
  },
  {
    title: "Qualifying Purchases",
    body: "A referral only qualifies after the referred person signs up through your referral link and completes a valid name purchase during the early access period.",
  },
  {
    title: "Review",
    body: "Rewards may be reviewed for abuse, fraud, duplicate accounts, self-referrals, payment reversals, or other activity that does not reflect a valid referral.",
  },
  {
    title: "Changes",
    body: "ZcashNames may update, pause, or end the referral rewards program, including reward amounts and eligibility rules, at any time.",
  },
  {
    title: "Payouts",
    body: "Reward estimates shown in dashboards are informational until reviewed and paid. Final payout timing, method, and amount may depend on launch timing, network conditions, and eligibility review.",
  },
];

export default function ReferralTermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      <section
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Referral rewards</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg-heading">Terms and Conditions</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-fg-muted">
          These terms apply to the ZcashNames early access referral rewards program. They are intended to keep rewards
          fair for people sharing referral links and for the people joining through them.
        </p>

        <div className="mt-8 space-y-6">
          {terms.map((term) => (
            <section key={term.title}>
              <h2 className="text-lg font-semibold text-fg-heading">{term.title}</h2>
              <p className="mt-2 text-sm leading-6 text-fg-muted">{term.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 border-t pt-5" style={{ borderColor: "var(--leaders-card-border)" }}>
          <Link href="/leaders" className="text-sm font-semibold text-fg-heading underline-offset-2 hover:underline">
            Back to leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
