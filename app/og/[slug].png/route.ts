import { renderOgVariant } from "../route-utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { slug } = await params;
  return renderOgVariant(slug, request);
}
