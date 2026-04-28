import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    eyebrow: "HOME",
    title: "ZcashNames",
    subtitle: "Claim yours.",
    theme: {
      background: "#101518",
      accent: "#22c55e",
    },
  });
}
