import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    backgroundImage: "https://www.zcashnames.com/brandkit/zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-landscape-16x9-1920x1080.png",
    overlay: "linear-gradient(115deg, rgba(7, 16, 14, 0.82), rgba(18, 46, 35, 0.7))",
    pillText: "Roadmap",
  });
}
