import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    eyebrow: "TERMS",
    title: "Leaders Terms | ZcashNames",
    subtitle: "Referral rewards and early access terms.",
    theme: {
      background: "#1f2937",
      accent: "#3b82f6",
    },
  });
}
