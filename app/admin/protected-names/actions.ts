"use server";

import { revalidatePath } from "next/cache";
import type {
  ActionResult,
  DisputeAcceptResult,
  EvidenceInput,
  EvidenceMutationResult,
  MetadataUpdateInput,
  NameMutationResult,
} from "@/lib/protected-names/types";
import * as repo from "@/lib/protected-names/repository";
import { renderProtectedNameDecisionPreview, sendStoredProtectedNameDecisionEmail } from "@/lib/email/protected-name-decision";
import type { DecisionMutationResult } from "@/lib/protected-names/types";
import { db } from "@/lib/db";

function revalidateNamePaths(name?: string, disputeId?: string) {
  revalidatePath("/admin/protected-names");
  if (name) {
    revalidatePath(`/admin/protected-names/${encodeURIComponent(name)}`);
  }
  if (name && disputeId) {
    revalidatePath(
      `/admin/protected-names/${encodeURIComponent(name)}/disputes/${disputeId}`,
    );
  }
}

function revalidateDecisionHistory() {
  revalidatePath("/admin/protected-names/history");
}

export async function approveProtectedNameAction(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.approveProtectedName(name);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function rejectProtectedNameAction(
  name: string,
  rejectedReason: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.rejectProtectedName(name, rejectedReason);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function rejectProtectedProtectedNameAction(
  name: string,
  rejectedReason: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.rejectProtectedProtectedName(name, rejectedReason);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function protectRejectedNameAction(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.protectRejectedName(name);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function returnProtectedNameToReviewAction(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.returnProtectedNameToReview(name);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function redeemProtectedNameAction(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.redeemProtectedName(name);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function undoRedeemProtectedNameAction(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.undoRedeemProtectedName(name);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function updateProtectedNameMetadataAction(
  name: string,
  input: MetadataUpdateInput,
): Promise<ActionResult<NameMutationResult>> {
  const result = await repo.updateProtectedNameMetadata(name, input);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function addNameEvidenceAction(
  name: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await repo.addNameEvidence(name, input, expectedUpdatedAt);
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function patchNameEvidenceAction(
  name: string,
  evidenceId: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await repo.patchNameEvidence(
    name,
    evidenceId,
    input,
    expectedUpdatedAt,
  );
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function removeNameEvidenceAction(
  name: string,
  evidenceId: string,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await repo.removeNameEvidence(
    name,
    evidenceId,
    expectedUpdatedAt,
  );
  if (result.ok) revalidateNamePaths(name);
  return result;
}

export async function addDisputeEvidenceAction(
  disputeId: string,
  protectedName: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await repo.addDisputeEvidence(
    disputeId,
    input,
    expectedUpdatedAt,
  );
  if (result.ok) revalidateNamePaths(protectedName, disputeId);
  return result;
}

export async function patchDisputeEvidenceAction(
  disputeId: string,
  protectedName: string,
  evidenceId: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await repo.patchDisputeEvidence(
    disputeId,
    evidenceId,
    input,
    expectedUpdatedAt,
  );
  if (result.ok) revalidateNamePaths(protectedName, disputeId);
  return result;
}

export async function removeDisputeEvidenceAction(
  disputeId: string,
  protectedName: string,
  evidenceId: string,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await repo.removeDisputeEvidence(
    disputeId,
    evidenceId,
    expectedUpdatedAt,
  );
  if (result.ok) revalidateNamePaths(protectedName, disputeId);
  return result;
}

export async function dismissDisputeAction(
  disputeId: string,
  protectedName: string,
): Promise<ActionResult<{ id: string; protected_name: string; review_status: string }>> {
  const result = await repo.dismissDispute(disputeId);
  if (result.ok) revalidateNamePaths(protectedName, disputeId);
  return result;
}

export async function acceptDisputeAction(
  disputeId: string,
  protectedName: string,
  applyToVariants: boolean,
): Promise<ActionResult<DisputeAcceptResult>> {
  const result = await repo.acceptDispute(disputeId, applyToVariants);
  if (result.ok) revalidateNamePaths(protectedName, disputeId);
  return result;
}

type DecisionEmailPayload = {
  decisionId: string;
  recipientEmail: string;
  name: string;
  workflow: string;
  decision: string;
  reason: string;
  nameStatus?: string | null;
  didTransition?: boolean;
  submittedReason?: string | null;
  amendmentId?: string | null;
  sendKind: "initial" | "correction";
  isDecisionCorrection?: boolean;
};

async function updateAttemptDelivery(
  attemptId: string,
  status: "sent" | "failed",
  providerId?: string | null,
  errorMessage?: string | null,
) {
  const { error } = await db
    .from("zn_protected_name_decision_email_attempts")
    .update({
      delivery_status: status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      provider_id: providerId ?? null,
      error: status === "failed" ? errorMessage ?? "Unknown email error" : null,
    })
    .eq("id", attemptId);
  if (error) throw new Error(error.message);
}

async function sendAndRecordDecisionEmail(payload: DecisionEmailPayload) {
  const preview = await renderProtectedNameDecisionPreview({
    name: payload.name,
    workflow: payload.workflow,
    decision: payload.decision as "approved" | "denied",
    reason: payload.reason,
    nameStatus: payload.nameStatus,
    didTransition: payload.didTransition,
    submittedReason: payload.submittedReason,
    isCorrection: payload.sendKind === "correction",
    isDecisionCorrection: payload.isDecisionCorrection,
  });
  const { data, error } = await db
    .from("zn_protected_name_decision_email_attempts")
    .insert({
      decision_id: payload.decisionId,
      amendment_id: payload.amendmentId ?? null,
      send_kind: payload.sendKind,
      recipient_email: payload.recipientEmail,
      subject: preview.subject,
      html: preview.html,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create email attempt.");
  const attemptId = String((data as { id: unknown }).id);

  try {
    const providerId = await sendStoredProtectedNameDecisionEmail(
      payload.recipientEmail,
      preview.subject,
      preview.html,
    );
    await updateAttemptDelivery(attemptId, "sent", providerId);
    return { notificationStatus: "sent" as const, attemptId, providerId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAttemptDelivery(attemptId, "failed", null, message);
    return { notificationStatus: "failed" as const, notificationError: message, attemptId };
  }
}

async function sendDecisionNotice(result: DecisionMutationResult, reason: string) {
  if (!result.recipientEmail) return result;
  try {
    const delivery = await sendAndRecordDecisionEmail({
      decisionId: result.decisionId,
      recipientEmail: result.recipientEmail,
      name: result.protectedName,
      workflow: result.workflow,
      decision: result.decision,
      reason,
      nameStatus: result.sourceStatus,
      didTransition: result.didTransition,
      submittedReason: result.submittedReason,
      sendKind: "initial",
    });
    await repo.recordProtectedNameDecisionNotification(
      result.decisionId,
      delivery.notificationStatus,
      delivery.providerId ?? null,
      delivery.notificationError,
    );
    return { ...result, ...delivery };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repo.recordProtectedNameDecisionNotification(result.decisionId, "failed", null, message);
    return { ...result, notificationStatus: "failed", notificationError: message };
  }
}

export async function decideProtectedNameSuggestionAction(
  name: string, decision: "approved" | "denied", reason: string,
) {
  const result = await repo.decideProtectedNameSuggestion(name, decision, reason);
  if (!result.ok) return result;
  const data = await sendDecisionNotice(result.data, reason);
  revalidateNamePaths(name);
  revalidateDecisionHistory();
  return { ok: true as const, data };
}

export async function decideProtectedNameDisputeAction(
  disputeId: string, protectedName: string, decision: "approved" | "denied", reason: string, applyToVariants: boolean,
) {
  const result = await repo.decideProtectedNameDispute(disputeId, decision, reason, applyToVariants);
  if (!result.ok) return result;
  const data = await sendDecisionNotice(result.data, reason);
  revalidateNamePaths(protectedName, disputeId);
  revalidatePath("/admin/protected-names/disputes");
  revalidateDecisionHistory();
  return { ok: true as const, data };
}

export async function decideProtectedNameAccessRequestAction(
  requestId: string, decision: "approved" | "denied", reason: string,
) {
  const result = await repo.decideProtectedNameAccessRequest(requestId, decision, reason);
  if (!result.ok) return result;
  const data = await sendDecisionNotice(result.data, reason);
  revalidatePath("/admin/protected-names/access");
  revalidatePath(`/admin/protected-names/access/${requestId}`);
  revalidateDecisionHistory();
  return { ok: true as const, data };
}

async function resendDecisionAttempt(attemptId: string, forceRetry: boolean) {
  const { data, error } = await db
    .from("zn_protected_name_decision_email_attempts")
    .select("id, decision_id, recipient_email, subject, html, delivery_status")
    .eq("id", attemptId)
    .maybeSingle();
  if (error || !data) return { ok: false as const, message: error?.message ?? "Email attempt not found." };
  const row = data as Record<string, unknown>;
  if (typeof row.subject !== "string" || typeof row.html !== "string") {
    return { ok: false as const, message: "This legacy email has no stored content to resend." };
  }
  const recipientEmail = String(row.recipient_email);
  const { data: created, error: createError } = await db
    .from("zn_protected_name_decision_email_attempts")
    .insert({
      decision_id: String(row.decision_id),
      source_attempt_id: String(row.id),
      send_kind: forceRetry || row.delivery_status === "failed" ? "retry" : "resend",
      recipient_email: recipientEmail,
      subject: row.subject,
      html: row.html,
    })
    .select("id")
    .single();
  if (createError || !created) return { ok: false as const, message: createError?.message ?? "Could not create email attempt." };
  const createdId = String((created as { id: unknown }).id);
  try {
    const providerId = await sendStoredProtectedNameDecisionEmail(recipientEmail, row.subject, row.html);
    await updateAttemptDelivery(createdId, "sent", providerId);
    revalidateDecisionHistory();
    return { ok: true as const };
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : String(emailError);
    await updateAttemptDelivery(createdId, "failed", null, message);
    revalidateDecisionHistory();
    return { ok: false as const, message };
  }
}

export async function resendProtectedNameDecisionEmailAttemptAction(attemptId: string) {
  return resendDecisionAttempt(attemptId, false);
}

export async function retryProtectedNameDecisionEmailAttemptAction(attemptId: string) {
  return resendDecisionAttempt(attemptId, true);
}

export async function sendProtectedNameDecisionCorrectionAction(
  decisionId: string,
  reason: string,
  correctedDecision?: "approved" | "denied",
) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { ok: false as const, message: "A corrected reason is required." };
  const { data: decision, error: decisionError } = await db
    .from("zn_protected_name_decisions")
    .select("id, source_id, protected_name, workflow, decision, recipient_email, name_status, name_did_transition, submitted_reason")
    .eq("id", decisionId)
    .maybeSingle();
  if (decisionError || !decision) return { ok: false as const, message: decisionError?.message ?? "Decision not found." };
  const row = decision as Record<string, unknown>;
  if (typeof row.recipient_email !== "string" || !row.recipient_email) {
    return { ok: false as const, message: "Decision has no email recipient." };
  }
  const originalDecision = String(row.decision);
  const { data: latestCorrection, error: latestCorrectionError } = await db
    .from("zn_protected_name_decision_amendments")
    .select("corrected_decision")
    .eq("decision_id", decisionId)
    .not("corrected_decision", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestCorrectionError) {
    return { ok: false as const, message: latestCorrectionError.message };
  }
  const currentDecision = latestCorrection?.corrected_decision === "approved" || latestCorrection?.corrected_decision === "denied"
    ? latestCorrection.corrected_decision
    : originalDecision;
  const nextDecision = correctedDecision ?? currentDecision;
  if (nextDecision !== "approved" && nextDecision !== "denied") return { ok: false as const, message: "Invalid corrected decision." };
  const isDecisionCorrection = nextDecision !== currentDecision;
  let amendmentId: string;
  if (isDecisionCorrection) {
    if (row.workflow !== "access_request") return { ok: false as const, message: "Only access-request decisions can change outcome." };
    const { data: amendment, error: amendmentError } = await db
      .rpc("admin_protected_name_access_decision_correct", { p_decision_id: decisionId, p_decision: nextDecision, p_reason: trimmedReason })
      .single();
    if (amendmentError || !amendment) return { ok: false as const, message: amendmentError?.message ?? "Could not save status correction." };
    amendmentId = String((amendment as { id: unknown }).id);
  } else {
    const { data: amendment, error: amendmentError } = await db
      .from("zn_protected_name_decision_amendments")
      .insert({ decision_id: decisionId, reason: trimmedReason })
      .select("id")
      .single();
    if (amendmentError || !amendment) return { ok: false as const, message: amendmentError?.message ?? "Could not save correction." };
    amendmentId = String((amendment as { id: unknown }).id);
  }

  try {
    const delivery = await sendAndRecordDecisionEmail({
      decisionId,
      amendmentId,
      recipientEmail: row.recipient_email,
      name: String(row.protected_name),
      workflow: String(row.workflow),
      decision: nextDecision,
      reason: trimmedReason,
      nameStatus: typeof row.name_status === "string" ? row.name_status : null,
      didTransition: typeof row.name_did_transition === "boolean" ? row.name_did_transition : undefined,
      submittedReason: typeof row.submitted_reason === "string" ? row.submitted_reason : null,
      sendKind: "correction",
      isDecisionCorrection,
    });
    revalidateDecisionHistory();
    if (row.workflow === "access_request") {
      revalidatePath("/admin/protected-names/access");
      revalidatePath(`/admin/protected-names/access/${String(row.source_id)}`);
    }
    return { ok: true as const, data: delivery };
  } catch (error) {
    revalidateDecisionHistory();
    return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function renderProtectedNameDecisionPreviewAction(args: {
  name: string; workflow: string; decision: "approved" | "denied"; reason: string;
  nameStatus?: string | null; didTransition?: boolean; submittedReason?: string | null; isCorrection?: boolean; isDecisionCorrection?: boolean;
}) {
  if (!args.name.trim() || !args.reason.trim()) throw new Error("A name and decision reason are required for preview.");
  return renderProtectedNameDecisionPreview(args);
}
