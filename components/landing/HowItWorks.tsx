type Benefit = {
  title: string;
  description: React.ReactNode;
  soon?: boolean;
};

type BenefitGroup = {
  title: string;
  items: Benefit[];
};

const benefitGradient =
  "radial-gradient(circle at 70% 50%, var(--feature-heading-line-from) 0%, transparent 70%)";

const benefitGroups: BenefitGroup[] = [
  {
    title: "Easy to use",
    items: [
      {
        title: "Send using simple names",
        description: "No long addresses or manual entry",
      },
      {
        title: "Update once, everywhere",
        description: "Change your address without notifying others",
      },
    ],
  },
  {
    title: "Yours to keep",
    items: [
      {
        title: "Own and control your .zcash name",
        description: "Hold, trade, or transfer - only you can make updates",
      },
      {
        title: "No renewal fees",
        description: "Just sign in once every 6 months",
      },
      {
        title: "On-chain and tamper-resistant",
        description: "Records cannot be altered or removed",
      },
    ],
  },
  {
    title: "Shield yourself",
    items: [
      {
        title: "Private by default",
        description: "Your name reveals nothing about your finances",
      },
      {
        title: "Portable identity",
        description: "Use your name across apps like Zcash.me",
        soon: true,
      },
    ],
  },
];

function BenefitsBento() {
  return (
    <div className="flex flex-col gap-10">
      {benefitGroups.map((group, gi) => (
        <div key={gi}>
          <h3
            className="type-kicker mb-4 px-1"
            style={{ color: "var(--fg-muted)" }}
          >
            {group.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.items.map((b, i) => (
              <div
                key={i}
                className="relative rounded-xl p-6 overflow-hidden"
                style={{ border: "1px solid var(--faq-border)" }}
              >
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{ backgroundImage: benefitGradient }}
                  aria-hidden="true"
                />
                <div className="relative z-[1]">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4
                      className="type-section-subtitle font-semibold"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      {b.title}
                    </h4>
                    {b.soon && (
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                        style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}
                      >
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="w-full max-w-4xl mx-auto px-6 py-24">
      {/* Section heading - same style as FAQ */}
      <div className="flex items-center justify-center gap-3.5 mb-14">
        <span
          className="block shrink-0 w-[clamp(24px,9vw,96px)] h-px"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-from) 0%, var(--feature-heading-line-to) 100%)" }}
          aria-hidden="true"
        />
        <p
          className="relative z-[1] whitespace-nowrap px-3.5 m-0 bg-clip-text text-transparent type-kicker"
          style={{ backgroundImage: "var(--feature-heading-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >How It Works</p>
        <span
          className="block shrink-0 w-[clamp(24px,9vw,96px)] h-px"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-to) 0%, var(--feature-heading-line-from) 100%)" }}
          aria-hidden="true"
        />
      </div>

      {/* Step boxes with arrows - side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4 md:gap-0 mb-14">
        {/* Step 1 */}
        <div className="flex flex-col">
          <div
            className="rounded-xl p-6 flex-1"
            style={{ border: "1px solid var(--faq-border)" }}
          >
            <div
              className="mb-3 text-3xl font-bold italic leading-none"
              style={{ color: "var(--fg-muted)" }}
            >
              1
            </div>
            <h3
              className="type-section-subtitle font-semibold mb-2"
              style={{ color: "var(--fg-heading)" }}
            >Get Early Access</h3>
            <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
              Invites are sent in order, and the earliest users get first pick of the most valuable .zcash names before others can claim them.
              Free to join. No commitment.
            </p>
          </div>
        </div>

        {/* Arrow 1 - horizontal on desktop */}
        <div className="hidden md:flex items-center justify-center px-3" style={{ color: "var(--fg-muted)" }}>
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12h24m0 0l-7-7m7 7l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Arrow 1 - vertical on mobile */}
        <div className="flex md:hidden items-center justify-center py-1" style={{ color: "var(--fg-muted)" }}>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2v24m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col">
          <div
            className="rounded-xl p-6 flex-1"
            style={{ border: "1px solid var(--faq-border)" }}
          >
            <div
              className="mb-3 text-3xl font-bold italic leading-none"
              style={{ color: "var(--fg-muted)" }}
            >
              2
            </div>
            <h3
              className="type-section-subtitle font-semibold mb-2"
              style={{ color: "var(--fg-heading)" }}
            >Move Up + Earn ZEC</h3>
            <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
              Every referral pushes you closer to the front of the line, giving you a better chance at high-demand names.
              Plus, earn ZEC when your referrals claim a name.
            </p>
          </div>
        </div>

        {/* Arrow 2 - horizontal on desktop */}
        <div className="hidden md:flex items-center justify-center px-3" style={{ color: "var(--fg-muted)" }}>
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12h24m0 0l-7-7m7 7l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Arrow 2 - vertical on mobile */}
        <div className="flex md:hidden items-center justify-center py-1" style={{ color: "var(--fg-muted)" }}>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2v24m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col">
          <div
            className="rounded-xl p-6 flex-1"
            style={{ border: "1px solid var(--faq-border)" }}
          >
            <div
              className="mb-3 text-3xl font-bold italic leading-none"
              style={{ color: "var(--fg-muted)" }}
            >
              3
            </div>
            <h3
              className="type-section-subtitle font-semibold mb-2"
              style={{ color: "var(--fg-heading)" }}
            >Claim Your Name</h3>
            <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
              You&rsquo;ll receive an email when it&rsquo;s your turn.
              Log in, choose your .zcash name, and secure it before the public launch.
              Keep it, use it to transact, or sell it as demand grows.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits heading - same style as FAQ / How It Works */}
      <div className="flex items-center justify-center gap-3.5 mb-14 mt-24">
        <span
          className="block shrink-0 w-[clamp(24px,9vw,96px)] h-px"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-from) 0%, var(--feature-heading-line-to) 100%)" }}
          aria-hidden="true"
        />
        <p
          className="relative z-[1] whitespace-nowrap px-3.5 m-0 bg-clip-text text-transparent type-kicker"
          style={{ backgroundImage: "var(--feature-heading-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >Benefits</p>
        <span
          className="block shrink-0 w-[clamp(24px,9vw,96px)] h-px"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-to) 0%, var(--feature-heading-line-from) 100%)" }}
          aria-hidden="true"
        />
      </div>

      {/* Benefits bento grid */}
      <BenefitsBento />
    </section>
  );
}
