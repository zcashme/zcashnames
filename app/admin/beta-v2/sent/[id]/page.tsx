import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDraft } from "@/lib/beta-v2/drafts";
import { readPreferredWalletVariantId } from "@/lib/beta/wallet-selection";
import { defaultInviteBody, defaultInviteSubject } from "@/lib/beta/invite-template";
import { renderBetaInvitePreview } from "@/lib/email/beta-invite";

export const dynamic = "force-dynamic";

interface TesterRow {
  id: string;
  display_name: string;
  contact_email: string | null;
  best_contact_kind: string | null;
  invite_code: string | null;
  code_sent_at: string | null;
  status: string;
  notice_status: string | null;
  notice_error: string | null;
  notice_attempted_at: string | null;
  planned_wallet: unknown;
  planned_wallets_detail: unknown;
}

export default async function SentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await db
    .from("beta_testers_v2")
    .select(
      "id, display_name, contact_email, best_contact_kind, invite_code, code_sent_at, status, notice_status, notice_error, notice_attempted_at, planned_wallet, planned_wallets_detail",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();
  const tester = data as TesterRow;
  if (!tester.code_sent_at) notFound();

  const draft = await getDraft(id);
  const subject = draft?.subject ?? defaultInviteSubject();
  const bodyText = draft?.body_text ?? defaultInviteBody({ displayName: tester.display_name });

  const previewHtml = await renderBetaInvitePreview({
    displayName: tester.display_name,
    inviteCode: tester.invite_code ?? "",
    bodyText,
    walletVariantId: readPreferredWalletVariantId(tester.planned_wallet, tester.planned_wallets_detail),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-zinc-500">
        <Link href="/admin/beta-v2/sent" className="text-amber-400 hover:text-amber-300">
          Back to sent
        </Link>
      </div>

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-zinc-100">{tester.display_name}</h1>
        <span className="text-xs text-zinc-400">
          Sent <span className="text-zinc-200">{new Date(tester.code_sent_at).toLocaleString()}</span>
          {tester.best_contact_kind === "email" && tester.contact_email && (
            <>
              {" "}· To <span className="text-zinc-200">{tester.contact_email}</span>
            </>
          )}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-400 sm:grid-cols-4">
        <div><dt className="text-zinc-500">Status</dt><dd className="text-zinc-200">{tester.status}</dd></div>
        <div><dt className="text-zinc-500">Notice</dt><dd className="text-zinc-200">{tester.notice_status ?? "-"}</dd></div>
        <div><dt className="text-zinc-500">Passcode</dt><dd className="font-mono text-zinc-200">{tester.invite_code ?? "-"}</dd></div>
        <div><dt className="text-zinc-500">Attempted</dt><dd className="text-zinc-200">{tester.notice_attempted_at ? new Date(tester.notice_attempted_at).toLocaleString() : "-"}</dd></div>
      </dl>

      {tester.notice_error && (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Last error: {tester.notice_error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Subject</div>
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200">
          {subject}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Email</div>
        <iframe
          title="sent email preview"
          srcDoc={previewHtml}
          className="h-[640px] w-full rounded-md border border-zinc-700 bg-white"
        />
      </div>
    </div>
  );
}
