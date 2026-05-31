import fs from "node:fs/promises";
import path from "node:path";
import { OG_VARIANTS, renderOgImage } from "@/lib/seo/ogTemplate";
import { notFound } from "next/navigation";

const ogBackgroundCache = new Map<string, Promise<string>>();

function resolveOgBackgroundImage(src: string): Promise<string> {
  if (!src.startsWith("/brandkit/")) return Promise.resolve(src);

  const cached = ogBackgroundCache.get(src);
  if (cached) return cached;

  const nextValue = fs
    .readFile(path.join(process.cwd(), "public", src.replace(/^\//, "")))
    .then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`);

  ogBackgroundCache.set(src, nextValue);
  return nextValue;
}

export async function renderOgVariant(slug: string, request: Request) {
  const variant = OG_VARIANTS[slug];
  if (!variant) notFound();

  const { searchParams } = new URL(request.url);
  const dynamicPill =
    slug === "home"
      ? searchParams.get("inviter")?.trim() ?? searchParams.get("pill")?.trim()
      : searchParams.get("pill")?.trim();
  const pillText =
    slug === "home" && dynamicPill
      ? `You're invited by ${dynamicPill}`
      : variant.pillText ?? dynamicPill ?? undefined;
  const backgroundImage = await resolveOgBackgroundImage(variant.backgroundImage);

  return renderOgImage({ ...variant, backgroundImage, pillText });
}
