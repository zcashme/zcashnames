"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface HeroProps {
  searchForm: React.ReactNode;
  rightPanel?: React.ReactNode;
  searchFormContainerRef?: React.RefObject<HTMLDivElement | null>;
  formExpanded?: boolean;
  subtitle?: React.ReactNode;
}

const ANIM_MS = 2300;
const HOVER_COOLDOWN_MS = 10000;

export default function Hero({
  searchForm,
  rightPanel,
  searchFormContainerRef,
  formExpanded = false,
  subtitle,
}: HeroProps) {
  const [checkVisible, setCheckVisible] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const headlineRef = useRef<HTMLHeadingElement>(null);
  const phonePanelRef = useRef<HTMLDivElement>(null);

  const animating = useRef(false);
  const autoSequenceTriggered = useRef(false);
  const hoverLockedUntil = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current.clear();
  }, []);

  const after = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const replayAnim = useCallback((set: React.Dispatch<React.SetStateAction<boolean>>) => {
    set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => set(true)));
  }, []);

  const startSequence = useCallback(() => {
    if (animating.current || autoSequenceTriggered.current) return;
    autoSequenceTriggered.current = true;
    animating.current = true;
    hoverLockedUntil.current = Number.POSITIVE_INFINITY;

    replayAnim(setCheckVisible);

    after(() => {
      replayAnim(setSweeping);
    }, ANIM_MS);

    after(() => {
      animating.current = false;
      hoverLockedUntil.current = Date.now() + HOVER_COOLDOWN_MS;
    }, ANIM_MS * 2);
  }, [after, replayAnim]);

  useEffect(() => {
    const el = phonePanelRef.current;
    if (!el) return;

    let rafId = 0;

    const checkMidpointTrigger = () => {
      if (autoSequenceTriggered.current) return;
      const rect = el.getBoundingClientRect();
      const midpointPastTop = rect.top + rect.height / 2 <= 0;
      if (midpointPastTop) {
        startSequence();
      }
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        checkMidpointTrigger();
      });
    };

    checkMidpointTrigger();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [startSequence]);

  useEffect(() => {
    return () => {
      clearTimers();
      animating.current = false;
      hoverLockedUntil.current = 0;
    };
  }, [clearTimers]);

  const hoverAllowed = useCallback(() => {
    if (animating.current) return false;
    return Date.now() >= hoverLockedUntil.current;
  }, []);

  const handleActivityHover = useCallback(() => {
    if (!hoverAllowed()) return;
    replayAnim(setSweeping);
  }, [hoverAllowed, replayAnim]);

  const handleIdentityHover = useCallback(() => {
    if (!hoverAllowed()) return;
    replayAnim(setCheckVisible);
  }, [hoverAllowed, replayAnim]);

  const activitySpan = (
    <span
      className={`hero-activity-redact hero-activity-text${sweeping ? " is-sweeping" : ""}`}
      style={{ color: "var(--hero-headline-accent)" }}
      onMouseEnter={handleActivityHover}
    >
      address.
      <span className="hero-redact-bar" />
    </span>
  );

  const identitySpan = (
    <span
      className={`hero-identity-check-wrap${checkVisible ? " is-drawing" : ""}`}
      onMouseEnter={handleIdentityHover}
    >
      <span className="hero-identity-text" style={{ color: "var(--hero-headline-accent)" }}>
        name.
      </span>
      <svg className="hero-checkmark-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          className="hero-checkmark-path"
          d="M4.5 12.75l6 6 9-13.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  return (
    <section className="hero-section w-full flex flex-col items-center px-4 relative z-[1] -mt-[92px]">
      <div className="hero-grid w-full max-w-[1320px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(560px,640px)] items-start xl:items-center overflow-visible">
        <div className="hero-mobile-headline xl:hidden w-full order-1">
          <h1
            className="font-bold leading-[0.96] text-center"
            style={{
              fontSize: "clamp(2.55rem, 6.1vw + 0.5rem, 6.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            <span className="hero-headline-primary">Personal </span>
            {identitySpan}
            <br />
            <span className="hero-headline-primary">Shielded </span>
            {activitySpan}
          </h1>
          <p
            className="type-section-subtitle text-center mt-4"
            style={{ color: "var(--fg-body)", letterSpacing: "-0.01em" }}
          >
            Private transactions with human names instead of long strings.
          </p>
        </div>

        <div className="w-full flex flex-col items-center xl:items-start text-center xl:text-left bg-transparent order-3 xl:order-none">
          <div
            className="hidden xl:block w-full overflow-hidden"
            style={{
              maxHeight: formExpanded ? "0px" : "600px",
              opacity: formExpanded ? 0 : 1,
              marginBottom: formExpanded ? "0px" : "1.75rem",
              transition:
                "max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease, margin-bottom 0.5s cubic-bezier(0.4,0,0.2,1)",
              pointerEvents: formExpanded ? "none" : "auto",
            }}
            aria-hidden={formExpanded}
          >
            <h1
              ref={headlineRef}
              className="font-bold leading-[0.96] xl:text-left"
              style={{
                fontSize: "clamp(2.55rem, 6.1vw + 0.5rem, 6.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              <span className="hero-headline-primary">Personal</span>
              <br />
              {identitySpan}
              <br />
              <span className="hero-headline-primary">Shielded</span>
              <br />
              {activitySpan}
            </h1>
          </div>

          <p
            className="type-section-subtitle hidden xl:block text-center xl:text-left"
            style={{ color: "var(--fg-body)", letterSpacing: "-0.01em", marginBottom: "1.75rem" }}
          >
            Private transactions with human names instead of long strings.
          </p>

          <div
            ref={searchFormContainerRef}
            className="w-full max-w-2xl sm:max-w-3xl xl:max-w-4xl self-center xl:self-start flex flex-col items-center gap-3"
          >
            {searchForm}
            {subtitle && (
              <p
                className="type-section-subtitle text-center"
                style={{
                  color: "var(--fg-body)",
                  letterSpacing: "-0.01em",
                }}
              >
                {subtitle}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    display: "inline-block",
                    verticalAlign: "0.25em",
                    width: "1.2em",
                    height: "1.2em",
                    marginLeft: "0.25em",
                  }}
                  aria-hidden="true"
                >
                  <path d="M1 16 C10 16 14 10 14 2 M8 8 L14 2 L20 8" />
                </svg>
              </p>
            )}
          </div>
        </div>

        {rightPanel && (
          <div
            ref={phonePanelRef}
            className="order-2 xl:order-none w-full flex justify-center xl:justify-end items-start overflow-visible"
          >
            {rightPanel}
          </div>
        )}
      </div>
    </section>
  );
}
