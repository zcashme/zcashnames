export default function HowItWorks() {
  return (
    <section className="w-full max-w-4xl mx-auto px-6 py-24">
      {/* Section heading — same style as FAQ */}
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

      {/* Step boxes with arrows — side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4 md:gap-0 mb-14">
        {/* Step 1 */}
        <div
          className="rounded-xl p-6"
          style={{ border: "1px solid var(--faq-border)" }}
        >
          <span
            className="block text-2xl font-bold mb-1"
            style={{ color: "var(--fg-heading)" }}
          >1</span>
          <h3
            className="type-section-subtitle font-semibold mb-2"
            style={{ color: "var(--fg-heading)" }}
          >Get Early Access</h3>
          <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
            Invites are sent in order, and the earliest users get first pick of the most valuable .zcash names before others can claim them.
            Free to join. No commitment.
          </p>
        </div>

        {/* Arrow 1 — horizontal on desktop */}
        <div className="hidden md:flex items-center justify-center px-3" style={{ color: "var(--fg-muted)" }}>
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12h24m0 0l-7-7m7 7l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Arrow 1 — vertical on mobile */}
        <div className="flex md:hidden items-center justify-center py-1" style={{ color: "var(--fg-muted)" }}>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2v24m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Step 2 */}
        <div
          className="rounded-xl p-6"
          style={{ border: "1px solid var(--faq-border)" }}
        >
          <span
            className="block text-2xl font-bold mb-1"
            style={{ color: "var(--fg-heading)" }}
          >2</span>
          <h3
            className="type-section-subtitle font-semibold mb-2"
            style={{ color: "var(--fg-heading)" }}
          >Move Up + Earn ZEC</h3>
          <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
            Every referral pushes you closer to the front of the line, giving you a better chance at high-demand names.
            Plus, earn ZEC when your referrals claim a name.
          </p>
        </div>

        {/* Arrow 2 — horizontal on desktop */}
        <div className="hidden md:flex items-center justify-center px-3" style={{ color: "var(--fg-muted)" }}>
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12h24m0 0l-7-7m7 7l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Arrow 2 — vertical on mobile */}
        <div className="flex md:hidden items-center justify-center py-1" style={{ color: "var(--fg-muted)" }}>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2v24m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Step 3 */}
        <div
          className="rounded-xl p-6"
          style={{ border: "1px solid var(--faq-border)" }}
        >
          <span
            className="block text-2xl font-bold mb-1"
            style={{ color: "var(--fg-heading)" }}
          >3</span>
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

      {/* Benefits heading — same style as FAQ / How It Works */}
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

      {/* Explainer box */}
      <div
        className="rounded-xl p-8"
        style={{ border: "1px solid var(--faq-border)" }}
      >
        <div className="space-y-3" style={{ color: "var(--fg-muted)" }}>
          <p className="type-section-subtitle">
            <strong style={{ color: "var(--fg-heading)" }}>Send and Receive Without Long Addresses</strong>{" "}
            &mdash; Use a name people can read and remember instead of copying and pasting wallet strings.
          </p>

          <p className="type-section-subtitle">
            <strong style={{ color: "var(--fg-heading)" }}>Use One Name Across Zcash Apps</strong>{" "}
            &mdash; Sign in with your .zcash name across supported apps and prove ownership of your address without extra accounts.
          </p>

          <p className="type-section-subtitle">
            <strong style={{ color: "var(--fg-heading)" }}>Verify Who You&rsquo;re Dealing With</strong>{" "}
            &mdash; Connect your .zcash name to a{" "}
            <a href="https://zcash.me" target="_blank" rel="noopener noreferrer" className="underline">Zcash.me</a>{" "}
            profile so others can confirm identity, linked accounts, and reputation before they transact.
          </p>

          <p className="type-section-subtitle">
            <strong style={{ color: "var(--fg-heading)" }}>Buy, Sell, and Hold Valuable Names</strong>{" "}
            &mdash; Claim a name to use it, keep it as a digital asset, or list it for sale as demand grows.
          </p>
        </div>
      </div>
    </section>
  );
}
