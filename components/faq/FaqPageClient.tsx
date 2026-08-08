"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL } from "@/lib/waitlist/early-access";

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
    title: "Reservations",
    items: [
      {
        question: "Why do I need to reserve a name after joining the waitlist?",
        answer:
          "Email confirmations alone are not sybil resistant in this system because one person can create many inboxes and occupy multiple waitlist positions. Reservation adds an on-chain payment requirement that makes queue participation more costly to spam and gives us a stronger signal that each spot represents a real participant.",
      },
      {
        question: "What does a reservation actually give me?",
        answer:
          "A reservation does not purchase the name today. It gives you the option to purchase that name during Early Access before broader registration opens. If your reservation is confirmed, your Early Access Code will be sent to your email when Early Access begins.",
      },
      {
        question: "When does Early Access begin?",
        answer: `Early Access is currently scheduled to begin on ${WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL}. Reservations close when that period begins, and access codes will be sent in queue order to participants who completed reservation.`,
      },
    ],
  },
  {
    title: "Queue & ranking",
    items: [
      {
        question: "How do referrals improve my position?",
        answer:
          "Only completed reservation referrals count. Your adjusted waitlist line improves by 1 for every 3 direct referrals who reserve and by 1 for every 9 indirect referrals who reserve. Partial thresholds do not count until the full threshold is reached.",
      },
      {
        question: "What is the difference between #, Adj#, and Rank?",
        answer:
          "# is your original waitlist line number. Adj# is your adjusted line number after referral-based jumps are applied. Rank compares your adjusted line number against everyone else waiting for the same name and is shown as a value like 1 of 4.",
      },
      {
        question: "Why can my queue position still change?",
        answer:
          "Queue order is name-specific. If other people are waiting for the same name, their completed referral thresholds can improve their adjusted position too. When adjusted values tie, the earlier original waitlist line wins the tie-breaker.",
      },
    ],
  },
  {
    title: "Payments & confirmation",
    items: [
      {
        question: "What must match exactly when I send payment?",
        answer:
          "Do not change the address or memo. Send at least the minimum amount shown on the reservation page. Payments below the required amount will not be accepted, and changing the memo can prevent the payment from being attributed to your reservation.",
      },
      {
        question: "How is a reservation marked complete?",
        answer:
          "Once a qualifying transaction is mined and matched to your waitlist UUID, the reservation is recorded on your waitlist entry. The reserved state then appears on your tokenized /reserve page and in the public waitlist view.",
      },
      {
        question: "What do Reserved, Protected, Pending, and Available mean on the waitlist view?",
        answer:
          "Reserved means the waitlist entry has a confirmed qualifying reservation payment. Protected means the name is specially protected. Pending means the name is not protected and not reserved. Available means the entry is neither reserved nor protected and does not currently have competing interest driving a pending queue state.",
      },
    ],
  },
  {
    title: "Recovery & support",
    items: [
      {
        question: "How do I request another reservation link?",
        answer:
          "Use /reserve and enter the email address you used on the waitlist. If that address is on the waitlist and has not received a reservation email in the last 48 hours, a fresh reservation link will be sent.",
      },
      {
        question: "Will the resend form tell me whether my email is on the waitlist?",
        answer:
          "No. The public response stays neutral so the form does not reveal whether an address exists in the database. If your reservation is already complete, the tokenized link will still show that completed state after you follow it.",
      },
      {
        question: "Where do I get help?",
        answer: (
          <>
            Contact{" "}
            <a href="mailto:support@zcashnames.com" className="underline">
              support@zcashnames.com
            </a>{" "}
            if you need help with reservation emails, payment attribution, or waitlist status.
          </>
        ),
      },
    ],
  },
];

function FAQGroupAccordion({ group, groupIndex }: { group: FAQGroup; groupIndex: number }) {
  const [openKey, setOpenKey] = useState<string | null>(groupIndex === 0 ? "0" : null);

  return (
    <div>
      <div className="mb-4 px-1">
        <h3 className="type-kicker" style={{ color: "var(--section-title-accent)" }}>
          {group.title}
        </h3>
      </div>
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--faq-border)", backgroundColor: "transparent" }}
      >
        {group.items.map((item, index) => {
          const key = `${index}`;
          const isOpen = openKey === key;
          const isLast = index === group.items.length - 1;

          return (
            <div
              key={`${group.title}-${item.question}`}
              style={{
                borderBottom: isLast ? "none" : "1px solid var(--faq-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenKey((current) => (current === key ? null : key))}
                className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors duration-200"
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
                <span className="type-body pr-4" style={{ color: "var(--fg-heading)" }}>
                  {item.question}
                </span>
                <span
                  className="shrink-0 text-xl leading-none transition-transform duration-200"
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
                  maxHeight: isOpen ? "720px" : "0px",
                  opacity: isOpen ? 1 : 0,
                  backgroundColor: "transparent",
                }}
              >
                <div
                  className="px-6 pb-5 type-body"
                  style={{
                    color: "var(--fg-muted)",
                    paddingLeft: "calc(1.5rem + 3px)",
                  }}
                >
                  {item.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FaqPageClient() {
  return (
    <section className="mx-auto mt-10 w-full max-w-3xl px-0 pb-4 sm:mt-12">
      <div className="flex flex-col gap-10">
        {groups.map((group, groupIndex) => (
          <FAQGroupAccordion key={group.title} group={group} groupIndex={groupIndex} />
        ))}
      </div>
    </section>
  );
}
