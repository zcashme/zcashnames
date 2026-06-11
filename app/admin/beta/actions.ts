"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  getOrCreateDraft,
  updateDraft,
} from "@/lib/beta/drafts";
import {
  renderBetaInvitePreview,
  sendBetaInviteEmail,
} from "@/lib/email/beta-invite";

interface TesterForSend {
  id: string;
  display_name: string;
  contact_email: string | null;
  best_contact_kind: string | null;
  invite_code: string | null;
  code_sent_at: string | null;
}

async function loadTester(testerId: string): Promise<TesterForSend | null> {
  const { data, error } = await db
    .from("beta_testers")
    .select("id, display_name, contact_email, best_contact_kind, invite_code, code_sent_at")
    .eq("id", testerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TesterForSend | null) ?? null;
}

export async function saveDraftAction(
  testerId: string,
  patch: { subject: string; bodyText: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateDraft(testerId, { subject: patch.subject, body_text: patch.bodyText });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function renderPreviewAction(args: {
  displayName: string;
  inviteCode: string;
  bodyText: string;
}): Promise<string> {
  return renderBetaInvitePreview({
    displayName: args.displayName,
    inviteCode: args.inviteCode,
    bodyText: args.bodyText,
  });
}

export async function sendDraftAction(
  testerId: string,
  draft: { subject: string; bodyText: string },
  options?: { scheduledAt?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tester = await loadTester(testerId);
  if (!tester) return { ok: false, error: "Tester not found." };
  if (tester.best_contact_kind !== "email") {
    return { ok: false, error: "Best contact is not email." };
  }
  if (!tester.contact_email) return { ok: false, error: "Tester has no email on file." };
  if (!tester.invite_code) return { ok: false, error: "Tester has no invite code." };
  if (tester.code_sent_at) return { ok: false, error: "Invite already sent." };

  try {
    await updateDraft(testerId, { subject: draft.subject, body_text: draft.bodyText });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const nowIso = new Date().toISOString();
  const scheduledAt = options?.scheduledAt ?? null;
  try {
    await sendBetaInviteEmail({
      to: tester.contact_email,
      displayName: tester.display_name,
      inviteCode: tester.invite_code,
      subject: draft.subject,
      bodyText: draft.bodyText,
      scheduledAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .from("beta_testers")
      .update({
        notice_status: "failed",
        notice_error: message.slice(0, 500),
        notice_attempted_at: nowIso,
      })
      .eq("id", testerId);
    return { ok: false, error: message };
  }

  const codeSentAt = scheduledAt ?? nowIso;
  const { error: updateError } = await db
    .from("beta_testers")
    .update({
      code_sent_at: codeSentAt,
      status: "invited",
      notice_status: "sent",
      notice_attempted_at: nowIso,
      notice_error: null,
    })
    .eq("id", testerId);

  if (updateError) {
    return { ok: false, error: `Email queued but status update failed: ${updateError.message}` };
  }

  revalidatePath("/admin/beta/drafts");
  revalidatePath("/admin/beta/sent");
  revalidatePath(`/admin/beta/drafts/${testerId}`);
  revalidatePath(`/admin/beta/sent/${testerId}`);
  return { ok: true };
}

export async function markSentAction(
  testerId: string,
  draft: { subject: string; bodyText: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateDraft(testerId, { subject: draft.subject, body_text: draft.bodyText });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const nowIso = new Date().toISOString();
  const { error } = await db
    .from("beta_testers")
    .update({
      code_sent_at: nowIso,
      status: "invited",
      notice_status: "skipped",
      notice_attempted_at: nowIso,
      notice_error: null,
    })
    .eq("id", testerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/beta/drafts");
  revalidatePath("/admin/beta/sent");
  return { ok: true };
}

export async function markDraftAction(
  testerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db
    .from("beta_testers")
    .update({
      code_sent_at: null,
      status: "applied",
      notice_status: null,
      notice_attempted_at: null,
      notice_error: null,
    })
    .eq("id", testerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/beta/drafts");
  revalidatePath("/admin/beta/sent");
  return { ok: true };
}

export async function ensureDraftAction(
  testerId: string,
  displayName: string,
): Promise<{ subject: string; bodyText: string }> {
  const draft = await getOrCreateDraft(testerId, displayName);
  return { subject: draft.subject, bodyText: draft.body_text };
}

export async function resetDraftAction(
  testerId: string,
  displayName: string,
): Promise<{ ok: true; subject: string; bodyText: string } | { ok: false; error: string }> {
  try {
    const { error: delErr } = await db
      .from("beta_invite_drafts")
      .delete()
      .eq("tester_id", testerId);
    if (delErr) throw new Error(delErr.message);
    const fresh = await getOrCreateDraft(testerId, displayName);
    revalidatePath(`/admin/beta/drafts/${testerId}`);
    return { ok: true, subject: fresh.subject, bodyText: fresh.body_text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
