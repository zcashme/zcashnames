import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    backgroundImage: "https://www.zcashnames.com/brandkit/zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-landscape-16x9-1920x1080.png",
    overlay: "linear-gradient(115deg, rgba(9, 19, 15, 0.8), rgba(16, 30, 23, 0.72))",
  });
}
