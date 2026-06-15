// FAQ accordion with grouped questions (basics, privacy, access, community).
// Questions/answers are static data defined as a constant array - no API calls.
// Single openKey state enforces one-open-at-a-time.
// Expand/collapse uses max-height + opacity transitions; active item gets a left border accent.
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";

type FAQItem = {
  question: string;
  answer: ReactNode;
};

type FAQGroup = {
  title: string;
  items: FAQItem[];
};

const groups: FAQGroup[] = [
  {
    title: "The basics",
    items: [
      {
        question: "What is a Zcash name?",
        answer:
          "Zcash names are a human-readable names that maps to a Zcash address and profile links. Instead of sharing a long cryptographic address, you share something like yourname.zcash.",
      },
      {
        question: "What can I do with my Zcash name?",
        answer: (
          <>
            Your Zcash name replaces long wallet addresses with a simple, human-readable name for sending and receiving payments.
            Each name can be linked to a{" "}
            <a href="https://zcash.me" target="_blank" rel="noopener noreferrer" className="underline">Zcash.me</a>{" "}
            profile so others can verify who they&rsquo;re transacting with.
            You can claim a name to use it, hold it as a digital asset, or sell it later as demand grows.
          </>
        ),
      },
      {
        question: "Do I really own my name?",
        answer:
          "Yes. Your name is registered on an on-chain registry linked to your address. There are no renewal fees - stay active once every 180 days to maintain it. You can sell, transfer, or buy additional names at any time.",
      },
      {
        question: "How do I keep my Zcash name active?",
        answer:
          "There are no renewal fees - you just need to sign in at least once every 6 months. Any activity counts: updating your Zcash.me profile, changing the address your name points to, or simply starting the verification process without making any changes. As long as you check in within the window, your name stays yours.",
      },
    ],
  },
  {
    title: "Privacy & payments",
    items: [
      {
        question: "How do payments stay private?",
        answer:
          "Payments made using Zcash shielded transactions do not publicly expose amounts and balances on the public ledger.",
      },
      {
        question: "Does linking my name to an address hurt my privacy?",
        answer:
          "No. Zcash shielded transactions keep amounts and addresses off the public ledger, so even someone who knows your Zcash name can't see your balance or activity. It's like sharing your email - people can reach you, but they can't read your inbox.",
      },
      {
        question: "Can people pay me with other cryptocurrencies?",
        answer:
          "Yes. Cross-pay flows let senders use popular assets while settlement can still arrive in Zcash to the address associated with your ZcashName.",
      },
      {
        question: "How does Log in with Zcash work?",
        answer:
          "Your Zcash name resolves to an address. That address receives a one-time passcode. Replying with the one-time passcode proves you own that address. No passwords or third-party accounts are required - just your name.",
      },
    ],
  },
  {
    title: "Getting access",
    items: [
      {
        question: "What is testnet mode?",
        answer:
          "Testnet mode lets you explore ZcashNames without using real ZEC. All transactions on testnet use TAZ (testnet ZEC), which has no monetary value. It's a safe way to try registering names, updating addresses, and listing names for sale before going live on mainnet.",
      },
      {
        question: "How do waitlist referrals work?",
        answer: (
          <>
            When you join the waitlist you receive a unique referral link. Sharing it moves you up the queue - the more
            people you refer, the earlier you get access when ZcashNames launches. Plus, if they purchase a name after
            our launch, direct referral rewards are set at 1/5 of the lowest name claim price at purchase time.{" "}
            <a href="/leaders/terms" className="underline">
              View terms
            </a>
            .
          </>
        ),
      },
      {
        question: "I joined the waitlist - is my name reserved?",
        answer:
          "Joining the waitlist doesn't lock a specific name - it reserves your spot in line. When it's your turn, you'll receive an email and can register any name that's still unclaimed at that moment. Spots are first-come-first-served, with referrals moving you up (1 spot per 3 referrals). If you're verified on Zcash.me, you'll get access to the namespace even before the general waitlist opens.",
      },
    ],
  },
  {
    title: "Community, builders & team",
    items: [
      {
        question: "How do I join the beta?",
        answer: (
          <>
            Visit{" "}
            <a href="/beta" className="underline">/beta</a>{" "}
            to review the current beta details, supported wallets, and testing expectations. If you want access, apply at{" "}
            <a href="/beta/apply" className="underline">/beta/apply</a>.
          </>
        ),
      },
      {
        question: "How do I build on ZcashNames?",
        answer: (
          <>
            The{" "}
            <a href="/docs" className="underline">Developer&rsquo;s Guide</a>{" "}
            has implementation guides and references for building apps, integrations, and identity flows on top of ZcashNames.
          </>
        ),
      },
      {
        question: "How do I partner with ZcashNames?",
        answer: (
          <>
            We collaborate with wallets, platforms, and products to expand the Zcash ecosystem.{" "}
            <a href="https://cal.com/zcash" target="_blank" rel="noopener noreferrer" className="underline">Book a meeting</a>{" "}
            or{" "}
            <a href="mailto:partner@zcash.me" className="underline">email us</a>{" "}
            to start the conversation.
          </>
        ),
      },
    ],
  },
];

export default function FAQ() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <section className="w-full max-w-3xl mx-auto px-6 pt-0 pb-24">
      <div className="mb-14 flex justify-center">
        <SectionHeaderPill id="faq" title="Frequently Asked Questions" />
      </div>
      <p
        className="type-section-subtitle mx-auto mb-16 max-w-2xl text-center"
        style={{ color: "var(--fg-muted)" }}
      >
        Answers to the most common questions. If yours is not covered, join the{" "}
        <a href="/community" className="underline" style={{ color: "var(--fg-body)" }}>
          community
        </a>{" "}
        and ask us directly.
      </p>

      <div className="flex flex-col gap-10">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className="mb-4 flex items-center gap-4 px-1">
              <h3
                className="type-kicker shrink-0"
                style={{ color: "var(--section-title-accent)" }}
              >
                {group.title}
              </h3>
              <div
                className="h-px flex-1"
                style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--fg-muted) 32%, transparent) 0%, transparent 100%)" }}
                aria-hidden="true"
              />
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--faq-border)", backgroundColor: "transparent" }}
            >
              {group.items.map((item, index) => {
                const key = `${groupIndex}-${index}`;
                const isOpen = openKey === key;
                const isLast = index === group.items.length - 1;

                return (
                  <div
                    key={key}
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--faq-border)",
                    }}
                  >
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors duration-200 cursor-pointer"
                      style={{
                        backgroundColor: "transparent",
                        borderLeft: isOpen
                          ? "3px solid var(--faq-active-border)"
                          : "3px solid transparent",
                      }}
                      onMouseEnter={(event) => {
                        if (!isOpen) {
                          event.currentTarget.style.borderLeftColor = "var(--faq-active-border)";
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!isOpen) {
                          event.currentTarget.style.borderLeftColor = "transparent";
                        }
                      }}
                    >
                      <span
                        className="type-body pr-4"
                        style={{ color: "var(--fg-heading)" }}
                      >
                        {item.question}
                      </span>
                      <span
                        className="flex-shrink-0 text-xl leading-none transition-transform duration-200"
                        style={{
                          color: "var(--fg-muted)",
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        +
                      </span>
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: isOpen ? "600px" : "0px",
                        opacity: isOpen ? 1 : 0,
                        backgroundColor: "transparent",
                      }}
                    >
                      <p
                        className="px-6 pb-5 type-body"
                        style={{
                          color: "var(--fg-muted)",
                          paddingLeft: "calc(1.5rem + 3px)",
                        }}
                      >
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
