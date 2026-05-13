// Animated product headline: "Personal names for shielded addresses."
// "names" draws a checkmark; "addresses." gets redacted by a sweeping bar.
// Animations auto-fire once when triggerRef's midpoint scrolls past the
// viewport top, and replay on hover with a cooldown to prevent rapid retrigger.
// Renders both mobile (xl:hidden) and desktop (hidden xl:block) variants
// since they share animation state.
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const ANIM_MS = 2300;
const HOVER_COOLDOWN_MS = 10000;

interface AnimatedHeadlineProps {
  triggerRef?: React.RefObject<HTMLElement | null>;
  collapsed?: boolean;
  children?: React.ReactNode;
}

export default function AnimatedHeadline({ triggerRef, collapsed = false, children }: AnimatedHeadlineProps) {
  const [checkVisible, setCheckVisible] = useState(false);
  const [sweeping, setSweeping] = useState(false);

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
    const el = triggerRef?.current;
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
  }, [startSequence, triggerRef]);

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
      addresses.
      <span className="hero-redact-bar" />
    </span>
  );

  const identitySpan = (
    <span
      className={`hero-identity-check-wrap${checkVisible ? " is-drawing" : ""}`}
      onMouseEnter={handleIdentityHover}
    >
      <span className="hero-identity-text" style={{ color: "var(--hero-headline-accent)" }}>
        names
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
    <>
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
          <span className="hero-headline-primary" style={{ fontFamily: "var(--font-cursive)", fontSize: "0.85em", fontWeight: 500 }}>for </span>
          <span className="hero-headline-primary">shielded </span>
          {activitySpan}
        </h1>
        <p
          className="type-section-subtitle text-center mt-4"
          style={{ color: "var(--fg-body)", letterSpacing: "-0.01em" }}
        >
          A name is all you need to transact privately.
        </p>
      </div>

      <div className="w-full flex flex-col items-center xl:items-start text-center xl:text-left bg-transparent order-3 xl:order-none">
        <div
          className="hidden xl:block w-full overflow-hidden"
          style={{
            maxHeight: collapsed ? "0px" : "600px",
            opacity: collapsed ? 0 : 1,
            marginBottom: collapsed ? "0px" : "1.75rem",
            transition:
              "max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease, margin-bottom 0.5s cubic-bezier(0.4,0,0.2,1)",
            pointerEvents: collapsed ? "none" : "auto",
          }}
          aria-hidden={collapsed}
        >
          <h1
            className="font-bold leading-[0.96] xl:text-left"
            style={{
              fontSize: "clamp(2.55rem, 6.1vw + 0.5rem, 6.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            <span className="hero-headline-primary">Personal </span>
            {identitySpan}
            <span className="hero-headline-primary" style={{ fontFamily: "var(--font-cursive)", fontSize: "0.85em", fontWeight: 500 }}> for</span>
            <br />
            <span className="hero-headline-primary">shielded </span>
            {activitySpan}
          </h1>
        </div>
        <p
          className="type-section-subtitle hidden xl:block text-center xl:text-left"
          style={{ color: "var(--fg-body)", letterSpacing: "-0.01em", marginBottom: "1.75rem" }}
        >
          A name is all you need to transact privately.
        </p>
        {children}
      </div>
    </>
  );
}
