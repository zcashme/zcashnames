import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    eyebrow: "REFERRAL DASH",
    title: "Referral Dashboard | ZcashNames",
    subtitle: "Your referral dashboard for rewards progress.",
    theme: {
      background: "#111827",
      accent: "#10b981",
    },
  });
}
