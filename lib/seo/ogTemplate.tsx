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
  pillTextTransform?: "none" | "uppercase";
};

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export function renderOgImage({
  backgroundImage,
  overlay,
  pillText,
  pillBackground = "rgba(16, 185, 129, 0.92)",
  pillColor = "#ecfdf5",
  pillBorder = "rgba(236, 253, 245, 0.4)",
  pillFontSize = 34,
  pillFontWeight = 700,
  pillLetterSpacing = "-0.01em",
  pillPadding = "10px 20px",
  pillTextTransform = "none",
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
              background: pillBackground,
              color: pillColor,
              border: `1px solid ${pillBorder}`,
              borderRadius: 9999,
              padding: pillPadding,
              fontFamily: "Arial, sans-serif",
              fontSize: pillFontSize,
              fontWeight: pillFontWeight,
              letterSpacing: pillLetterSpacing,
              textAlign: "center",
              textTransform: pillTextTransform,
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
