/**
 * Explorer URL contract: the legal `?tab=` values, the page-size invariant
 * shared between the server's indexer offset and the client's slice, and the
 * parser that narrows untrusted query strings back to the type. Shared between
 * page.tsx (server) and ExplorerView.tsx (client).
 */
import type { Action } from "@/lib/types";
import { ACTIONS } from "@/lib/types";

export type ExplorerTab = "all" | "registered" | "forsale" | Action;

export const PAGE_SIZE = 25;

const ALL_TABS: ExplorerTab[] = ["all", "registered", "forsale", ...ACTIONS];

export function parseExplorerTab(tab: string | undefined): ExplorerTab {
  if (!tab) return "all";
  return ALL_TABS.includes(tab as ExplorerTab) ? (tab as ExplorerTab) : "all";
}
