// Server component: renders static referral rewards and early access terms.
// Content is defined inline (no external data fetch). Links back to /leaders.
import type { Metadata } from "next";
import Link from "next/link";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export const metadata: Metadata = {
  title: "Leaderboard Terms | Zcash Names",
  description: "Terms for referral rewards and early access waitlist participation.",
  alternates: {
    canonical: "https://www.zcashnames.com/leaders/terms",
  },
  openGraph: {
    title: "Leaderboard Terms | Zcash Names",
    description: "Referral rewards and early access terms.",
    url: "https://www.zcashnames.com/leaders/terms",
    images: [
      {
        url: "/og/leaders-terms.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names leaders terms preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard Terms | Zcash Names",
    description: "Referral rewards and early access terms.",
    images: ["/og/leaders-terms.png"],
  },
};

const terms = [
  {
    title: "Eligibility and Referrals",
    body: "Referral rewards are available to eligible early access participants who receive a Zcash Names referral link and share it with users who sign up through that link. A referral qualifies only after the referred user signs up through the link and completes a valid name purchase during the early access period.",
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
    body: "Zcash Names may update, pause, or end referral rewards and early access waitlist rules, including reward amounts, invite handling, and eligibility criteria, at any time.",
  },
  {
    title: "Payouts",
    body: "Reward estimates shown in dashboards are informational until reviewed and paid. Final payout timing, method, and amount may depend on launch timing, network conditions, and eligibility review.",
  },
];

export default function ReferralTermsPage() {
  return (
    <main className="w-full">
      <SiteRouteTitle title="Leaderboard" href="/leaders" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div
          className="relative mx-auto w-full max-w-[920px] border-0 border-b px-6 py-8 text-center sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <HeroShareButton
            message="Terms for Zcash Names referral rewards and early access waitlist participation:"
            shareUrl="https://www.zcashnames.com/leaders/terms"
            emailSubject="Zcash Names Leaderboard Terms"
          />
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--fg-muted)" }}
          >
            Referral Rewards and Early Access
          </p>
          <h1
            className="mt-3 text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
            style={{ color: "var(--fg-heading)" }}
          >
            Terms and{" "}
            <span style={{ color: "var(--color-accent-interactive)" }}>Conditions</span>
          </h1>
          <p
            className="mx-auto mt-4 max-w-2xl text-lg leading-8"
            style={{ color: "var(--fg-body)" }}
          >
            These terms are intended to support fair distribution of access and rewards.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[920px]">
          <div className="flex flex-col gap-8">
            {terms.map((term) => (
              <section key={term.title}>
                <h2
                  className="text-xl font-semibold tracking-tight sm:text-[1.35rem]"
                  style={{ color: "var(--fg-heading)" }}
                >
                  {term.title}
                </h2>
                <p className="mt-2 text-base leading-8" style={{ color: "var(--fg-body)" }}>
                  {term.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-10 border-t border-border-muted pt-6">
            <Link
              href="/leaders"
              className="text-sm font-semibold text-fg-heading underline-offset-2 transition-colors hover:text-[var(--color-accent-interactive)] hover:underline"
            >
              Back to leaderboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

