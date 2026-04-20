// Canonical beta-test checklist. Items are referenced by id from:
//   - components/closedbeta/FeedbackChecklist.tsx (the modal/page UI)
//   - the future Supabase `beta_checklist_progress` table
//
// To add or rename items, edit here only — UI and DB schema both key off `id`.
// Items tagged `group: "both"` appear in BOTH sub-lists in the UI but are still
// a single canonical item (one row in state, one tick).

export type ChecklistGroup = "user" | "developer" | "both";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
  /** Optional display-only grouping inside a checklist sub-list. */
  section?: string;
  /** If set, the item label becomes a link to this href (opens in a new tab). */
  link?: { href: string };
  group: ChecklistGroup;
}

export const BETA_CHECKLIST: ChecklistItem[] = [
  // ── User experience ──────────────────────────────────────────────────────
  { id: "ux-e1", label: "General Feedback", hint: "Report issues, inconsistencies, feature requests, or UI improvements.", group: "user" },

  { id: "ux-a1", label: "1. Claim a name", hint: "Get a name no one else has. Set authorization to passcode.", section: "Passcode Authorization", group: "user" },
  { id: "ux-a2", label: "2. List name for sale", hint: "Sell your name for any price.", section: "Passcode Authorization", group: "user" },
  { id: "ux-a3", label: "3. Delist name", hint: "Remove your name from the market.", section: "Passcode Authorization", group: "user" },
  { id: "ux-b1", label: "4. Buy a listed name", hint: "Find names for sale in the Name Explorer. Buy one, setting authorization to passcode.", section: "Passcode Authorization", group: "user" },
  { id: "ux-b2", label: "5. Update address", hint: "Change the address associated with the name you bought.", section: "Passcode Authorization", group: "user" },
  { id: "ux-b3", label: "6. Release name", hint: "Let go of the name you bought. Someone else can claim it.", section: "Passcode Authorization", group: "user" },

  { id: "ux-c1", label: "1. Claim a name", hint: "Reclaim the name you released in B3, or claim another available name. Set authorization to signature.", section: "Signature Authorization", group: "user" },
  { id: "ux-c2", label: "2. List name for sale", hint: "Sell your name for any price.", section: "Signature Authorization", group: "user" },
  { id: "ux-c3", label: "3. Delist name", hint: "Remove your name from the market.", section: "Signature Authorization", group: "user" },
  { id: "ux-d1", label: "4. Buy a listed name", hint: "Buy a name listed for sale in the Name Explorer. Set authorization to signature.", section: "Signature Authorization", group: "user" },
  { id: "ux-d2", label: "5. Update address", hint: "Change the address associated with the name you bought.", section: "Signature Authorization", group: "user" },
  { id: "ux-d3", label: "6. Release name", hint: "Let go of the name you bought and return it to the unowned state.", section: "Signature Authorization", group: "user" },

  // ── Developer experience ────────────────────────────────────────────────
  // Order: read the guide first, then exercise each capability on both surfaces.
  // Each checkbox is a parity tick: "SDK call and raw JSON-RPC return equivalent data."
  { id: "review-dev-guide",   label: "Review the ZNS developer guide", link: { href: "/docs/zns-developer-guide" }, group: "developer" },
  { id: "dev-status",         label: "Check indexer health",           hint: "Call zns.status() and the raw JSON-RPC status. Confirm synced_height, admin_pubkey, uivk, registered, listed, and pricing match for the active network.", group: "developer" },
  { id: "dev-resolve-name",   label: "Resolve a claimed name",         hint: "Pick a name from Explorer. Confirm zns.resolveName(name) matches raw JSON-RPC resolve with { query: name }.", group: "developer" },
  { id: "dev-listings",       label: "Page active listings",           hint: "Call zns.listings(limit, offset) and raw JSON-RPC listings with the same params. Confirm listings and total.", group: "developer" },
  { id: "dev-registrations",  label: "Fetch all registrations",        hint: "Call zns.listAllRegistrations(limit, offset) and raw JSON-RPC resolve with { query: \"\", limit, offset }. Compare pagination and totals against Explorer's Registered tab.", group: "developer" },
  { id: "dev-events-page",    label: "Page all events",                hint: "Call zns.events({ limit, offset }) and raw JSON-RPC events with the same params. Confirm page size, newest-first ordering, and total.", group: "developer" },
  { id: "dev-events-history", label: "Fetch one name's event history", hint: "Call zns.events({ name, limit, offset }) for a claimed name and raw JSON-RPC events with the same params. Confirm the returned history matches Explorer.", group: "developer" },
];
