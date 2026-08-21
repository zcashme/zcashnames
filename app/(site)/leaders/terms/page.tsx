// Server component: renders static referral rewards and early access terms.
// Content is defined inline (no external data fetch).
import type { Metadata } from "next";
import type { ReactNode } from "react";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL } from "@/lib/waitlist/early-access";
import { reservedReferralSpotPhrase } from "@/lib/waitlist/referral-spots";

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

const terms: Array<{ title: string; body: ReactNode }> = [
  {
    title: "Eligibility",
    body: (
      <>
        <p>To get a position on the Early Access waitlist and receive an access code, you need to:</p>
        <ol className="mt-3 list-decimal space-y-1 pl-6">
          <li>Verify your email</li>
          <li>Complete an on-chain reservation</li>
        </ol>
        <p className="mt-3">Until both are complete, your position will show as Not Applicable (N/A).</p>
        <p className="mt-3">
          A reservation gives you the option to buy the name during Early Access. It does not mean you
          own the name yet. Reservations make it more costly to spam the waitlist.
        </p>
      </>
    ),
  },
  {
    title: "Referrals",
    body: `A referral qualifies for a reward only after the invited person joins through your link and claims their name. Position improves when referrals complete a reservation: ${reservedReferralSpotPhrase("direct")} improves your adjusted line by 1, and ${reservedReferralSpotPhrase("indirect")} improve it by 1. Partial counts do not apply until the full threshold is reached. Sharing a link alone does not change Position. The reward is distributed when referrals claim their name, regardless of whether they reserved.`,
  },
  {
    title: "Reward Basis",
    body: "During Early Access, direct referral rewards may earn up to 0.05 ZEC for each referred signup that completes a qualifying claim. Indirect referral rewards may apply when referred users invite others. The 0.05 ZEC value is based on the lowest name claim price at the time of purchase and may vary. Payouts are delivered to the referrer's Zcash Name after that name has been reserved.",
  },
  {
    title: "Early Access Order",
    body: `Early Access codes are sent to reserved participants when Early Access begins, currently scheduled for ${WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL}. Order is the name-specific Position: your adjusted line among people waiting to claim the same name. Position can change until codes go out. When adjusted lines tie, the earlier original waitlist line number wins.`,
  },
  {
    title: "Name Availability",
    body: "Joining the waitlist or entering a preferred name does not reserve or guarantee that name. A completed reservation gives you the option to purchase during Early Access, but it does not guarantee the string is still claimable. Each invite includes a limited claim window. If a name is not claimed within that window, eligibility may pass to others or to public registration. Some names may be protected and cannot be claimed without approval.",
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
                <div className="mt-2 text-base leading-8" style={{ color: "var(--fg-body)" }}>
                  {typeof term.body === "string" ? <p>{term.body}</p> : term.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

