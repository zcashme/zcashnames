import fs from "node:fs/promises";
import path from "node:path";
import { renderOgImage, OG_VARIANTS, OG_IMAGE_SIZE } from "@/lib/seo/ogTemplate";

const ogBackgroundCache = new Map<string, Promise<string>>();

async function resolveOgBackgroundImage(src: string): Promise<string> {
  if (!src.startsWith("/brandkit/")) return src;

  const cached = ogBackgroundCache.get(src);
  if (cached) return cached;

  const nextValue = fs
    .readFile(path.join(process.cwd(), "public", src.replace(/^\//, "")))
    .then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`);

  ogBackgroundCache.set(src, nextValue);
  return nextValue;
}

function clampPillText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

async function renderCareersPillImage(pillText: string) {
  const variant = OG_VARIANTS.careers;
  const backgroundImage = await resolveOgBackgroundImage(variant.backgroundImage);

  return renderOgImage({
    ...variant,
    backgroundImage,
    pillText: clampPillText(pillText, 56),
  });
}

export function getCareersIndexOgImage() {
  return renderCareersPillImage("Careers");
}

export function getCareerJobOgImage(title: string) {
  return renderCareersPillImage(title);
}

export const CAREERS_OG_SIZE = OG_IMAGE_SIZE;
export const CAREERS_INDEX_OG_ALT = "Zcash Names careers";
