import { getCareersIndexOgImage } from "@/lib/seo/careersOg";

export const runtime = "nodejs";

export async function GET() {
  return getCareersIndexOgImage();
}
