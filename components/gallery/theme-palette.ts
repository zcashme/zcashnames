import type { ThemeName } from "@/components/gallery/GalleryCard";

export interface Palette {
  background: string;
  card: string;
  surface: string;
  raised: string;
  fgHeading: string;
  fgBody: string;
  fgMuted: string;
  fgDim: string;
  border: string;
  borderMuted: string;

  // Leaders
  leadersCardBg: string;
  leadersCardBgSolid: string;
  leadersCardBorder: string;
  leadersTooltipBg: string;
  leadersTooltipBorder: string;
  leadersAreaReferred: string;
  leadersAreaNonReferred: string;
  leadersAreaRewards: string;
  leadersRankGold: string;
  leadersRankSilver: string;
  leadersRankBronze: string;
  leadersRankText: string;

  // Market help / stats
  marketActiveBg: string;
  marketHelpBg: string;
  marketHelpBorder: string;
  marketHelpText: string;
  partnerBorderHover: string;

  // Primary CTA
  primaryBg: string;
  primaryFg: string;
  primaryShadow: string;

  // Alert swatch (amber)
  alertBg: string;
  alertFg: string;
}

export const PALETTE: Record<ThemeName, Palette> = {
  dark: {
    background: "#0a0a0a",
    card: "#141414",
    surface: "#1a1a1a",
    raised: "#1e1e1e",
    fgHeading: "#f0f0f0",
    fgBody: "#d1d5db",
    fgMuted: "#8b8b8b",
    fgDim: "#6b7280",
    border: "#2a2a2a",
    borderMuted: "#333333",

    leadersCardBg: "rgba(255, 255, 255, 0.04)",
    leadersCardBgSolid: "#141414",
    leadersCardBorder: "rgba(255, 255, 255, 0.12)",
    leadersTooltipBg: "rgba(20, 20, 20, 0.92)",
    leadersTooltipBorder: "rgba(255, 255, 255, 0.15)",
    leadersAreaReferred: "#F4B728",
    leadersAreaNonReferred: "#3b82f6",
    leadersAreaRewards: "#22c55e",
    leadersRankGold: "linear-gradient(135deg, #F4B728, #ffe08b)",
    leadersRankSilver: "linear-gradient(135deg, #94a3b8, #cbd5e1)",
    leadersRankBronze: "linear-gradient(135deg, #cd7f32, #e6a55a)",
    leadersRankText: "#0a0a0a",

    marketActiveBg: "rgba(255, 255, 255, 0.11)",
    marketHelpBg: "rgba(255, 255, 255, 0.07)",
    marketHelpBorder: "rgba(255, 255, 255, 0.2)",
    marketHelpText: "#d1d5db",
    partnerBorderHover: "rgba(244, 183, 40, 0.58)",

    primaryBg: "linear-gradient(116deg, #d09a24 0%, #f4b728 62%, #ffe08b 100%)",
    primaryFg: "#1a1a1a",
    primaryShadow: "0 9px 17px rgba(0, 0, 0, 0.32)",

    alertBg: "rgba(244, 183, 40, 0.15)",
    alertFg: "#F4B728",
  },
  light: {
    background: "#fefcf7",
    card: "#ffffff",
    surface: "#f3f5fb",
    raised: "#f1f3f2",
    fgHeading: "#111318",
    fgBody: "#2e3553",
    fgMuted: "#5a6378",
    fgDim: "#7a8398",
    border: "#e5e7eb",
    borderMuted: "#d7dbe7",

    leadersCardBg: "rgba(255, 255, 255, 0.7)",
    leadersCardBgSolid: "#fffefc",
    leadersCardBorder: "rgba(126, 150, 196, 0.32)",
    leadersTooltipBg: "rgba(255, 255, 255, 0.95)",
    leadersTooltipBorder: "rgba(126, 150, 196, 0.35)",
    leadersAreaReferred: "#F4B728",
    leadersAreaNonReferred: "#3b82f6",
    leadersAreaRewards: "#22c55e",
    leadersRankGold: "linear-gradient(135deg, #F4B728, #ffe08b)",
    leadersRankSilver: "linear-gradient(135deg, #94a3b8, #cbd5e1)",
    leadersRankBronze: "linear-gradient(135deg, #cd7f32, #e6a55a)",
    leadersRankText: "#1a1a1a",

    marketActiveBg: "rgba(51, 62, 89, 0.12)",
    marketHelpBg: "rgba(255, 255, 255, 0.86)",
    marketHelpBorder: "rgba(126, 150, 196, 0.35)",
    marketHelpText: "#2e3553",
    partnerBorderHover: "rgba(244, 183, 40, 0.58)",

    primaryBg: "linear-gradient(116deg, #2a6be6 0%, #2b8feb 62%, #46b7ff 100%)",
    primaryFg: "#ffffff",
    primaryShadow: "0 9px 17px rgba(33, 78, 158, 0.22)",

    alertBg: "rgba(244, 183, 40, 0.18)",
    alertFg: "#c08412",
  },
  monochrome: {
    background: "#0f380f",
    card: "#306230",
    surface: "#306230",
    raised: "#306230",
    fgHeading: "#9bbc0f",
    fgBody: "#8bac0f",
    fgMuted: "#8bac0f",
    fgDim: "#306230",
    border: "#306230",
    borderMuted: "rgba(139, 172, 15, 0.46)",

    leadersCardBg: "rgba(48, 98, 48, 0.42)",
    leadersCardBgSolid: "#1e4a1e",
    leadersCardBorder: "rgba(139, 172, 15, 0.46)",
    leadersTooltipBg: "rgba(15, 56, 15, 0.92)",
    leadersTooltipBorder: "rgba(139, 172, 15, 0.46)",
    leadersAreaReferred: "#F4B728",
    leadersAreaNonReferred: "#3b82f6",
    leadersAreaRewards: "#22c55e",
    leadersRankGold: "linear-gradient(135deg, #9bbc0f, #8bac0f)",
    leadersRankSilver: "linear-gradient(135deg, #8bac0f, #306230)",
    leadersRankBronze: "linear-gradient(135deg, #8bac0f, #306230)",
    leadersRankText: "#0f380f",

    marketActiveBg: "rgba(155, 188, 15, 0.16)",
    marketHelpBg: "rgba(48, 98, 48, 0.7)",
    marketHelpBorder: "rgba(139, 172, 15, 0.46)",
    marketHelpText: "#9bbc0f",
    partnerBorderHover: "rgba(155, 188, 15, 0.8)",

    primaryBg:
      "linear-gradient(116deg, rgba(139, 172, 15, 0.9) 0%, rgba(155, 188, 15, 0.9) 100%)",
    primaryFg: "#0f380f",
    primaryShadow: "0 9px 17px rgba(15, 56, 15, 0.52)",

    alertBg: "rgba(155, 188, 15, 0.2)",
    alertFg: "#9bbc0f",
  },
};
