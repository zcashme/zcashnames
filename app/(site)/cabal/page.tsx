import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import CabalAccessGate from "@/components/influencer/CabalAccessGate";
import InfluencerDeck, { type InfluencerSlide } from "@/components/influencer/InfluencerDeck";
import { readCurrentCabalInvite } from "@/lib/cabal/access";

export const metadata: Metadata = {
  title: "Cabal - ZcashNames",
  description: "ZcashNames cabal deck.",
  robots: { index: false, follow: false, nocache: true },
};

const MARKDOWN_PATH = path.join(process.cwd(), "deck", "influencer.md");
const PROTECTED_PLACEHOLDER =
  "### Equity (Password Protected)\n\nThis section is locked and is not displayed on the public influencer deck.";

function getFrontmatterValue(markdown: string, key: string): string {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!frontmatter) return "";

  const line = frontmatter[1].match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "im"));
  return line?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "");
}

function stripToc(markdown: string): string {
  return markdown.replace(/^\s*\[toc\]\s*$/gim, "");
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "slide";
}

function getSlideHeading(content: string, index: number, locked: boolean): { title: string; level: number } {
  if (locked) return { title: "Equity", level: 3 };

  const heading = content.match(/^\s{0,3}(#{1,6})\s+(.+)$/m);
  if (!heading) return { title: `Slide ${index + 1}`, level: 1 };

  const title = heading[2]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .trim() || `Slide ${index + 1}`;

  return { title, level: heading[1].length };
}

function isBlankRootSlide(content: string, headingLevel: number, locked: boolean): boolean {
  if (locked || headingLevel !== 1) return false;
  return content.replace(/^\s{0,3}#{1,6}\s+.+$/m, "").trim() === "";
}

function addTocNumbers(slides: Omit<InfluencerSlide, "tocNumber">[]): InfluencerSlide[] {
  const counters: number[] = [];
  let rootNumber = 0;

  const numberedSlides = slides.map((slide) => {
    if (slide.headingLevel <= 1) {
      rootNumber += 1;
      counters.length = 0;
      return { ...slide, tocNumber: String(rootNumber) };
    }

    if (rootNumber === 0) rootNumber = 1;

    const depth = slide.headingLevel - 1;
    for (let i = 1; i <= depth; i += 1) {
      counters[i] ??= 0;
    }
    counters[depth] += 1;
    counters.length = depth + 1;

    const childNumbers = counters.slice(1, depth + 1).map((value) => value || 1);
    return { ...slide, tocNumber: [rootNumber, ...childNumbers].join(".") };
  });

  return numberedSlides.map((slide) => {
    if (!isBlankRootSlide(slide.content, slide.headingLevel, !!slide.locked)) return slide;

    const overviewItems = numberedSlides
      .filter((candidate) => candidate.tocNumber.startsWith(`${slide.tocNumber}.`))
      .map((candidate) => ({
        slideId: candidate.id,
        tocNumber: candidate.tocNumber,
        title: candidate.title,
      }));

    return { ...slide, overviewItems };
  });
}

function parseSlides(markdown: string): InfluencerSlide[] {
  const seen = new Map<string, number>();

  const slides = stripToc(stripFrontmatter(markdown))
    .split(/^\s*---\s*$/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((content, index) => {
      const locked = /Equity\s*\(Password Protected\)/i.test(content);
      const { title, level } = getSlideHeading(content, index, locked);
      const baseId = slugify(title);
      const count = seen.get(baseId) ?? 0;
      seen.set(baseId, count + 1);

      return {
        id: count === 0 ? baseId : `${baseId}-${count + 1}`,
        title,
        headingLevel: level,
        locked,
        content: locked ? PROTECTED_PLACEHOLDER : content,
      };
    });

  return addTocNumbers(slides);
}

export default async function InfluencerPage() {
  const markdown = await fs.readFile(MARKDOWN_PATH, "utf8");
  const slides = parseSlides(markdown);
  const deckTitle = getFrontmatterValue(markdown, "title");
  const currentInvite = await readCurrentCabalInvite();

  if (!currentInvite) return <CabalAccessGate deckTitle={deckTitle} />;

  return (
    <InfluencerDeck
      slides={slides}
      deckTitle={deckTitle}
      initialCommentName={currentInvite.displayName}
    />
  );
}
