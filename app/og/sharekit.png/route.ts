import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    backgroundImage: "https://www.zcashnames.com/brandkit/zcashnames-brand-lockups-stacked-primary-logo-dark-landscape-16x9-1920x1080.png",
    overlay: "linear-gradient(115deg, rgba(8, 12, 20, 0.78), rgba(20, 41, 26, 0.58))",
  });
}
