import { notFound } from "next/navigation";
import { getOpenCareerJobBySlug } from "@/lib/careers";
import { getCareerJobOgImage } from "@/lib/seo/careersOg";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const job = await getOpenCareerJobBySlug(slug);

  if (!job) notFound();

  return getCareerJobOgImage(job.title);
}
