"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

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
  eyebrow: string;
  description: ReactNode;
};

const steps: Step[] = [
  {
    id: "step-1",
    eyebrow: "Join the waitlist",
    description:
      "Invites go out in order, so reserve your spot to get first pick of the best Zcash names before the crowd shows up.",
  },
  {
    id: "step-2",
    eyebrow: "Climb the queue",
    description:
      "Referrals push you toward the front of the line, improving your odds of landing high-demand names. If they claim one, you earn ZEC.",
  },
  {
    id: "step-3",
    eyebrow: "Lock it in",
    description:
      "When your turn opens, you get an email. Log in, choose your Zcash name, and secure it before public launch. Keep it, use it, or sell it later.",
  },
];

/** Matches the encircled step badges on /reserve (HeroHowReservationsWork / WhatToDoSteps). */
function StepNumberBadge({ n }: { n: number }) {
  return (
    <span
      className="relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{
        background: "var(--color-accent-interactive-soft)",
        color: "var(--color-accent-interactive)",
      }}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

const benefitGroups: BenefitGroup[] = [
  {
    title: "Easier-to-use",
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
        span: "lg:col-span-2",
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
        span: "lg:col-span-2",
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
        description: "Use your name across apps like Zcash.me and PGPZ.",
        soon: true,
      },
      {
        title: "No Connected Wallets",
        description: "Enter the passcode sent to your address to confirm name actions.",
      },
    ],
  },
];

const rowHeading = (title: string, prefix?: ReactNode) => (
  // mb-2 + type/color/hover match Features item titles (parent uses group/step).
  <div className="mb-2 text-center lg:text-left">
    {/*
      Stacked: title is page-centered; badge hangs to the left of the title
      (absolute) so icon+title are not centered as a single unit.
      lg: normal left-aligned flex row with gap.
    */}
    <div className="relative inline-flex items-center gap-3">
      {prefix ? (
        <span className="absolute right-full top-1/2 mr-3 -translate-y-1/2 lg:static lg:right-auto lg:top-auto lg:mr-0 lg:translate-y-0">
          {prefix}
        </span>
      ) : null}
      <h3 className="type-section-subtitle font-semibold text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover/step:text-[var(--color-accent-interactive,var(--fg-heading))]">
        {title}
      </h3>
    </div>
  </div>
);

type GridSpanItem = { span?: string };

/** CSS-grid auto-placement for fixed columns (row-major, wrap when span does not fit). */
function gridItemSpan(item: GridSpanItem, breakpoint: "mobile" | "sm" | "lg") {
  const span = item.span ?? "";
  const baseSpan = span.match(/(?:^|\s)col-span-(\d+)/)?.[1];
  const smSpan = span.match(/(?:^|\s)sm:col-span-(\d+)/)?.[1];
  const lgSpan = span.match(/(?:^|\s)lg:col-span-(\d+)/)?.[1];

  if (breakpoint === "lg") return Number(lgSpan ?? smSpan ?? baseSpan ?? 1);
  if (breakpoint === "sm") return Number(smSpan ?? baseSpan ?? 1);
  return Number(baseSpan ?? 1);
}

