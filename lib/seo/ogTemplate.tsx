import { ImageResponse } from "next/og";

type OgRenderOptions = {
  backgroundImage: string;
  overlay: string;
};

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

export function renderOgImage({ backgroundImage, overlay }: OgRenderOptions): ImageResponse {
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
      </div>
    ),
    OG_IMAGE_SIZE
  );
}
