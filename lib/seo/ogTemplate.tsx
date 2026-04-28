import { ImageResponse } from "next/og";

export type OgTheme = {
  background: string;
  accent: string;
};

type OgRenderOptions = {
  eyebrow: string;
  title: string;
  subtitle: string;
  theme: OgTheme;
};

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export function renderOgImage({ eyebrow, title, subtitle, theme }: OgRenderOptions): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: theme.background,
          color: "#f9fafb",
          padding: "52px 64px",
          position: "relative",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 420,
            height: 420,
            borderRadius: "9999px",
            background: theme.accent,
            opacity: 0.22,
            transform: "translate(160px, -130px)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 14, zIndex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: "9999px", background: theme.accent }} />
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>ZcashNames</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, zIndex: 1 }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.14em",
              fontWeight: 700,
              color: "#d1d5db",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              fontWeight: 800,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.2, color: "#e5e7eb", maxWidth: 980 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: "#d1d5db", zIndex: 1 }}>
          zcashnames.com
        </div>
      </div>
    ),
    OG_IMAGE_SIZE
  );
}
