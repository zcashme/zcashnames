import Link from "next/link";
import type { ProtectedNameQueueCounts } from "@/lib/protected-names/queries";

type QueueKind = "suggestions" | "disputes" | "access";

export default function QueueNavigation({ counts, active }: { counts: ProtectedNameQueueCounts; active: QueueKind }) {
  const links: Array<{ key: QueueKind; href: string; label: string; count: number }> = [
    { key: "suggestions", href: "/admin/protected-names", label: "Suggestions", count: counts.suggestions },
    { key: "disputes", href: "/admin/protected-names/disputes", label: "Disputes", count: counts.disputes },
    { key: "access", href: "/admin/protected-names/access", label: "Access requests", count: counts.accessRequests },
  ];
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          className={link.key === active ? "rounded bg-amber-500/15 px-3 py-1.5 text-amber-300" : "rounded border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500"}
        >
          {link.label} ({link.count})
        </Link>
      ))}
    </nav>
  );
}
