"use client";

import HeroSearchFormCard from "@/components/gallery/cards/HeroSearchFormCard";
import CheckEmailModalCard from "@/components/gallery/cards/CheckEmailModalCard";
import WaitlistConfirmedModalCard from "@/components/gallery/cards/WaitlistConfirmedModalCard";
import HeaderClusterCard from "@/components/gallery/cards/HeaderClusterCard";
import LeadersChartCard from "@/components/gallery/cards/LeadersChartCard";
import StatsGridCard from "@/components/gallery/cards/StatsGridCard";
import { WaitlistStatCardCard, ReferredStatCardCard } from "@/components/gallery/cards/StatCardsCards";
import LeaderboardTableCard from "@/components/gallery/cards/LeaderboardTableCard";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h2
        style={{
          color: "var(--fg-heading)",
          fontSize: "0.85rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: 0,
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border-muted)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>{children}</div>
    </section>
  );
}

export default function GalleryPage() {
  return (
    <main
      className="home-theme-scope"
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        padding: "4rem 1rem 6rem",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={{ marginBottom: "2.5rem", textAlign: "center" }}>
          <h1
            style={{
              color: "var(--fg-heading)",
              fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Gallery
          </h1>
          <p
            style={{
              color: "var(--fg-body)",
              maxWidth: 680,
              margin: "0.75rem auto 0",
              lineHeight: 1.55,
            }}
          >
            Each card shows a live, production-accurate UI element on top and a fully
            self-contained HTML snippet below — no Tailwind, no CSS variables, no external
            dependencies. The snippet swaps with the active theme (dark / light / monochrome).
            Copy or download and open in any browser.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          <Group title="Home page">
            <HeroSearchFormCard />
            <CheckEmailModalCard />
            <WaitlistConfirmedModalCard />
            <HeaderClusterCard />
          </Group>

          <Group title="/leaders">
            <LeadersChartCard />
            <StatsGridCard />
            <WaitlistStatCardCard />
            <ReferredStatCardCard />
            <LeaderboardTableCard />
          </Group>
        </div>
      </div>
    </main>
  );
}
