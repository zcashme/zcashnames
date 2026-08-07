"use client";

import { useEffect, useState, type FormEvent } from "react";

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (name: string) => void;
  claimLoading?: boolean;
}

// Sanitizes raw input: lowercase, alphanumeric only, max 62 chars.
// Ensures names conform to ZNS protocol constraints before submission.
function validate(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 62);
}

const PLACEHOLDER_BASE = "yourname";
const SUFFIX_ZCASH = ".zcash";
const SUFFIX_ZEC = ".zec";
const SUFFIX_HOLD_MS = 2400;
const SUFFIX_TRANSITION_MS = 500;

type Suffix = typeof SUFFIX_ZCASH | typeof SUFFIX_ZEC;

/**
 * Animated `.zcash` / `.zec` suffix used for both the empty placeholder and
 * the locked suffix beside typed values. Each transition is the same direction:
 * the current suffix always exits downward; the next always enters from above.
 */
function AnimatedSuffix() {
  const [current, setCurrent] = useState<Suffix>(SUFFIX_ZCASH);
  const [anim, setAnim] = useState<{ from: Suffix; to: Suffix } | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      {/* Reserves width of the longer suffix so the layout does not jump */}
      <span className="searchform-suffix-sizer" aria-hidden="true">
        {SUFFIX_ZCASH}
      </span>
      {anim ? (
        <>
          <span
            key={`out-${anim.from}`}
            className="searchform-suffix-layer is-exit"
          >
            {anim.from}
          </span>
          <span
            key={`in-${anim.to}`}
            className="searchform-suffix-layer is-enter"
          >
            {anim.to}
          </span>
        </>
      ) : (
        <span className="searchform-suffix-layer is-rest">{current}</span>
      )}
    </span>
  );
}

// Home-page name search input with visual `.zcash` suffix overlay.
// Validates on keystroke, submits on Enter. Shows an inline loading
// spinner (hourglass icon) while the parent runs a lookup/claim check.
// Controlled component: parent owns `value` via onChange and triggers
// the search via onSubmit.
//
// Empty state: custom overlay placeholder "yourname" + animated suffix.
// Typed state: value + the same animated `.zcash` / `.zec` cycle
// (outgoing exits down, incoming from above). Placeholder base hides on input.
export default function SearchForm({
  value,
  onChange,
  onSubmit,
  claimLoading = false,
}: SearchFormProps) {
  const [focused, setFocused] = useState(false);
  const isEmpty = value.length === 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    const trimmed = value.trim();
    if (trimmed.length >= 1 && trimmed.length <= 62) {
      onSubmit(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl text-left">
      <div className={`searchform-shell has-locked-suffix${focused ? " is-focused" : ""}`}>
        <div className="searchform-main is-locked-suffix">
          <div className="searchform-input-stack">
            <span className="searchform-input-overlay" aria-hidden="true">
              <span
                className={`searchform-input-overlay-value${isEmpty ? " is-placeholder" : " has-value"}`}
              >
                {isEmpty ? PLACEHOLDER_BASE : value}
              </span>
              <AnimatedSuffix />
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(validate(e.target.value))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder=""
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="searchform-input searchform-input-locked"
              aria-label="Enter your desired ZcashName"
            />
          </div>
        </div>
        <button
          type="submit"
          aria-label="Search"
          aria-busy={claimLoading}
          className="searchform-claim"
          disabled={claimLoading}
        >
          {claimLoading ? (
            <span className="searchform-claim-hourglass" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                role="img"
                focusable="false"
                xmlSpace="preserve"
                className="searchform-loader-svg is-animating"
              >
                <path
                  className="searchform-loader-frame-only"
                  d="M6 2V8H6.01L6 8.01L10 12L6 16L6.01 16.01H6V22H18V16.01H17.99L18 16L14 12L18 8.01L17.99 8H18V2H6ZM16 16.5V20H8V16.5L12 12.5L16 16.5ZM12 11.5L8 7.5V4H16V7.5L12 11.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="sr-only">Checking</span>
            </span>
          ) : (
            <span className="searchform-claim-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
