import Link from "next/link";
import { notFound } from "next/navigation";
import DraftEditor from "@/components/admin/beta/DraftEditor";
import {
  contactValueFor,
  getOrCreateDraft,
  listDraftTesters,
} from "@/lib/beta/drafts";
import { renderBetaInvitePreview } from "@/lib/email/beta-invite";
import { formatEastern, nextEastern8am } from "@/lib/beta/schedule";

export const dynamic = "force-dynamic";

export default async function DraftEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drafts = await listDraftTesters();
  const index = drafts.findIndex((d) => d.id === id);
  if (index === -1) {
    return <TesterNotInDrafts id={id} />;
  }
  const tester = drafts[index];
  if (!tester.invite_code) {
    notFound();
  }
  const contactValue = contactValueFor(tester);
  if (!tester.best_contact_kind || !contactValue) {
    return <TesterMissingContact id={id} />;
  }

  const draft = await getOrCreateDraft(id, tester.display_name);
  const previewHtml = await renderBetaInvitePreview({
    displayName: tester.display_name,
    inviteCode: tester.invite_code,
    bodyText: draft.body_text,
  });

  const prevId = index > 0 ? drafts[index - 1].id : null;
  const nextId = index < drafts.length - 1 ? drafts[index + 1].id : null;

  const target = nextEastern8am();

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-zinc-500">
        Draft {index + 1} of {drafts.length} ·{" "}
        <Link
          href="/admin/beta/drafts"
          className="text-amber-400 hover:text-amber-300"
        >
          Back to list
        </Link>
      </div>
      <DraftEditor
        testerId={tester.id}
        displayName={tester.display_name}
        bestContactKind={tester.best_contact_kind}
        contactValue={contactValue}
        inviteCode={tester.invite_code}
        focusAreas={tester.focus_areas}
        why={tester.why}
        experience={tester.experience}
        initialSubject={draft.subject}
        initialBodyText={draft.body_text}
        initialPreviewHtml={previewHtml}
        prevId={prevId}
        nextId={nextId}
        draftsListHref="/admin/beta/drafts"
        scheduleTargetIso={target.toISOString()}
        scheduleTargetLabel={`for ${formatEastern(target)} ET`}
      />
    </div>
  );
}

function TesterNotInDrafts({ id }: { id: string }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-sm text-zinc-300">
      <p className="mb-2">
        Tester <code className="text-amber-400">{id}</code> is not in the
        current drafts list. They may have already been sent or have no invite
        code.
      </p>
      <Link
        href="/admin/beta/drafts"
        className="text-amber-400 hover:text-amber-300"
      >
        ← Back to drafts
      </Link>
    </section>
  );
}

function TesterMissingContact({ id }: { id: string }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-sm text-zinc-300">
      <p className="mb-2">
        Tester <code className="text-amber-400">{id}</code> has no contact
        value for their preferred contact method.
      </p>
      <Link
        href="/admin/beta/drafts"
        className="text-amber-400 hover:text-amber-300"
      >
        ← Back to drafts
      </Link>
    </section>
  );
}
