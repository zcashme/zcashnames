import Link from "next/link";
import { listDraftCampaigns, listSentCampaigns } from "@/lib/campaigns/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function CampaignAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drafts, sent] = await Promise.all([
    listDraftCampaigns().catch(() => []),
    listSentCampaigns().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-semibold tracking-tight">Campaigns</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/campaigns/drafts" className="text-zinc-300 hover:text-amber-400">
            Drafts{" "}
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {drafts.length}
            </span>
          </Link>
          <Link href="/admin/campaigns/sent" className="text-zinc-300 hover:text-amber-400">
            Sent{" "}
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {sent.length}
            </span>
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
