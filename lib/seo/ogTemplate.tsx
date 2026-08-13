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

const BASE = "/brandkit";
const BG = {
  light: `${BASE}/zcashnames-brand-lockups-stacked-primary-logo-light-landscape-16x9-1920x1080.png`,
  dark: `${BASE}/zcashnames-brand-lockups-stacked-primary-logo-dark-landscape-16x9-1920x1080.png`,
  mono: `${BASE}/zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-landscape-16x9-1920x1080.png`,
} as const;

// Official monochrome brand kit colors (see brand-kit/README.md).
const BRAND = {
  monoLight: "#9bbc0f", // brandmark / logo green
  monoDark: "#0f380f", // monochrome background green
  black: "#0a0a0a",
} as const;

// Green pill on light (white) or dark (black) brand lockups: brand green fill, black text.
const PILL_ON_LIGHT_OR_DARK = {
  pillBackground: BRAND.monoLight,
  pillColor: BRAND.black,
  pillBorder: BRAND.monoLight,
} as const;

// Green pill on monochrome green base: brandmark green fill, dark green text.
const PILL_ON_MONO = {
  pillBackground: BRAND.monoLight,
  pillColor: BRAND.monoDark,
  pillBorder: BRAND.monoLight,
} as const;

const LIGHT_OVERLAY = "linear-gradient(115deg, rgba(9, 14, 19, 0.74), rgba(11, 22, 14, 0.64))";
const LIGHT_COOL_OVERLAY = "linear-gradient(115deg, rgba(8, 16, 24, 0.78), rgba(7, 28, 46, 0.62))";
const DARK_OVERLAY = "linear-gradient(115deg, rgba(8, 12, 20, 0.78), rgba(20, 41, 26, 0.58))";
const DARK_WARM_OVERLAY = "linear-gradient(115deg, rgba(8, 12, 20, 0.78), rgba(34, 22, 5, 0.60))";
const DARK_TEAL_OVERLAY = "linear-gradient(115deg, rgba(8, 13, 20, 0.80), rgba(8, 34, 30, 0.68))";
const MONO_OVERLAY = "linear-gradient(115deg, rgba(7, 16, 14, 0.82), rgba(18, 46, 35, 0.70))";
const MONO_SOFT_OVERLAY = "linear-gradient(115deg, rgba(9, 19, 15, 0.80), rgba(16, 30, 23, 0.72))";

export const OG_VARIANTS: Record<string, Omit<OgRenderOptions, "pillText"> & { pillText?: string }> = {
  home: { backgroundImage: BG.light, overlay: LIGHT_OVERLAY, ...PILL_ON_LIGHT_OR_DARK },
  explorer: {
    backgroundImage: BG.light,
    overlay: LIGHT_COOL_OVERLAY,
    pillText: "Explorer",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  beta: {
    backgroundImage: BG.light,
    overlay: LIGHT_OVERLAY,
    pillText: "Beta Invitation",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  careers: {
    backgroundImage: BG.dark,
    overlay: DARK_WARM_OVERLAY,
    pillText: "Careers",
    pillBackground: "rgba(244, 183, 40, 0.16)",
    pillColor: "#f7c852",
    pillBorder: "rgba(247, 200, 82, 0.42)",
  },
  sharekit: {
    backgroundImage: BG.dark,
    overlay: DARK_OVERLAY,
    pillText: "Share Kit",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  leaders: {
    backgroundImage: BG.dark,
    overlay: DARK_WARM_OVERLAY,
    pillText: "Leaderboard",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  "leaders-ref": {
    backgroundImage: BG.dark,
    overlay: DARK_TEAL_OVERLAY,
    ...PILL_ON_LIGHT_OR_DARK,
  },
  roadmap: {
    backgroundImage: BG.mono,
    overlay: MONO_OVERLAY,
    pillText: "Roadmap",
    ...PILL_ON_MONO,
    pillFontSize: 26,
    pillFontWeight: 600,
    pillLetterSpacing: "0.12em",
    pillPadding: "10px 18px",
    pillTextTransform: "uppercase",
  },
  "leaders-terms": {
    backgroundImage: BG.mono,
    overlay: MONO_SOFT_OVERLAY,
    pillText: "Referral Terms",
    ...PILL_ON_MONO,
  },
  faq: {
    backgroundImage: BG.light,
    overlay: LIGHT_OVERLAY,
    pillText: "FAQ",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  community: {
    backgroundImage: BG.dark,
    overlay: DARK_OVERLAY,
    pillText: "Community",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  brandkit: {
    backgroundImage: BG.dark,
    overlay: DARK_WARM_OVERLAY,
    pillText: "Brand Kit",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  indexers: {
    backgroundImage: BG.light,
    overlay: LIGHT_COOL_OVERLAY,
    pillText: "Indexers",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  protected: {
    backgroundImage: BG.dark,
    overlay: DARK_TEAL_OVERLAY,
    pillText: "Protected Names",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  "protected-suggest": {
    backgroundImage: BG.dark,
    overlay: DARK_TEAL_OVERLAY,
    pillText: "Suggest Protected Names",
    pillFontSize: 28,
    ...PILL_ON_LIGHT_OR_DARK,
  },
  "protected-dispute": {
    backgroundImage: BG.dark,
    overlay: DARK_TEAL_OVERLAY,
    pillText: "Dispute Protected Names",
    pillFontSize: 28,
    ...PILL_ON_LIGHT_OR_DARK,
  },
  "waitlist-view": {
    backgroundImage: BG.light,
    overlay: LIGHT_OVERLAY,
    pillText: "Waitlist",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  reserve: {
    backgroundImage: BG.light,
    overlay: LIGHT_OVERLAY,
    pillText: "Reserve your position",
    pillFontSize: 28,
    ...PILL_ON_LIGHT_OR_DARK,
  },
  namepost: {
    backgroundImage: BG.dark,
    overlay: DARK_OVERLAY,
    pillText: "Create Post",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  collections: {
    backgroundImage: BG.light,
    overlay: LIGHT_COOL_OVERLAY,
    pillText: "Collections",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  blogs: {
    backgroundImage: BG.dark,
    overlay: DARK_OVERLAY,
    pillText: "Blog",
    ...PILL_ON_LIGHT_OR_DARK,
  },
  docs: {
    backgroundImage: BG.mono,
    overlay: MONO_OVERLAY,
    pillText: "Docs",
    ...PILL_ON_MONO,
  },
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
              background: pillBackground ?? PILL_ON_LIGHT_OR_DARK.pillBackground,
              color: pillColor ?? PILL_ON_LIGHT_OR_DARK.pillColor,
              border: `1px solid ${pillBorder ?? PILL_ON_LIGHT_OR_DARK.pillBorder}`,
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
