"use client";

import { useEffect, useState } from "react";

const SUFFIX_ZCASH = ".zcash";
const SUFFIX_ZEC = ".zec";
const SUFFIX_HOLD_MS = 2400;
const SUFFIX_TRANSITION_MS = 500;

type Suffix = typeof SUFFIX_ZCASH | typeof SUFFIX_ZEC;

/**
 * Animated `.zcash` / `.zec` suffix used for both empty placeholders and
 * locked-suffix overlays. The current suffix exits downward; the next enters
 * from above.
 */
export default function AnimatedSuffix() {
  const [current, setCurrent] = useState<Suffix>(SUFFIX_ZCASH);
  const [anim, setAnim] = useState<{ from: Suffix; to: Suffix } | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setCurrent(SUFFIX_ZCASH);
      setAnim(null);
      return;
    }

    let from: Suffix = SUFFIX_ZCASH;
    setCurrent(SUFFIX_ZCASH);
    setAnim(null);

    let holdId: ReturnType<typeof setTimeout> | undefined;
    let animId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      holdId = setTimeout(() => {
        if (cancelled) return;
        const to: Suffix = from === SUFFIX_ZCASH ? SUFFIX_ZEC : SUFFIX_ZCASH;
        setAnim({ from, to });
        animId = setTimeout(() => {
          if (cancelled) return;
          from = to;
          setCurrent(to);
          setAnim(null);
          schedule();
        }, SUFFIX_TRANSITION_MS);
      }, SUFFIX_HOLD_MS);
    };

    schedule();

    return () => {
      cancelled = true;
      if (holdId !== undefined) clearTimeout(holdId);
      if (animId !== undefined) clearTimeout(animId);
    };
  }, []);

  return (
    <span className="searchform-suffix-viewport">
      <span className="searchform-suffix-sizer" aria-hidden="true">
        {SUFFIX_ZCASH}
      </span>
      {anim ? (
        <>
          <span key={`out-${anim.from}`} className="searchform-suffix-layer is-exit">
            {anim.from}
          </span>
          <span key={`in-${anim.to}`} className="searchform-suffix-layer is-enter">
            {anim.to}
          </span>
        </>
      ) : (
        <span className="searchform-suffix-layer is-rest">{current}</span>
      )}
    </span>
  );
}
