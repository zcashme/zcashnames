import { renderOgImage } from "@/lib/seo/ogTemplate";

export const runtime = "edge";

export async function GET() {
  return renderOgImage({
    backgroundImage:
      "https://www.zcashnames.com/brandkit/zcashnames-brand-lockups-stacked-primary-logo-light-landscape-16x9-1920x1080.png",
    overlay: "linear-gradient(115deg, rgba(9, 14, 19, 0.74), rgba(11, 22, 14, 0.64))",
    pillText: "Beta Invitation",
  });
}
