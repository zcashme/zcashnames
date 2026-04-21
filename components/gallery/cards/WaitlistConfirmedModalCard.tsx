"use client";

import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

const SUCCESS_SWATCH: Record<ThemeName, { bg: string; fg: string; solidButtonBg: string; solidButtonFg: string }> = {
  dark: {
    bg: "rgba(34, 197, 94, 0.15)",
    fg: "#22c55e",
    solidButtonBg: "#f0f0f0",
    solidButtonFg: "#0a0a0a",
  },
  light: {
    bg: "#dcfce7",
    fg: "#16a34a",
    solidButtonBg: "#111318",
    solidButtonFg: "#ffffff",
  },
  monochrome: {
    bg: "rgba(139, 172, 15, 0.2)",
    fg: "#9bbc0f",
    solidButtonBg: "#9bbc0f",
    solidButtonFg: "#0f380f",
  },
};

function WaitlistConfirmedView() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 28 * 16,
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--feature-card-bg)",
        border: "1px solid var(--faq-border)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
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
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
            marginBottom: 4,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--fg-heading)", margin: 0 }}>
          You&apos;re on the list!
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--fg-body)", lineHeight: 1.6, margin: 0 }}>
          We&apos;ll reach out before we launch.
        </p>

        <div
          style={{
            width: "100%",
            borderRadius: 12,
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            textAlign: "left",
            border: "1px solid var(--border-muted)",
          }}
        >
          <p style={{ fontSize: "0.75rem", color: "var(--fg-muted)", lineHeight: 1.6, margin: 0 }}>
            Get up to <strong style={{ color: "var(--fg-body)" }}>0.05 ZEC</strong> per referral who signs up and buys a
            name during early access, plus rewards from their referrals!
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Copy Link", icon: "copy" },
              { label: "Share Link", icon: "share" },
              { label: "Post on X", icon: "x" },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                style={{
                  flex: "1 1 140px",
                  minHeight: 38,
                  borderRadius: 10,
                  border: "1.5px solid var(--border-muted)",
                  background: "transparent",
                  color: "var(--fg-body)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.45rem",
                }}
              >
                {action.icon === "copy" && (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                {action.icon === "share" && (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                )}
                {action.icon === "x" && (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", width: "100%", paddingTop: 4, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{
              padding: "10px 24px",
              borderRadius: 999,
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            Take Survey
          </button>
          <button
            type="button"
            style={{
              padding: "10px 32px",
              borderRadius: 999,
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: "var(--fg-heading)",
              color: "var(--color-background)",
            }}
          >
            Done
          </button>
        </div>

        <p style={{ margin: 0, textAlign: "center", fontSize: "0.75rem", color: "var(--fg-muted)", lineHeight: 1.6 }}>
          <a href="/leaders/terms" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>
            View terms
          </a>
        </p>
      </div>
    </div>
  );
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  const success = SUCCESS_SWATCH[t];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You're on the list! - confirmed waitlist modal</title>
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
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
  }
  .modal {
    width: 100%;
    max-width: 28rem;
    border-radius: 16px;
    overflow: hidden;
    background: ${p.card};
    border: 1px solid ${p.borderMuted};
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
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
  .status-swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 999px;
    background: ${success.bg};
    color: ${success.fg};
    margin-bottom: 4px;
  }
  .status-swatch svg { width: 28px; height: 28px; }
  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${p.fgHeading};
    margin: 0;
  }
  p {
    margin: 0;
    color: ${p.fgBody};
  }
  .lede {
    font-size: 0.875rem;
    line-height: 1.6;
  }
  .referral {
    width: 100%;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: left;
    border: 1px solid ${p.borderMuted};
    box-sizing: border-box;
  }
  .referral p {
    font-size: 0.75rem;
    line-height: 1.6;
    color: ${p.fgMuted};
  }
  .referral strong {
    color: ${p.fgBody};
  }
  .action-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .action {
    flex: 1 1 140px;
    min-height: 38px;
    border-radius: 10px;
    border: 1.5px solid ${p.borderMuted};
    background: transparent;
    color: ${p.fgBody};
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
  }
  .action svg {
    width: 13px;
    height: 13px;
    flex: none;
  }
  .button-row {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    width: 100%;
    padding-top: 4px;
    flex-wrap: wrap;
  }
  .primary,
  .secondary {
    border: none;
    border-radius: 999px;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  .primary {
    padding: 10px 24px;
    background: ${p.primaryBg};
    color: ${p.primaryFg};
    box-shadow: ${p.primaryShadow};
  }
  .secondary {
    padding: 10px 32px;
    background: ${success.solidButtonBg};
    color: ${success.solidButtonFg};
  }
  .terms {
    font-size: 0.75rem;
    line-height: 1.6;
    color: ${p.fgMuted};
    text-align: center;
  }
  .terms a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
</head>
<body>
  <div class="overlay">
    <div class="modal">
      <div class="view">
        <span class="status-swatch" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2>You're on the list!</h2>
        <p class="lede">We'll reach out before we launch.</p>

        <div class="referral">
          <p>Get up to <strong>0.05 ZEC</strong> per referral who signs up and buys a name during early access, plus rewards from their referrals!</p>
          <div class="action-row">
            <button type="button" class="action">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Link
            </button>
            <button type="button" class="action">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share Link
            </button>
            <button type="button" class="action">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Post on X
            </button>
          </div>
        </div>

        <div class="button-row">
          <button type="button" class="primary">Take Survey</button>
          <button type="button" class="secondary">Done</button>
        </div>

        <p class="terms"><a href="/leaders/terms">View terms</a></p>
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

export default function WaitlistConfirmedModalCard() {
  return (
    <GalleryCard
      title="Home - Post-confirmed waitlist modal"
      description="Confirmed waitlist state after email verification. Success swatch, launch-copy, referral reward panel, share actions, survey CTA, Done action, and terms link."
      selector="div.fixed.inset-0.z-[10000] > div > div:nth-child(1) > div"
      filename="waitlist-confirmed-modal.html"
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
        <WaitlistConfirmedView />
      </div>
    </GalleryCard>
  );
}
