"use client";

import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

function CheckEmailView() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 28 * 16,
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--color-card)",
        border: "1px solid var(--border-muted)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "rgba(244, 183, 40, 0.15)",
            color: "#F4B728",
            marginBottom: 4,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--fg-heading)", margin: 0 }}>
          Check your email
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--fg-body)", lineHeight: 1.6, margin: 0 }}>
          We sent a confirmation link to your inbox. Click it to secure your spot on the waitlist.
        </p>
        <button
          type="button"
          style={{
            padding: "10px 32px",
            borderRadius: 999,
            fontSize: "0.875rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
            transition: "opacity 140ms ease",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Check your email — post-submit modal</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.72);
  }
  .modal {
    width: 100%;
    max-width: 28rem;
    border-radius: 16px;
    overflow: hidden;
    background: ${p.card};
    border: 1px solid ${p.borderMuted};
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
    max-height: calc(100vh - 2rem);
  }
  .view {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }
  .alert-swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 999px;
    background: rgba(244, 183, 40, 0.15);
    color: #F4B728;
    margin-bottom: 4px;
  }
  .alert-swatch svg { width: 28px; height: 28px; }
  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${p.fgHeading};
    margin: 0;
  }
  p {
    font-size: 0.875rem;
    color: ${p.fgBody};
    line-height: 1.6;
    margin: 0;
  }
  .primary {
    padding: 10px 32px;
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: ${p.primaryBg};
    color: ${p.primaryFg};
    box-shadow: ${p.primaryShadow};
    font: inherit;
    font-weight: 600;
    transition: opacity 140ms ease;
  }
  .primary:hover { opacity: 0.85; }
</style>
</head>
<body>
  <div class="overlay">
    <div class="modal">
      <div class="view">
        <span class="alert-swatch" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <h2>Check your email</h2>
        <p>We sent a confirmation link to your inbox. Click it to secure your spot on the waitlist.</p>
        <button type="button" class="primary">Done</button>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

const SNIPPETS: Snippets = {
  dark: buildSnippet("dark"),
  light: buildSnippet("light"),
  monochrome: buildSnippet("monochrome"),
};

export default function CheckEmailModalCard() {
  return (
    <GalleryCard
      title="Home — Post-submit &ldquo;Check your email&rdquo; modal"
      description="Initial confirmation view of the portal modal shown after a waitlist submission. Amber alert swatch, title, supporting copy, primary Done button."
      selector="div.fixed.inset-0.z-[10000] > div > div:nth-child(1) > div"
      filename="check-your-email-modal.html"
      snippets={SNIPPETS}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          padding: "1rem",
          background: "rgba(0, 0, 0, 0.35)",
          borderRadius: 16,
        }}
      >
        <CheckEmailView />
      </div>
    </GalleryCard>
  );
}
