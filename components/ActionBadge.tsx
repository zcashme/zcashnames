import { ACTION_COLORS } from "@/lib/types";

// Renders a colored pill badge for ZNS action types (CLAIM, UPDATE, RELEASE).
// Used across the explorer and activity feeds to visually distinguish actions.
// Colors are centrally defined in ACTION_COLORS (types.ts) and bound to the action
// name at render time. Falls back to neutral colors for unknown actions.
export default function ActionBadge({ action }: { action: string }) {
  const c =
    (ACTION_COLORS as Record<string, { bg: string; text: string }>)[action] ?? {
      bg: "rgba(156,163,175,0.15)",
      text: "var(--fg-muted)",
    };

  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
      style={{ background: c.bg, color: c.text }}
    >
      {action}
    </span>
  );
}
