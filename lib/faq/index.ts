export type { FaqHomeGroup, FaqItem, FaqSection, FaqSurface } from "./types";
export { FAQ_SECTIONS } from "./catalog";
export {
  findFaqTarget,
  getFaqItem,
  getFaqItemsForSurface,
  getFaqSection,
  getFaqSections,
  getHomeFaqGroups,
} from "./accessors";
export { compactPlainText, reactNodeToText } from "./plainText";
