"use client";

import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";

interface ThemeTokens {
  pageBg: string;
  shellBg: string;
  shellBorder: string;
  shellShadow: string;
  inputColor: string;
  placeholderColor: string;
  suffixColor: string;
  claimBg: string;
  claimShadow: string;
  claimHoverShadow: string;
  claimText: string;
  sheenFrom: string;
  sheenTo: string;
  subtitleColor: string;
}

const TOKENS: Record<ThemeName, ThemeTokens> = {
  dark: {
    pageBg: "#0a0a0a",
    shellBg: "#1a1a1a",
    shellBorder: "1px solid #333333",
    shellShadow: "0 8px 22px rgba(49, 65, 99, 0.1)",
    inputColor: "#d1d5db",
    placeholderColor: "#555555",
    suffixColor: "#555555",
    claimBg: "linear-gradient(116deg, #d09a24 0%, #f4b728 62%, #ffe08b 100%)",
    claimShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 0 0 1px rgba(244, 183, 40, 0.28), 0 10px 20px rgba(0, 0, 0, 0.35), 0 6px 16px rgba(244, 183, 40, 0.16)",
    claimHoverShadow:
      "inset 0 0 0 2px rgba(255, 255, 255, 0.95), 0 12px 20px rgba(33, 78, 158, 0.3)",
    claimText: "#1a1a1a",
    sheenFrom: "rgba(255, 255, 255, 0.25)",
    sheenTo: "rgba(255, 255, 255, 0)",
    subtitleColor: "#d1d5db",
  },
  light: {
    pageBg: "#fefcf7",
    shellBg: "#f3f5fb",
    shellBorder: "1px solid #d7dbe7",
    shellShadow: "0 8px 22px rgba(49, 65, 99, 0.1)",
    inputColor: "#5a6074",
    placeholderColor: "#a6adbc",
    suffixColor: "#69708a",
    claimBg: "linear-gradient(118deg, #2a6be6 0%, #2b8feb 54%, #2dc7ce 100%)",
    claimShadow:
      "inset 0 0 0 2px rgba(255, 255, 255, 0.9), 0 10px 18px rgba(33, 78, 158, 0.22)",
    claimHoverShadow:
      "inset 0 0 0 2px rgba(255, 255, 255, 0.95), 0 12px 20px rgba(33, 78, 158, 0.3)",
    claimText: "#ffffff",
    sheenFrom: "rgba(255, 255, 255, 0.25)",
    sheenTo: "rgba(255, 255, 255, 0)",
    subtitleColor: "#2e3553",
  },
  monochrome: {
    pageBg: "#0f380f",
    shellBg: "#306230",
    shellBorder: "1px solid rgba(139, 172, 15, 0.46)",
    shellShadow: "0 8px 22px rgba(15, 56, 15, 0.44)",
    inputColor: "#9bbc0f",
    placeholderColor: "#8bac0f",
    suffixColor: "#9bbc0f",
    claimBg:
      "linear-gradient(180deg, rgba(155, 188, 15, 0.88) 0%, rgba(139, 172, 15, 0.88) 100%)",
    claimShadow:
      "inset 0 0 0 2px rgba(155, 188, 15, 0.5), 0 10px 18px rgba(15, 56, 15, 0.44)",
    claimHoverShadow:
      "inset 0 0 0 2px rgba(155, 188, 15, 0.62), 0 12px 20px rgba(15, 56, 15, 0.56)",
    claimText: "#0f380f",
    sheenFrom: "rgba(155, 188, 15, 0.6)",
    sheenTo: "rgba(155, 188, 15, 0)",
    subtitleColor: "#8bac0f",
  },
};

