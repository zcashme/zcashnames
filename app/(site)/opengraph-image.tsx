import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/zns/brand";

export const alt = "ZcashNames - Personal names for shielded addresses.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          gap: "24px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND.logo}
          alt=""
          width={120}
          height={120}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-2px",
            }}
          >
            ZcashNames
          </span>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "#888888",
            }}
          >
            Personal names for shielded addresses.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
