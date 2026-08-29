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
import { renderProtectedNameDecisionPreview, sendProtectedNameDecisionEmail } from "@/lib/email/protected-name-decision";
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

async function sendDecisionNotice(result: DecisionMutationResult, reason: string) {
  if (!result.recipientEmail) return result;
  try {
    const providerId = await sendProtectedNameDecisionEmail({
      to: result.recipientEmail, name: result.protectedName, workflow: result.workflow,
      decision: result.decision, reason, nameStatus: result.sourceStatus,
      didTransition: result.didTransition,
      submittedReason: result.submittedReason,
    });
    await repo.recordProtectedNameDecisionNotification(result.decisionId, "sent", providerId);
    return { ...result, notificationStatus: "sent" };
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
  return { ok: true as const, data };
}

export async function retryProtectedNameDecisionEmailAction(decisionId: string) {
  const { data, error } = await db
    .from("zn_protected_name_decisions")
    .select("id, protected_name, workflow, decision, reason, recipient_email, name_status, name_did_transition, submitted_reason")
    .eq("id", decisionId)
    .maybeSingle();
  if (error || !data) return { ok: false as const, message: error?.message ?? "Decision not found." };
  const row = data as Record<string, unknown>;
  if (typeof row.recipient_email !== "string" || !row.recipient_email) return { ok: false as const, message: "Decision has no email recipient." };
  try {
    const providerId = await sendProtectedNameDecisionEmail({
      to: row.recipient_email, name: String(row.protected_name), workflow: String(row.workflow),
      decision: String(row.decision), reason: String(row.reason),
      nameStatus: typeof row.name_status === "string" ? row.name_status : null,
      didTransition: typeof row.name_did_transition === "boolean" ? row.name_did_transition : undefined,
      submittedReason: typeof row.submitted_reason === "string" ? row.submitted_reason : null,
    });
    await repo.recordProtectedNameDecisionNotification(decisionId, "sent", providerId);
    return { ok: true as const };
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : String(emailError);
    await repo.recordProtectedNameDecisionNotification(decisionId, "failed", null, message);
    return { ok: false as const, message };
  }
}

export async function renderProtectedNameDecisionPreviewAction(args: {
  name: string; workflow: string; decision: "approved" | "denied"; reason: string;
  nameStatus?: string | null; didTransition?: boolean; submittedReason?: string | null;
}) {
  if (!args.name.trim() || !args.reason.trim()) throw new Error("A name and decision reason are required for preview.");
  return renderProtectedNameDecisionPreview(args);
}