function buildSnippet(t: ThemeTokens): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Hero Search Form</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${t.pageBg};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }

  .stage {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 4rem 1rem;
  }

  /* Container — mirrors: w-full max-w-4xl flex flex-col items-center gap-3 */
  .sf-container {
    width: 100%;
    max-width: 56rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
  }

  .sf-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 56rem;
    gap: 0.75rem;
  }

  /* Shell */
  .sf-shell {
    --sf-h: clamp(56px, 6.8vw, 72px);
    position: relative;
    width: 100%;
    min-height: var(--sf-h);
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 999px;
    background: ${t.shellBg};
    overflow: hidden;
    box-shadow: ${t.shellShadow};
  }

  .sf-shell::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    border: ${t.shellBorder};
  }

  /* Input area */
  .sf-main {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    height: calc(var(--sf-h) - 8px);
    display: flex;
    align-items: center;
    padding: 0 14px 0 14px;
  }

  .sf-input-stack {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  .sf-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: inline-flex;
    align-items: center;
    min-width: 0;
    white-space: nowrap;
    padding: 0 0 0 clamp(10px, 1.15vw, 18px);
    font-size: clamp(1.05rem, 2.1vw, 1.5rem);
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1;
  }

  .sf-overlay-value.placeholder { color: ${t.placeholderColor}; }
  .sf-overlay-suffix { color: ${t.suffixColor}; }

  .sf-input {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    height: 100%;
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: transparent;
    caret-color: ${t.inputColor};
    text-align: left;
    font-family: inherit;
    font-size: clamp(1.05rem, 2.1vw, 1.5rem);
    font-weight: 700;
    line-height: 1;
    padding: 0 0 0 clamp(10px, 1.15vw, 18px);
  }

  /* Waitlist badge (pill with circular cut-out overlapping the circular button) */
  .sf-badge {
    display: inline-flex;
    align-items: center;
    height: calc(var(--sf-h) - 8px);
    padding: 0 calc((var(--sf-h) - 8px) * 0.75 + 6px) 0 16px;
    border-radius: 999px;
    border: none;
    background: ${t.claimBg};
    color: ${t.claimText};
    cursor: pointer;
    font-family: inherit;
    font-size: clamp(1.05rem, 2.1vw, 1.5rem);
    font-weight: 700;
    letter-spacing: 0;
    white-space: nowrap;
    user-select: none;
    margin-right: calc((var(--sf-h) - 8px) * -0.75);
    -webkit-mask-image: radial-gradient(
      circle calc((var(--sf-h) - 8px) / 2 + 3px) at calc(100% - (var(--sf-h) - 8px) * 0.25) 50%,
      transparent 99%,
      black 100%
    );
            mask-image: radial-gradient(
      circle calc((var(--sf-h) - 8px) / 2 + 3px) at calc(100% - (var(--sf-h) - 8px) * 0.25) 50%,
      transparent 99%,
      black 100%
    );
  }

  @media (max-width: 640px) { .sf-badge { display: none; } }

  /* Circular claim button */
  .sf-claim {
    position: relative;
    z-index: 1;
    flex: 0 0 calc(var(--sf-h) - 8px);
    height: calc(var(--sf-h) - 8px);
    width: calc(var(--sf-h) - 8px);
    min-width: calc(var(--sf-h) - 8px);
    border: none;
    border-radius: 999px;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${t.claimBg};
    color: ${t.claimText};
    box-shadow: ${t.claimShadow};
    transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
  }

  .sf-claim::before {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(180deg, ${t.sheenFrom}, ${t.sheenTo});
  }

  .sf-claim:hover {
    box-shadow: ${t.claimHoverShadow};
    filter: saturate(1.05);
  }

  .sf-claim svg {
    width: clamp(19px, 1.75vw, 26px);
    height: clamp(19px, 1.75vw, 26px);
    stroke: currentColor;
    stroke-width: 3;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Subtitle */
  .sf-subtitle {
    margin: 0;
    color: ${t.subtitleColor};
    letter-spacing: -0.01em;
    font-size: clamp(1.04rem, 1.2vw, 1.2rem);
    text-align: center;
  }

  .sf-subtitle svg {
    display: inline-block;
    vertical-align: 0.25em;
    width: 1.2em;
    height: 1.2em;
    margin-left: 0.25em;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="sf-container">
      <form class="sf-form" onsubmit="event.preventDefault()">
        <div class="sf-shell">
          <div class="sf-main">
            <div class="sf-input-stack">
              <span class="sf-overlay" aria-hidden="true">
                <span class="sf-overlay-value placeholder">yourname</span>
                <span class="sf-overlay-suffix">.zcash</span>
              </span>
              <input
                class="sf-input"
                type="text"
                spellcheck="false"
                autocapitalize="off"
                autocorrect="off"
                aria-label="Enter your desired ZcashName"
              />
            </div>
          </div>
          <button type="button" class="sf-badge">Get Early Access &nbsp;</button>
          <button type="button" class="sf-claim" aria-label="Next">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>

      <p class="sf-subtitle">
        Be first to claim a name you can use, hold, or sell.<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 16 C10 16 14 10 14 2 M8 8 L14 2 L20 8" /></svg>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

const SNIPPETS: Snippets = {
  dark: buildSnippet(TOKENS.dark),
  light: buildSnippet(TOKENS.light),
  monochrome: buildSnippet(TOKENS.monochrome),
};

export default function HeroSearchFormCard() {
  return (
    <GalleryCard
      title="Hero — Waitlist entry form + subtitle"
      description="Initial unfocused state of the waitlist search form rendered inside the hero section: pill shell, locked .zcash suffix, Early Access badge with circular cut-out, arrow button, and the CTA subtitle with up-right arrow."
      selector="section.hero-stage-bg > section > div > div > div.max-w-2xl.sm:max-w-3xl.xl:max-w-4xl"
      filename="hero-search-form.html"
      snippets={SNIPPETS}
    >
      <div className="home-theme-scope" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div className="w-full max-w-2xl sm:max-w-3xl xl:max-w-4xl self-center flex flex-col items-center gap-3">
          <WaitlistEntryForm usdPerZec={null} onConfirm={() => {}} onReset={() => {}} />
          <p
            className="type-section-subtitle text-center"
            style={{ color: "var(--fg-body)", letterSpacing: "-0.01em" }}
          >
            Be first to claim a name you can use, hold, or sell.
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
        </div>
      </div>
    </GalleryCard>
  );
}
