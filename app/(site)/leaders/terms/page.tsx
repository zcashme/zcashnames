import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Leaders Terms | ZcashNames",
  description: "Terms for ZcashNames referral rewards and early access waitlist.",
};

const terms = [
  {
    title: "Eligibility and Referrals",
    body: "Referral rewards are available to eligible early access participants who receive a ZcashNames referral link and share it with users who sign up through that link. A referral qualifies only after the referred user signs up through the link and completes a valid name purchase during the early access period.",
  },
  {
    title: "Reward Basis",
    body: "During early access, direct referral rewards may earn up to 0.05 ZEC for each referred signup that completes a qualifying purchase. Indirect referral rewards may apply when referred users invite others. The 0.05 ZEC value is based on the lowest name claim price at the time of purchase and may vary.",
  },
  {
    title: "Early Access Order",
    body: "Early access notifications are sent in the order waitlist signups are received. Referral activity may improve queue position based on active early access rules.",
  },
  {
    title: "Name Availability",
    body: "Joining the waitlist or entering a preferred name does not reserve or guarantee that name. Each invite includes a limited claim window. If a name is not claimed within that window, eligibility may pass to others or to public registration. Some names may be reserved or offered through auction instead of direct claim. If a selected name is unavailable, the early access code may be used to claim one other eligible name during the assigned turn.",
  },
  {
    title: "Fair Use and Review",
    body: "To maintain fairness, rewards and access may be reviewed and adjusted in cases of abuse, fraud, duplicate accounts, self-referrals, payment reversals, or other invalid activity. Invites or claims may be dismissed for behavior that does not meet one-person-one-early-access-claim intent.",
  },
  {
    title: "Changes",
    body: "ZcashNames may update, pause, or end referral rewards and early access waitlist rules, including reward amounts, invite handling, and eligibility criteria, at any time.",
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
        <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          ZcashNames
        </p>
        <p className="mt-1 text-sm font-semibold text-fg-heading">Referral Rewards and Early Access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg-heading">Terms and Conditions</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-fg-muted">
          These terms apply to ZcashNames referral rewards and early access waitlist. They are intended to
          support fair distribution of access and rewards.
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
