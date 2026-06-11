import type { Metadata } from "next";
import { defaultInviteBody, defaultInviteSubject } from "@/lib/beta/invite-template";
import { renderBetaInvitePreview } from "@/lib/email/beta-invite";

export const metadata: Metadata = {
  title: "Beta Invite Preview - ZcashNames",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    name?: string;
    code?: string;
  }>;
};

export default async function BetaInvitePreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const displayName = params.name?.trim() || "Zechariah";
  const inviteCode = params.code?.trim() || "BETA-7QFMb3jv";
  const subject = defaultInviteSubject();
  const bodyText = defaultInviteBody({ displayName });
  const previewHtml = await renderBetaInvitePreview({
    displayName,
    inviteCode,
    bodyText,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-200">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Subject</div>
        <div className="mt-2">{subject}</div>
      </div>

      <iframe
        title="beta invite email preview"
        srcDoc={previewHtml}
        className="h-[900px] w-full rounded-xl border border-zinc-800 bg-white"
      />
    </div>
  );
}
