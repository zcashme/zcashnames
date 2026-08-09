import { notFound } from "next/navigation";
import { getOpenCareerJobBySlug } from "@/lib/careers";
import { getCareerJobOgImage } from "@/lib/seo/careersOg";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  let slug = "";
  try {
    const resolved = await context.params;
    slug = typeof resolved?.slug === "string" ? resolved.slug.trim() : "";
  } catch {
    slug = "";
  }

  // Fallback when Next collects route data without resolved params.
  if (!slug) {
    const leaf = new URL(request.url).pathname.split("/").filter(Boolean).pop() ?? "";
    slug = leaf.trim();
  }

  if (!slug) notFound();

  const job = await getOpenCareerJobBySlug(slug);
  if (!job) notFound();

  return getCareerJobOgImage(job.title);
}
