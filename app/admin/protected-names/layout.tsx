import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function ProtectedNamesAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Admin</p>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Protected Names
          </h1>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/admin/protected-names"
            className="text-zinc-300 hover:text-amber-400"
          >
            Queue
          </Link>
          <Link href="/admin/protected-names/history" className="text-zinc-300 hover:text-amber-400">
            History
          </Link>
          <Link href="/admin" className="text-zinc-500 hover:text-zinc-300">
            Admin home
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
