import { ImageResponse } from "next/og";

type OgRenderOptions = {
  backgroundImage: string;
  overlay: string;
  pillText?: string;
  pillBackground?: string;
  pillColor?: string;
  pillBorder?: string;
  pillFontSize?: number;
  pillFontWeight?: number;
  pillLetterSpacing?: string;
  pillPadding?: string;
  pillTextTransform?: "uppercase" | "lowercase" | "none";
};

const BASE = "https://www.zcashnames.com/brandkit";
const BG = {
  light: `${BASE}/zcashnames-brand-lockups-stacked-primary-logo-light-landscape-16x9-1920x1080.png`,
  dark: `${BASE}/zcashnames-brand-lockups-stacked-primary-logo-dark-landscape-16x9-1920x1080.png`,
  mono: `${BASE}/zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-landscape-16x9-1920x1080.png`,
} as const;

export const OG_VARIANTS: Record<string, Omit<OgRenderOptions, "pillText"> & { pillText?: string }> = {
  home:          { backgroundImage: BG.light, overlay: "linear-gradient(115deg, rgba(9, 14, 19, 0.74), rgba(11, 22, 14, 0.64))" },
  explorer:      { backgroundImage: BG.light, overlay: "linear-gradient(115deg, rgba(8, 16, 24, 0.78), rgba(7, 28, 46, 0.62))" },
  beta:          { backgroundImage: BG.light, overlay: "linear-gradient(115deg, rgba(9, 14, 19, 0.74), rgba(11, 22, 14, 0.64))", pillText: "Beta Invitation" },
  sharekit:      { backgroundImage: BG.dark,  overlay: "linear-gradient(115deg, rgba(8, 12, 20, 0.78), rgba(20, 41, 26, 0.58))" },
  leaders:       { backgroundImage: BG.dark,  overlay: "linear-gradient(115deg, rgba(8, 12, 20, 0.78), rgba(34, 22, 5, 0.60))" },
  "leaders-ref": { backgroundImage: BG.dark,  overlay: "linear-gradient(115deg, rgba(8, 13, 20, 0.80), rgba(8, 34, 30, 0.68))" },
  roadmap:       {
    backgroundImage: BG.mono,
    overlay: "linear-gradient(115deg, rgba(7, 16, 14, 0.82), rgba(18, 46, 35, 0.70))",
    pillText: "Roadmap",
    pillBackground: "transparent",
    pillColor: "#9bbc0f",
    pillBorder: "#9bbc0f",
    pillFontSize: 26,
    pillFontWeight: 600,
    pillLetterSpacing: "0.12em",
    pillPadding: "10px 18px",
    pillTextTransform: "uppercase",
  },
  "leaders-terms": { backgroundImage: BG.mono, overlay: "linear-gradient(115deg, rgba(9, 19, 15, 0.80), rgba(16, 30, 23, 0.72))" },
};

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

// Renders a 1200×630 social preview image via next/og ImageResponse.
// Composes a background image, gradient overlay, and optional status pill.
// Consumed by route handlers (e.g. /og/*) for dynamic OG:image meta tags.
export function renderOgImage({
  backgroundImage,
  overlay,
  pillText,
  pillBackground,
  pillColor,
  pillBorder,
  pillFontSize,
  pillFontWeight,
  pillLetterSpacing,
  pillPadding,
  pillTextTransform,
}: OgRenderOptions): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: overlay,
          }}
        />
        {pillText ? (
          <div
            style={{
              position: "absolute",
              top: 40,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: pillBackground ?? "rgba(16, 185, 129, 0.92)",
              color: pillColor ?? "#ecfdf5",
              border: `1px solid ${pillBorder ?? "rgba(236, 253, 245, 0.4)"}`,
              borderRadius: 9999,
              padding: pillPadding ?? "10px 20px",
              fontFamily: "Arial, sans-serif",
              fontSize: pillFontSize ?? 34,
              fontWeight: pillFontWeight ?? 700,
              letterSpacing: pillLetterSpacing ?? "-0.01em",
              textTransform: pillTextTransform ?? "none",
              textAlign: "center",
              whiteSpace: "nowrap",
              maxWidth: 1040,
            }}
          >
            {pillText}
          </div>
        ) : null}
      </div>
    ),
    OG_IMAGE_SIZE
  );
}
