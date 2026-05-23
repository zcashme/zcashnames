import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/zns/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} Dashboard`,
    short_name: BRAND.name,
    description: "Referral dashboard for tracking referrals, estimated rewards, and leaderboard rank.",
    start_url: "/leaders/ref?source=pwa",
    scope: "/leaders/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png",
        sizes: "403x403",
        type: "image/png",
      },
      {
        src: "/landing/z5.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
