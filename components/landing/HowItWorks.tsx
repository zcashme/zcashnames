"use client";

import type { ReactNode } from "react";
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
};

type Step = {
  id: string;
  number: string;
  eyebrow: string;
  description: ReactNode;
};

const steps: Step[] = [
  {
    id: "step-1",
    number: "01",
    eyebrow: "Join the waitlist",
    description:
      "Invites go out in order, so reserve your spot to get first pick of the best Zcash names before the crowd shows up.",
  },
  {
    id: "step-2",
    number: "02",
    eyebrow: "Climb the queue",
    description:
      "Referrals push you toward the front of the line, improving your odds of landing high-demand names. If they claim one, you earn ZEC.",
  },
  {
    id: "step-3",
    number: "03",
    eyebrow: "Lock it in",
    description:
      "When your turn opens, you get an email. Log in, choose your Zcash name, and secure it before public launch. Keep it, use it, or sell it later.",
  },
];

const benefitGroups: BenefitGroup[] = [
  {
    title: "Easy-to-use",
    description: "Payments without addresses",
    span: "lg:col-span-6",
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
        description: "Just rotate your address once every 6 months.",
      },
    ],
  },
  {
    title: "Sign with Zcash",
    description: "Your Zcash name can be used across apps.",
    span: "lg:col-span-12",
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
  align: "center" | "left" = "center",
) => (
  <div className={`mb-6 ${align === "center" ? "text-center" : "text-left"}`}>
    <div className={`flex items-center ${align === "center" ? "justify-center" : "justify-start"}`}>
      <SectionHeaderPill id={id} title={title} />
    </div>
  </div>
);

const rowHeading = (title: string, prefix?: ReactNode) => (
  // mb-2 + type/color/hover match Features item titles (parent uses group/step).
  <div className="mb-2 px-1">
    {/* Center when Get yours steps stack; left-align in the lg 3-up row. */}
    <div className="flex items-center justify-center gap-3 text-center lg:justify-start lg:text-left">
      {prefix ? (
        <span className="type-section-subtitle font-semibold text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover/step:text-[var(--color-accent-interactive,var(--fg-heading))]">
          {prefix}
        </span>
      ) : null}
      <h3 className="type-section-subtitle font-semibold text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover/step:text-[var(--color-accent-interactive,var(--fg-heading))]">
        {title}
      </h3>
    </div>
  </div>
);

const benefitGroupHeading = (title: string, description: string) => (
  <div className="mb-4 px-1">
    {/* Always centered above the group's items, including when two groups sit side by side. */}
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <h3 className="type-kicker" style={{ color: "var(--section-title-accent)" }}>
        {title}
      </h3>
      <p className="mt-1 type-section-subtitle" style={{ color: "var(--fg-body)" }}>
        {description}
      </p>
    </div>
  </div>
);

type GridSpanItem = { span?: string };

/** CSS-grid auto-placement for fixed columns (row-major, wrap when span does not fit). */
function placeGridItems(items: readonly GridSpanItem[], columns: number) {
  const placed: Array<{ index: number; row: number; col: number; colSpan: number }> = [];
  let row = 0;
  let col = 0;

  for (let index = 0; index < items.length; index += 1) {
    const rawSpan = items[index]?.span?.includes("col-span-3")
      ? 3
      : items[index]?.span?.includes("col-span-2")
        ? 2
        : 1;
    const colSpan = Math.min(rawSpan, columns);

    if (col + colSpan > columns) {
      row += 1;
      col = 0;
    }

    placed.push({ index, row, col, colSpan });
    col += colSpan;
    if (col >= columns) {
      row += 1;
      col = 0;
    }
  }

  return placed;
}

/** Minimal separators: vertical only between side-by-side peers; bottom only when a lower row exists. */
function gridSeparatorFlags(items: readonly GridSpanItem[], columns: number) {
  const placed = placeGridItems(items, columns);
  const maxRow = placed.reduce((max, cell) => Math.max(max, cell.row), 0);

  return placed.map((cell) => ({
    borderBottom: cell.row < maxRow,
    borderRight: placed.some(
      (other) => other.row === cell.row && other.col === cell.col + cell.colSpan,
    ),
  }));
}

