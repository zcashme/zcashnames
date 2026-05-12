import { ACTION_COLORS } from "@/lib/types";

// Renders a colored pill badge for ZNS action types (CLAIM, BUY, UPDATE, etc.)
// Used across the explorer and activity feeds to visually distinguish actions.
// Colors are centrally defined in ACTION_COLORS (types.ts) and bound to the action
// name at render time. Falls back to DELIST colors for unknown actions.
export default function ActionBadge({ action }: { action: string }) {
  const c = (ACTION_COLORS as Record<string, { bg: string; text: string }>)[action] ?? ACTION_COLORS.DELIST;

  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
      style={{ background: c.bg, color: c.text }}
    >
      {action}
    </span>
  );
}
