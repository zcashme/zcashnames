import { OG_VARIANTS, renderOgImage } from "@/lib/seo/ogTemplate";
import { notFound } from "next/navigation";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { slug } = await params;
  const variant = OG_VARIANTS[slug];
  if (!variant) notFound();

  const { searchParams } = new URL(request.url);
  // home supports ?inviter= for referral-based social previews
  const dynamicPill = slug === "home"
    ? searchParams.get("inviter") ?? searchParams.get("pill")
    : searchParams.get("pill");
  const pillText = variant.pillText ?? dynamicPill ?? undefined;

  return renderOgImage({ ...variant, pillText });
}
