"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type ChangeEvent } from "react";

type PasscodeBoxesProps = {
  value: string;
  onChange: (digits: string) => void;
  onSubmit?: () => void;
  /** Error state — red borders until the value changes. */
  error?: boolean;
  /** Accepted state — green borders (checkmark color). */
  success?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
};

/**
 * Six visual digit slots with a single overlay input (zcashme OtpInput pattern).
 * Paste of 6 digits into the field fills all boxes. Styled for action-page forms.
 */
export default function PasscodeBoxes({
  value,
  onChange,
  onSubmit,
  error = false,
  success = false,
  disabled = false,
  autoFocus = false,
  id = "passcode-boxes",
  className = "",
}: PasscodeBoxesProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value.replace(/\D/g, "").slice(0, 6));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && onSubmit && value.trim().length === 6) {
      e.preventDefault();
      onSubmit();
    }
  }

  function slotStyle(idx: number): CSSProperties {
    const isActive =
      !disabled && !error && !success && (idx === value.length || (value.length === 6 && idx === 5));

    let borderColor = "var(--faq-border)";
    if (error) borderColor = "var(--accent-red, #e05252)";
    else if (success) borderColor = "var(--color-accent-green)";
    else if (isActive) borderColor = "var(--fg-heading)";

    return {
      background: "var(--input-fill)",
      border: `1.5px solid ${borderColor}`,
      color: error
        ? "var(--accent-red, #e05252)"
        : success
          ? "var(--color-accent-green)"
          : "var(--fg-heading)",
    };
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        6-digit passcode
      </label>
      <div
        className="relative"
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        <div className="flex justify-center gap-1.5 sm:gap-2" aria-hidden="true">
          {digits.map((digit, idx) => (
            <div
              key={`passcode-slot-${idx}`}
              // Taller than wide (rectangular), not square/wide.
              className="flex h-12 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-base font-semibold leading-none transition-colors sm:h-12 sm:w-9 sm:text-lg"
              style={slotStyle(idx)}
            >
              {digit}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          aria-invalid={error || undefined}
        />
      </div>
    </div>
  );
}
