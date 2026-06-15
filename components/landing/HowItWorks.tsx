"use client";

import type { ReactNode } from "react";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";

type Benefit = {
  title: string;
  description: ReactNode;
  soon?: boolean;
  span?: string;
};

type BenefitGroup = {
  title: string;
  description: string;
  items: Benefit[];
  span?: string;
  accent: string;
};

type Step = {
  id: string;
  number: string;
  eyebrow: string;
  description: ReactNode;
  accent: string;
};

const steps: Step[] = [
  {
    id: "step-1",
    number: "01",
    eyebrow: "Get in line",
    description:
      "Invites go out in order, so early signups get first pick of the best Zcash names before the crowd shows up. Free to join. No commitment.",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, var(--feature-heading-line-from) 82%, transparent), color-mix(in srgb, var(--feature-heading-line-to) 72%, transparent))",
  },
  {
    id: "step-2",
    number: "02",
    eyebrow: "Climb the queue",
    description:
      "Referrals push you toward the front of the line, improving your odds of landing high-demand names. If they claim one, you earn ZEC.",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, var(--feature-heading-line-to) 82%, transparent), color-mix(in srgb, var(--feature-heading-line-from) 58%, transparent))",
  },
  {
    id: "step-3",
    number: "03",
    eyebrow: "Lock it in",
    description:
      "When your turn opens, you get an email. Log in, choose your Zcash name, and secure it before public launch. Keep it, use it, or sell it later.",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, var(--feature-heading-line-from) 58%, transparent), color-mix(in srgb, var(--feature-heading-line-to) 88%, transparent))",
  },
];

const benefitGroups: BenefitGroup[] = [
  {
    title: "Easy-to-use",
    description: "Payments without addresses",
    span: "lg:col-span-6",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, var(--feature-heading-line-from) 82%, transparent), color-mix(in srgb, var(--feature-heading-line-to) 72%, transparent))",
    items: [
      {
        title: "Send to simple names",
        description: "No copying or pasting long addresses.",
      },
      {
        title: "Know where it goes",
        description: "QRs are hard to verify. Names show who you're paying.",
      },
      {
        title: "Update once, everywhere",
        description: "Change your address without informing all of your contacts.",
        span: "sm:col-span-2",
      },
    ],
  },
  {
    title: "Cryptographic Ownership",
    description: "Your Zcash name is an asset.",
    span: "lg:col-span-6",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, var(--feature-heading-line-to) 82%, transparent), color-mix(in srgb, var(--feature-heading-line-from) 58%, transparent))",
    items: [
      {
        title: "On-chain and tamper-resistant",
        description: "Records cannot be altered or removed behind your back.",
        span: "sm:col-span-2",
      },
      {
        title: "Control your name",
        description: "Hold, trade, or transfer it. Only you can make updates.",
      },
      {
        title: "No renewal fees",
        description: "Just sign in once every 6 months.",
      },
    ],
  },
  {
    title: "Sign with Zcash",
    description: "Your Zcash name can be used across apps.",
    span: "lg:col-span-12",
    accent:
      "linear-gradient(135deg, color-mix(in srgb, var(--feature-heading-line-from) 58%, transparent), color-mix(in srgb, var(--feature-heading-line-to) 88%, transparent))",
    items: [
      {
        title: "Private by default",
        description: "Your name reveals nothing about your transactions.",
      },
      {
        title: "Portable identity",
        description: "Use your name across apps like Zcash.me.",
        soon: true,
      },
      {
        title: "No Connected Wallets",
        description: "Enter the passcode sent to your address to confirm name actions.",
      },
    ],
  },
];

const sectionHeading = (
  id: string,
  title: string,
  subtitle: string,
  align: "center" | "left" = "center",
  subtitleClassName = "mt-6",
) => (
  <div className={`mb-14 ${align === "center" ? "text-center" : "text-left"}`}>
    <div className={`flex items-center ${align === "center" ? "justify-center" : "justify-start"}`}>
      <SectionHeaderPill id={id} title={title} />
    </div>
    <p
      className={`type-section-subtitle ${subtitleClassName} max-w-2xl ${align === "center" ? "mx-auto" : ""}`}
      style={{ color: "var(--fg-muted)" }}
    >
      {subtitle}
    </p>
  </div>
);

