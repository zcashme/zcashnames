"use client";

import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

function HomeLeaderboardLinkView() {
  return (
    <a
      href="/leaders"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        borderRadius: 999,
        border: "1px solid var(--home-result-link-border)",
        background: "transparent",
        padding: "0.5rem 1rem",
        color: "var(--home-result-link-fg)",
        fontSize: "1.02rem",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
        <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6.5L13.1 8.8L15.6 9.1L13.8 10.8L14.2 13.3L12 12.1L9.8 13.3L10.2 10.8L8.4 9.1L10.9 8.8L12 6.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      Leaderboard →
    </a>
  );
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Home - Leaderboard link pill</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 999px;
    border: 1px solid ${p.marketHelpBorder};
    background: transparent;
    padding: 0.5rem 1rem;
    color: ${p.marketHelpText};
    font-size: 1.02rem;
    font-weight: 600;
    text-decoration: none;
    transition: transform 140ms ease, background-color 140ms ease;
  }
  .link:hover {
    transform: translateY(-1px);
    background: ${p.marketHelpBg};
  }
  .icon {
    width: 1.08em;
    height: 1.08em;
    flex: none;
  }
</style>
</head>
<body>
  <div class="stage">
    <a class="link" href="/leaders">
      <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 21L12 17L16 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8 21V14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M16 21V14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="12" cy="10" r="6" stroke="currentColor" stroke-width="1.5" />
        <path d="M12 6.5L13.1 8.8L15.6 9.1L13.8 10.8L14.2 13.3L12 12.1L9.8 13.3L10.2 10.8L8.4 9.1L10.9 8.8L12 6.5Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" />
      </svg>
      Leaderboard →
    </a>
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

export default function HomeLeaderboardLinkCard() {
  return (
    <GalleryCard
      title="Home - Leaderboard link"
      description="Centered pill link below the hero in waitlist mode, linking into the leaders page."
      selector="body > div.home-theme-scope > div.relative.z-\\[2\\].-mt-4.mb-2.flex.justify-center > a"
      filename="home-leaderboard-link.html"
      snippets={SNIPPETS}
    >
      <div
        className="home-theme-scope"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <HomeLeaderboardLinkView />
      </div>
    </GalleryCard>
  );
}
