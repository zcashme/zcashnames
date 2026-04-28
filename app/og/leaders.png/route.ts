import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    eyebrow: "LEADERS",
    title: "Leaders | ZcashNames",
    subtitle: "Global referral rankings, growth, and rewards progress.",
    theme: {
      background: "#111827",
      accent: "#f59e0b",
    },
  });
}
