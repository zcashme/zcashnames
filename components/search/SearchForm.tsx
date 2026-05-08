import { useState, type FormEvent } from "react";

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (name: string) => void;
  claimLoading?: boolean;
}

function validate(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 62);
}

export default function SearchForm({
  value,
  onChange,
  onSubmit,
  claimLoading = false,
}: SearchFormProps) {
  const [focused, setFocused] = useState(false);

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
              <span className={`searchform-input-overlay-value${value ? " has-value" : " is-placeholder"}`}>
                {value || "yourname"}
              </span>
              <span className="searchform-input-overlay-suffix">.zcash</span>
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