function placeGridItems(
  items: readonly GridSpanItem[],
  columns: number,
  breakpoint: "mobile" | "sm" | "lg",
) {
  const placed: Array<{ index: number; row: number; col: number; colSpan: number }> = [];
  let row = 0;
  let col = 0;

  for (let index = 0; index < items.length; index += 1) {
    const rawSpan = gridItemSpan(items[index]!, breakpoint);
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
function gridSeparatorFlags(
  items: readonly GridSpanItem[],
  columns: number,
  breakpoint: "mobile" | "sm" | "lg",
) {
  const placed = placeGridItems(items, columns, breakpoint);
  const maxRow = placed.reduce((max, cell) => Math.max(max, cell.row), 0);

  return placed.map((cell) => ({
    borderBottom: cell.row < maxRow,
    borderRight: placed.some(
      (other) => other.row === cell.row && other.col === cell.col + cell.colSpan,
    ),
  }));
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

const FEATURE_ROTATION_DURATION = 10_000;
type FeatureTransitionDirection = "forward" | "backward";

function BenefitPanel({
  group,
  isExiting,
  transitionDirection,
}: {
  group: BenefitGroup;
  isExiting?: boolean;
  transitionDirection?: FeatureTransitionDirection;
}) {
  const mobileFlags = gridSeparatorFlags(group.items, 1, "mobile");
  const smFlags = gridSeparatorFlags(group.items, 1, "sm");
  const lgFlags = gridSeparatorFlags(group.items, 3, "lg");

  return (
    <div
      className={`features-content-panel${
        isExiting ? ` features-content-panel--exiting-${transitionDirection}` : ""
      }`}
    >
      <div className="mb-4 px-1">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <p className="features-intro-copy mt-1">{group.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
        {group.items.map((benefit, index) => (
          <div
            key={benefit.title}
            className={[
              "group bg-transparent p-5",
              separatorClassName({
                mobile: mobileFlags[index]!,
                sm: smFlags[index]!,
                lg: lgFlags[index]!,
              }),
            ].join(" ")}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="type-section-subtitle font-semibold text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover:text-[var(--color-accent-interactive,var(--fg-heading))]">
                {benefit.title}
              </h4>
              {benefit.soon ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                  style={{
                    background: "color-mix(in srgb, #eab308 16%, transparent)",
                    color: "#eab308",
                  }}
                >
                  Soon
                </span>
              ) : null}
            </div>
            <p className="type-section-subtitle" style={{ color: "var(--fg-muted)" }}>
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitsBento() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [wrappingPillIndex, setWrappingPillIndex] = useState<number | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<FeatureTransitionDirection>("forward");
  const [progress, setProgress] = useState(0);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPreviousIndex(null);
      setWrappingPillIndex(null);
    }
  }, [prefersReducedMotion, previousIndex]);

  useEffect(() => {
    if (!autoRotateEnabled) return;

    let animationFrame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const completion = Math.min(elapsed / FEATURE_ROTATION_DURATION, 1);

      if (!prefersReducedMotion) setProgress(completion * 100);

      if (completion === 1) {
        setPreviousIndex(activeIndex);
        setWrappingPillIndex((activeIndex - 1 + benefitGroups.length) % benefitGroups.length);
        setTransitionDirection("forward");
        setActiveIndex((index) => (index + 1) % benefitGroups.length);
        setProgress(0);
        return;
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeIndex, autoRotateEnabled, prefersReducedMotion]);

  const activate = (index: number, manually = false) => {
    if (manually) {
      setAutoRotateEnabled(false);
      setProgress(0);
    }
    if (index === activeIndex) return;
    const movesForward = index === (activeIndex + 1) % benefitGroups.length;
    setPreviousIndex(activeIndex);
    setWrappingPillIndex(
      movesForward
        ? (activeIndex - 1 + benefitGroups.length) % benefitGroups.length
        : null,
    );
    setTransitionDirection(movesForward ? "forward" : "backward");
    setActiveIndex(index);
  };

  const handlePillKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % benefitGroups.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + benefitGroups.length) % benefitGroups.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = benefitGroups.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    activate(nextIndex, true);
    document.getElementById(`feature-pill-${nextIndex}`)?.focus();
  };

  return (
    <div className="features-rotator">
      <div className="features-pill-row" role="tablist" aria-label="Zcash Names features">
        {benefitGroups.map((group, index) => {
          const isActive = index === activeIndex;
          const position = isActive
            ? "center"
            : (index - activeIndex + benefitGroups.length) % benefitGroups.length === 1
              ? "right"
              : "left";
          return (
            <button
              key={group.title}
              id={`feature-pill-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`feature-panel-${index}`}
              tabIndex={isActive ? 0 : -1}
              className="features-group-pill"
              data-active={isActive}
              data-position={wrappingPillIndex === index ? "wrap" : position}
              onClick={() => activate(index, true)}
              onKeyDown={(event) => handlePillKeyDown(event, index)}
              onAnimationEnd={() => {
                if (wrappingPillIndex === index) setWrappingPillIndex(null);
              }}
            >
              {isActive && autoRotateEnabled ? (
                <span className="features-group-pill-fill" style={{ width: `${progress}%` }} aria-hidden="true" />
              ) : null}
              <span className="features-group-pill-label">{group.title}</span>
            </button>
          );
        })}
      </div>

      <div className="features-content-stage">
        {previousIndex !== null ? (
          <BenefitPanel
            key={`exiting-${previousIndex}`}
            group={benefitGroups[previousIndex]!}
            isExiting
            transitionDirection={transitionDirection}
          />
        ) : null}
        <div
          key={activeIndex}
          id={`feature-panel-${activeIndex}`}
          role="tabpanel"
          aria-labelledby={`feature-pill-${activeIndex}`}
          className={`features-content-panel features-content-panel--entering-${transitionDirection}`}
          onAnimationEnd={() => setPreviousIndex(null)}
        >
          <BenefitPanel group={benefitGroups[activeIndex]!} />
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-0">
      <div id="benefits" className="features-intro scroll-mt-24">
        <span className="features-intro-eyebrow">Features</span>
        <h2>
          Address people by name.
        </h2>
        <p>Zcash Names makes payments simpler, clearer, and built for everyday use.</p>
      </div>

      <BenefitsBento />

      <div className="mt-24">
        <div id="how-it-works" className="features-intro scroll-mt-24">
          <span className="features-intro-eyebrow">Get your name</span>
          <h2>Claim your name early.</h2>
          <p>Reserve your spot, climb the queue through referrals, and choose your name when your invite arrives.</p>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
          {steps.map((step, index) => {
            // No line rules while stacked; side-by-side uses ">" chevrons (not plain borders).
            const showChevron = index < steps.length - 1;

            return (
              <div
                key={step.id}
                className="group/step relative"
              >
                {/*
                  Shared horizontal padding so title + body share one left edge.
                  lg:pl-11 on the body (= badge w-8 + gap-3) aligns description with the title,
                  not the step icon. Stacked stays centered.
                */}
                <div className="px-1 pt-1 lg:px-5">
                  {rowHeading(step.eyebrow, <StepNumberBadge n={index + 1} />)}

                  {/* When a stacked chevron follows, bottom padding lives on the chevron
                      so space above the legs matches space below the tip. */}
                  <div
                    className={`bg-transparent pt-0 ${
                      showChevron ? "pb-0 lg:pb-5" : "pb-5"
                    }`}
                  >
                    <p
                      className="type-section-subtitle mx-auto max-w-md text-center lg:mx-0 lg:max-w-none lg:pl-11 lg:text-left"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {showChevron ? (
                  <>
                    {/* Stacked: in-flow chevron with equal space above legs and below tip. */}
                    <div
                      className="flex justify-center py-5 text-[var(--border-muted)] lg:hidden"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 48 16"
                        className="h-4 w-12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {/* Same chevron as desktop, oriented down for the stacked column. */}
                        <path d="M4 4 L24 12 L44 4" />
                      </svg>
                    </div>

                    {/* Desktop: absolute ">" between side-by-side columns. */}
                    <span
                      className="pointer-events-none absolute bottom-0 left-1/2 z-[2] hidden -translate-x-1/2 translate-y-1/2 rotate-90 text-[var(--border-muted)] lg:bottom-auto lg:left-auto lg:right-0 lg:top-1/2 lg:block lg:translate-x-1/2 lg:-translate-y-1/2 lg:rotate-0"
                      aria-hidden="true"
                    >
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
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