const rowHeading = (title: string, prefix?: ReactNode) => (
  <div className="mb-4 flex items-center justify-center gap-4 px-1">
    <div
      className="h-px flex-1"
      style={{ background: "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--fg-muted) 32%, transparent) 100%)" }}
      aria-hidden="true"
    />
    <div className="shrink-0 flex items-center gap-3">
      {prefix ? (
        <span className="type-kicker" style={{ color: "var(--fg-heading)" }}>
          {prefix}
        </span>
      ) : null}
      <h3 className="type-kicker text-center" style={{ color: "var(--fg-muted)" }}>
        {title}
      </h3>
    </div>
    <div
      className="h-px flex-1"
      style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--fg-muted) 32%, transparent) 0%, transparent 100%)" }}
      aria-hidden="true"
    />
  </div>
);

const groupIntroClassName = "px-1 pt-3 pb-6";
const groupIntroTextClassName = "type-section-subtitle max-w-xl text-center";

function BenefitsBento() {
  const proximity = usePointerProximity<HTMLElement>({
    radius: 180,
    maxScaleBoost: 0.03,
    maxShadowOpacity: 0.18,
  });

  return (
    <div
      className="grid grid-cols-1 gap-x-5 gap-y-10 lg:grid-cols-12"
      onPointerMove={proximity.handlePointerMove}
      onPointerLeave={proximity.handlePointerLeave}
    >
      {benefitGroups.map((group) => (
        <div
          key={group.title}
          className={`${group.span ?? "lg:col-span-6"}`}
        >
          {rowHeading(group.title)}
          <div className={groupIntroClassName}>
            <p className={`${groupIntroTextClassName} mx-auto`} style={{ color: "var(--fg-body)" }}>
              {group.description}
            </p>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${group.title === "Sign with Zcash" ? "lg:grid-cols-3" : group.span === "lg:col-span-12" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {group.items.map((b) => (
              <div
                key={b.title}
                ref={(node) => proximity.register(`${group.title}-${b.title}`, node)}
                className={`relative overflow-hidden rounded-2xl p-5 ${b.span ?? ""}`}
                style={{
                  border: "1px solid color-mix(in srgb, var(--fg-heading) 8%, var(--faq-border))",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 38%, transparent), transparent)",
                  transform: "translateZ(0) scale(var(--prox-scale, 1))",
                  boxShadow: "0 18px 38px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--feature-heading-line-to) 36%, transparent), transparent 48%)",
                  }}
                  aria-hidden="true"
                />
                <div className="relative z-[1]">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="type-section-subtitle font-semibold" style={{ color: "var(--fg-heading)" }}>
                      {b.title}
                    </h4>
                    {b.soon && (
                      <span
                        className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                        style={{
                          background: "color-mix(in srgb, #eab308 16%, transparent)",
                          color: "#eab308",
                        }}
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
  const proximity = usePointerProximity<HTMLElement>({
    radius: 180,
    maxScaleBoost: 0.035,
    maxShadowOpacity: 0.2,
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-0">
      {sectionHeading(
        "benefits",
        "Benefits",
        "Readable, ownable, privacy-preserving identity for payments and apps built around Zcash.",
        "center",
        "mt-6",
      )}
      <div className="mt-16">
        <BenefitsBento />
      </div>

      <div className="mt-24">
        {sectionHeading(
          "how-it-works",
          "How It Works",
          "Three steps: get positioned early, improve your spot, then claim the name before public launch.",
        )}

        <div
          className="grid grid-cols-1 gap-x-5 gap-y-10 lg:grid-cols-12"
          onPointerMove={proximity.handlePointerMove}
          onPointerLeave={proximity.handlePointerLeave}
        >
          {steps.map((step) => (
            <div key={step.id} className="lg:col-span-4">
              {rowHeading(step.eyebrow, step.number)}

              <div
                ref={(node) => proximity.register(step.id, node)}
                className="relative overflow-hidden rounded-2xl p-5"
                style={{
                  border: "1px solid color-mix(in srgb, var(--fg-heading) 8%, var(--faq-border))",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 38%, transparent), transparent)",
                  transform: "translateZ(0) scale(var(--prox-scale, 1))",
                  boxShadow: "0 18px 38px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--feature-heading-line-to) 36%, transparent), transparent 48%)",
                  }}
                  aria-hidden="true"
                />
                <div className="relative z-[1]">
                  <p
                    className="type-section-subtitle"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
