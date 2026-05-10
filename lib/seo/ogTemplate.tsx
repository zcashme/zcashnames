import { ImageResponse } from "next/og";

// OgRenderOptions controls the OG image composition:
// - backgroundImage: a URL to the full-bleed background
// - overlay: a CSS gradient/color string for the tint layer
// - pillText: optional badge text rendered in a green pill at the top

type OgRenderOptions = {
  backgroundImage: string;
  overlay: string;
  pillText?: string;
};

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

// Renders a 1200×630 social preview image via next/og ImageResponse.
// Composes a background image, gradient overlay, and optional status pill.
// Consumed by route handlers (e.g. /og/*) for dynamic OG:image meta tags.
export function renderOgImage({ backgroundImage, overlay, pillText }: OgRenderOptions): ImageResponse {
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
              background: "rgba(16, 185, 129, 0.92)",
              color: "#ecfdf5",
              border: "1px solid rgba(236, 253, 245, 0.4)",
              borderRadius: 9999,
              padding: "10px 20px",
              fontFamily: "Arial, sans-serif",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.01em",
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
