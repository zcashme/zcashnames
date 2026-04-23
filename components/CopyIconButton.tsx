import type React from "react";

export default function CopyIconButton({
  copied,
  disabled = false,
  onClick,
  ariaLabel,
  title,
  style,
}: {
  copied: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      style={
        style ?? {
          background: "transparent",
          border: "1.5px solid var(--border-muted)",
          color: "var(--fg-body)",
        }
      }
      aria-label={ariaLabel}
      title={title ?? (copied ? "Copied!" : ariaLabel)}
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
