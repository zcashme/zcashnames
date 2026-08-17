import { FAQ_SECTIONS } from "./catalog";
import type { FaqHomeGroup, FaqItem, FaqSection, FaqSurface } from "./types";

const HOME_GROUP_ORDER: FaqHomeGroup[] = [
  "The basics",
  "Privacy & payments",
  "Getting access",
  "Community, builders & team",
];

export function getFaqSections(): readonly FaqSection[] {
  return FAQ_SECTIONS;
}

export function getFaqSection(id: string): FaqSection | undefined {
  return FAQ_SECTIONS.find((section) => section.id === id);
}

export function getFaqItem(id: string): { section: FaqSection; item: FaqItem } | undefined {
  for (const section of FAQ_SECTIONS) {
    const item = section.items.find((entry) => entry.id === id);
    if (item) return { section, item };
  }
  return undefined;
}

export function getFaqItemsForSurface(surface: FaqSurface): FaqItem[] {
  return FAQ_SECTIONS.flatMap((section) =>
    section.items.filter((item) => item.surfaces?.includes(surface)),
  );
}

export function getHomeFaqGroups(): Array<{ title: FaqHomeGroup; items: FaqItem[] }> {
  const items = getFaqItemsForSurface("home");
  return HOME_GROUP_ORDER.map((title) => ({
    title,
    items: items.filter((item) => item.homeGroup === title),
  })).filter((group) => group.items.length > 0);
}

export function findFaqTarget(hash: string): {
  sectionId: string;
  itemId: string | null;
} | null {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return null;

  const section = getFaqSection(id);
  if (section) {
    return { sectionId: section.id, itemId: section.items[0]?.id ?? null };
  }

  const match = getFaqItem(id);
  if (match) {
    return { sectionId: match.section.id, itemId: match.item.id };
  }

  return null;
}
