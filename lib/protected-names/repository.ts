import "server-only";

import { db } from "@/lib/db";
import {
  evidenceInputToRpcPayload,
  normalizeEvidenceArray,
  validateEvidenceInput,
} from "@/lib/protected-names/evidence";
import {
  mapProtectedNameRpcError,
  setupHintIfMissingRpc,
} from "@/lib/protected-names/errors";
import type {
  ActionResult,
  DisputeAcceptResult,
  DecisionMutationResult,
  EvidenceInput,
  EvidenceMutationResult,
  MetadataUpdateInput,
  NameMutationResult,
} from "@/lib/protected-names/types";

async function callRpc<T>(
  fn: string,
  args: Record<string, unknown>,
): Promise<ActionResult<T>> {
  const { data, error } = await db.rpc(fn, args);
  if (error) {
    const mapped = mapProtectedNameRpcError(error);
    if (mapped.ok) {
      return {
        ok: false,
        code: "UNKNOWN",
        message: setupHintIfMissingRpc(error.message),
      };
    }
    return {
      ok: false,
      code: mapped.code,
      message: setupHintIfMissingRpc(mapped.message),
    };
  }

  return { ok: true, data: data as T };
}

function asNameResult(data: unknown): NameMutationResult {
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    name: String(row.name ?? ""),
    status: String(row.status ?? ""),
    redeemed: row.redeemed === true,
    updated_at: (row.updated_at as string | null | undefined) ?? null,
    protected_at: (row.protected_at as string | null | undefined) ?? null,
    rejected_at: (row.rejected_at as string | null | undefined) ?? null,
    rejected_reason: (row.rejected_reason as string | null | undefined) ?? null,
    redeemed_at: (row.redeemed_at as string | null | undefined) ?? null,
  };
}