function benefitGridClassName(group: BenefitGroup) {
  if (group.title === "Sign with Zcash") return "lg:grid-cols-3";
  if (group.span === "lg:col-span-12") return "sm:grid-cols-3";
  return "sm:grid-cols-2";
}

function benefitGridColumns(group: BenefitGroup) {
  // Column counts must match the responsive grid classes above.
  if (group.title === "Sign with Zcash") {
    return { mobile: 1, sm: 1, lg: 3 };
  }
  if (group.span === "lg:col-span-12") {
    return { mobile: 1, sm: 3, lg: 3 };
  }
  return { mobile: 1, sm: 2, lg: 2 };
}

function separatorClassName(flags: {
  mobile: { borderBottom: boolean; borderRight: boolean };
  sm: { borderBottom: boolean; borderRight: boolean };
  lg: { borderBottom: boolean; borderRight: boolean };
}) {
  return [
    flags.mobile.borderBottom ? "border-b border-border-muted" : "border-b-0",
    flags.mobile.borderRight ? "border-r border-border-muted" : "border-r-0",
    flags.sm.borderBottom ? "sm:border-b sm:border-border-muted" : "sm:border-b-0",
    flags.sm.borderRight ? "sm:border-r sm:border-border-muted" : "sm:border-r-0",
    flags.lg.borderBottom ? "lg:border-b lg:border-border-muted" : "lg:border-b-0",
    flags.lg.borderRight ? "lg:border-r lg:border-border-muted" : "lg:border-r-0",
  ].join(" ");
}

function BenefitsBento() {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-10 lg:grid-cols-12">
      {benefitGroups.map((group) => {
        const cols = benefitGridColumns(group);
        const mobileFlags = gridSeparatorFlags(group.items, cols.mobile);
        const smFlags = gridSeparatorFlags(group.items, cols.sm);
        const lgFlags = gridSeparatorFlags(group.items, cols.lg);

        return (
          <div
            key={group.title}
            className={`${group.span ?? "lg:col-span-6"}`}
          >
            {benefitGroupHeading(group.title, group.description)}

            <div className={`grid grid-cols-1 gap-0 ${benefitGridClassName(group)}`}>
              {group.items.map((b, index) => (
                <div
                  key={b.title}
                  className={[
                    "group relative overflow-hidden p-5",
                    b.span ?? "",
                    separatorClassName({
                      mobile: mobileFlags[index]!,
                      sm: smFlags[index]!,
                      lg: lgFlags[index]!,
                    }),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 38%, transparent), transparent)",
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
                      <h4 className="type-section-subtitle font-semibold text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover:text-[var(--color-accent-interactive,var(--fg-heading))]">
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
        );
      })}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-0">
      {sectionHeading("benefits", "Features")}
      <BenefitsBento />

      <div className="mt-24">
        {sectionHeading("how-it-works", "Get yours")}

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
          {steps.map((step, index) => {
            // No line rules while stacked; side-by-side uses ">" chevrons (not plain borders).
            const showChevron = index < steps.length - 1;

            return (
              <div
                key={step.id}
                className="group/step relative"
              >
                <div className="px-1 pt-1 lg:px-5">
                  {rowHeading(step.eyebrow, step.number)}
                </div>

                {/* pt-0 pulls body up to the title without shifting the step heading. */}
                <div
                  className="relative overflow-hidden px-5 pb-5 pt-0"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 38%, transparent), transparent)",
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
                      className="type-section-subtitle mx-auto max-w-md text-center lg:mx-0 lg:max-w-none lg:text-left"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {showChevron ? (
                  <span
                    className="pointer-events-none absolute bottom-0 left-1/2 z-[2] -translate-x-1/2 translate-y-1/2 rotate-90 text-[var(--border-muted)] lg:bottom-auto lg:left-auto lg:right-0 lg:top-1/2 lg:translate-x-1/2 lg:-translate-y-1/2 lg:rotate-0"
                    aria-hidden="true"
                  >
                    {/* ">" between columns; rotate 90° when stacked → "\/" between rows */}
                    <svg
                      viewBox="0 0 16 48"
                      className="h-12 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4 L12 24 L4 44" />
                    </svg>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
