import { notFound } from "next/navigation";
import { renderOgVariant } from "../route-utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = typeof rawSlug === "string" ? rawSlug.trim() : "";
  if (!slug) notFound();
  return renderOgVariant(slug, request);
}