export async function approveProtectedName(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_approve", {
    p_name: name,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function rejectProtectedName(
  name: string,
  rejectedReason: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_reject", {
    p_name: name,
    p_rejected_reason: rejectedReason,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function rejectProtectedProtectedName(
  name: string,
  rejectedReason: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_reject_protected", {
    p_name: name,
    p_rejected_reason: rejectedReason,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function protectRejectedName(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_protect_rejected", {
    p_name: name,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function returnProtectedNameToReview(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_return_to_review", {
    p_name: name,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function redeemProtectedName(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_redeem", {
    p_name: name,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function undoRedeemProtectedName(
  name: string,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_undo_redeem", {
    p_name: name,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

export async function updateProtectedNameMetadata(
  name: string,
  input: MetadataUpdateInput,
): Promise<ActionResult<NameMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_update_metadata", {
    p_name: name,
    p_category: input.category,
    p_parent_name: input.parentName,
    p_reason: input.reason,
    p_contact_methods: input.contactMethods,
    p_preferred_contact_kind: input.preferredContactKind,
    p_preferred_contact_value: input.preferredContactValue,
    p_zcash_unified_address: input.zcashUnifiedAddress,
    p_expected_updated_at: input.expectedUpdatedAt,
  });
  if (!result.ok) return result;
  return { ok: true, data: asNameResult(result.data) };
}

function asEvidenceResult(data: unknown): EvidenceMutationResult {
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    updated_at: String(row.updated_at ?? ""),
    evidence: normalizeEvidenceArray(row.evidence),
    name: typeof row.name === "string" ? row.name : undefined,
    id: typeof row.id === "string" ? row.id : undefined,
    protected_name:
      typeof row.protected_name === "string" ? row.protected_name : undefined,
  };
}

export async function addNameEvidence(
  name: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const { item, error } = validateEvidenceInput(input);
  if (error) {
    return { ok: false, code: "VALIDATION", message: error };
  }

  const result = await callRpc<unknown>("admin_protected_name_evidence_add", {
    p_name: name,
    p_item: evidenceInputToRpcPayload(item),
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (!result.ok) return result;
  return { ok: true, data: asEvidenceResult(result.data) };
}

export async function patchNameEvidence(
  name: string,
  evidenceId: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const { item, error } = validateEvidenceInput(input);
  if (error) {
    return { ok: false, code: "VALIDATION", message: error };
  }

  const result = await callRpc<unknown>("admin_protected_name_evidence_patch", {
    p_name: name,
    p_evidence_id: evidenceId,
    p_patch: evidenceInputToRpcPayload(item),
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (!result.ok) return result;
  return { ok: true, data: asEvidenceResult(result.data) };
}

export async function removeNameEvidence(
  name: string,
  evidenceId: string,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await callRpc<unknown>("admin_protected_name_evidence_remove", {
    p_name: name,
    p_evidence_id: evidenceId,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (!result.ok) return result;
  return { ok: true, data: asEvidenceResult(result.data) };
}

export async function addDisputeEvidence(
  disputeId: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const { item, error } = validateEvidenceInput(input);
  if (error) {
    return { ok: false, code: "VALIDATION", message: error };
  }

  const result = await callRpc<unknown>(
    "admin_protected_name_dispute_evidence_add",
    {
      p_dispute_id: disputeId,
      p_item: evidenceInputToRpcPayload(item),
      p_expected_updated_at: expectedUpdatedAt,
    },
  );
  if (!result.ok) return result;
  return { ok: true, data: asEvidenceResult(result.data) };
}

export async function patchDisputeEvidence(
  disputeId: string,
  evidenceId: string,
  input: EvidenceInput,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const { item, error } = validateEvidenceInput(input);
  if (error) {
    return { ok: false, code: "VALIDATION", message: error };
  }

  const result = await callRpc<unknown>(
    "admin_protected_name_dispute_evidence_patch",
    {
      p_dispute_id: disputeId,
      p_evidence_id: evidenceId,
      p_patch: evidenceInputToRpcPayload(item),
      p_expected_updated_at: expectedUpdatedAt,
    },
  );
  if (!result.ok) return result;
  return { ok: true, data: asEvidenceResult(result.data) };
}

export async function removeDisputeEvidence(
  disputeId: string,
  evidenceId: string,
  expectedUpdatedAt: string | null,
): Promise<ActionResult<EvidenceMutationResult>> {
  const result = await callRpc<unknown>(
    "admin_protected_name_dispute_evidence_remove",
    {
      p_dispute_id: disputeId,
      p_evidence_id: evidenceId,
      p_expected_updated_at: expectedUpdatedAt,
    },
  );
  if (!result.ok) return result;
  return { ok: true, data: asEvidenceResult(result.data) };
}

export async function dismissDispute(
  disputeId: string,
): Promise<ActionResult<{ id: string; protected_name: string; review_status: string }>> {
  const result = await callRpc<{
    id: string;
    protected_name: string;
    review_status: string;
  }>("admin_protected_name_dispute_dismiss", {
    p_dispute_id: disputeId,
  });
  return result;
}

export async function acceptDispute(
  disputeId: string,
  applyToVariants: boolean,
): Promise<ActionResult<DisputeAcceptResult>> {
  const result = await callRpc<Record<string, unknown>>(
    "admin_protected_name_dispute_accept",
    {
      p_dispute_id: disputeId,
      p_apply_to_variants: applyToVariants,
    },
  );
  if (!result.ok) return result;

  const data = result.data ?? {};
  return {
    ok: true,
    data: {
      id: String(data.id ?? ""),
      protected_name: String(data.protected_name ?? ""),
      review_status: String(data.review_status ?? ""),
      name_status:
        typeof data.name_status === "string" ? data.name_status : undefined,
      did_transition: data.did_transition === true,
      changedDescendants: Array.isArray(data.changedDescendants)
        ? data.changedDescendants.map(String)
        : Array.isArray(data.changeddescendants)
          ? data.changeddescendants.map(String)
          : [],
      skippedDescendants: Array.isArray(data.skippedDescendants)
        ? data.skippedDescendants.map(String)
        : Array.isArray(data.skippeddescendants)
          ? data.skippeddescendants.map(String)
          : [],
      updated_at:
        typeof data.updated_at === "string" ? data.updated_at : undefined,
    },
  };
}

function asDecisionResult(data: unknown): DecisionMutationResult {
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    decisionId: String(row.decision_id ?? ""), protectedName: String(row.protected_name ?? ""),
    workflow: String(row.workflow ?? ""), decision: String(row.decision ?? ""),
    sourceStatus: String(row.source_status ?? ""),
    recipientEmail: typeof row.recipient_email === "string" ? row.recipient_email : null,
    notificationStatus: String(row.notification_status ?? "pending"),
    didTransition: row.did_transition === true,
    changedDescendants: Array.isArray(row.changedDescendants) ? row.changedDescendants.map(String) : [],
    skippedDescendants: Array.isArray(row.skippedDescendants) ? row.skippedDescendants.map(String) : [],
    submittedReason: typeof row.submitted_reason === "string" ? row.submitted_reason : null,
  };
}

async function decide(
  fn: string, args: Record<string, unknown>,
): Promise<ActionResult<DecisionMutationResult>> {
  const result = await callRpc<unknown>(fn, args);
  return result.ok ? { ok: true, data: asDecisionResult(result.data) } : result;
}

export function decideProtectedNameSuggestion(name: string, decision: "approved" | "denied", reason: string) {
  return decide("admin_protected_name_suggestion_decide", {
    p_name: name, p_decision: decision, p_reason: reason,
  });
}

export function decideProtectedNameDispute(disputeId: string, decision: "approved" | "denied", reason: string, applyToVariants: boolean) {
  return decide("admin_protected_name_dispute_decide", {
    p_dispute_id: disputeId, p_decision: decision, p_reason: reason,
    p_apply_to_variants: applyToVariants,
  });
}

export function decideProtectedNameAccessRequest(requestId: string, decision: "approved" | "denied", reason: string) {
  return decide("admin_protected_name_access_request_decide", {
    p_request_id: requestId, p_decision: decision, p_reason: reason,
  });
}

export async function recordProtectedNameDecisionNotification(
  decisionId: string, status: "sent" | "failed", providerId?: string | null, errorMessage?: string | null,
): Promise<ActionResult<unknown>> {
  return callRpc("admin_protected_name_decision_notification", {
    p_decision_id: decisionId, p_status: status, p_provider_id: providerId ?? null,
    p_error: errorMessage ?? null,
  });
}
