const colors: Record<string, { bg: string; text: string }> = {
  CLAIM:  { bg: "var(--color-accent-green-light)", text: "var(--color-accent-green)" },
  BUY:    { bg: "rgba(59,130,246,0.15)",  text: "var(--color-brand-blue, #3b82f6)" },
  LIST:   { bg: "rgba(234,179,8,0.15)",   text: "#eab308" },
  DELIST: { bg: "rgba(156,163,175,0.15)", text: "var(--fg-muted)" },
  UPDATE: { bg: "rgba(168,85,247,0.15)",  text: "#a855f7" },
  RELEASE:{ bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
};

export default function ActionBadge({ action }: { action: string }) {
  const c = colors[action] ?? colors.DELIST;

  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
      style={{ background: c.bg, color: c.text }}
    >
      {action}
    </span>
  );
}
