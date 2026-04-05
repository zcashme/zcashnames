"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type FAQItem = {
  question: string;
  answer: ReactNode;
};

const items: FAQItem[] = [
  {
    question: "What is a .zcash name?",
    answer:
      ".zcash is a human-readable name that maps to a Zcash address and profile links. Instead of sharing a long cryptographic address, you share something like yourname.zcash.",
  },
  {
    question: "What can I do with my .zcash name?",
    answer: (
      <>
        Your .zcash name replaces long wallet addresses with a simple, human-readable name for sending and receiving payments.
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
      "Yes. Your name is registered on an on-chain registry linked to your address. There are no renewal fees — stay active once every 180 days to maintain it. You can sell, transfer, or buy additional names at any time.",
  },
  {
    question: "How do payments stay private?",
    answer:
      "Payments made using Zcash shielded transactions do not publicly expose amounts and balances on the public ledger.",
  },
  {
    question: "Can people pay me with other cryptocurrencies?",
    answer:
      "Yes. Cross-pay flows let senders use popular assets while settlement can still arrive in Zcash to the address associated with your ZcashName.",
  },
  {
    question: "How does Log in with Zcash work?",
    answer:
      "Your .zcash name resolves to an address. That address receives a one-time passcode. Replying with the one-time passcode proves you own that address. No passwords or third-party accounts are required — just your name.",
  },
  {
    question: "What is testnet mode?",
    answer:
      "Testnet mode lets you explore ZcashNames without using real ZEC. All transactions on testnet use TAZ (testnet ZEC), which has no monetary value. It's a safe way to try registering names, updating addresses, and listing names for sale before going live on mainnet.",
  },
  {
    question: "How do waitlist referrals work?",
    answer:
      "When you join the waitlist you receive a unique referral link. Sharing it moves you up the queue — the more people you refer, the earlier you get access when ZcashNames launches. Plus, if they purchase a name after our launch, you earn 0.05 ZEC per name.",
  },
  {
    question: "How do I become an ambassador?",
    answer: (
      <>
        The Ambassador Program is for people who want to grow adoption in their region, host community events, and help onboard new users. Fill out the interest form{" "}
        <a href="https://form.typeform.com/to/oBd1YeoI" target="_blank" rel="noopener noreferrer" className="underline">here</a>{" "}
        to get started.
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
  {
    question: "Who is building and supporting ZcashNames?",
    answer: (
      <>
        ZcashNames is built by Zechariah (Founder) and craftsoldier (Engineer), with support from collaborators across the ecosystem including{" "}
        <a href="https://cipherscan.app" target="_blank" rel="noopener noreferrer" className="underline">CipherScan</a>{" "}
        (block explorer),{" "}
        <a href="https://zcash.me" target="_blank" rel="noopener noreferrer" className="underline">Zcash.me</a>{" "}
        (profiles), Cake Labs (wallets), ZecHub (community), ambassadors like CriptoWilli, Jenkins, and ZcashRu, and investors and advisors including Balaji Srinivasan. Additional wallet integrations with Zingo!, Zucchini, and Zodl are on the wishlist.
      </>
    ),
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="w-full max-w-3xl mx-auto px-6 pt-0 pb-24">
      <div className="flex items-center justify-center gap-3.5 mb-14">
        <span
          className="block shrink-0 w-[clamp(24px,9vw,96px)] h-px"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-from) 0%, var(--feature-heading-line-to) 100%)" }}
          aria-hidden="true"
        />
        <p
          className="relative z-[1] whitespace-nowrap px-3.5 m-0 bg-clip-text text-transparent type-kicker"
          style={{ backgroundImage: "var(--feature-heading-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >Frequently Asked Questions</p>
        <span
          className="block shrink-0 w-[clamp(24px,9vw,96px)] h-px"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-to) 0%, var(--feature-heading-line-from) 100%)" }}
          aria-hidden="true"
        />
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--faq-border)", backgroundColor: "transparent" }}
      >
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          const isLast = index === items.length - 1;

          return (
            <div
              key={index}
              style={{
                borderBottom: isLast ? "none" : "1px solid var(--faq-border)",
              }}
            >
              <button
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors duration-200 cursor-pointer"
                style={{
                  backgroundColor: "transparent",
                  borderLeft: isOpen
                    ? "3px solid var(--faq-active-border)"
                    : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.borderLeftColor = "var(--faq-active-border)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpen) {
                    e.currentTarget.style.borderLeftColor = "transparent";
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
    </section>
  );
}
