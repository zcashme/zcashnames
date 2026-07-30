import { NextResponse } from "next/server";
import { parseWaitlistVerifyToken } from "@/lib/campaigns/waitlist-confirm-response";
import {
  findWaitlistRowsByNormalizedEmail,
  normalizeWaitlistName,
} from "@/lib/campaigns/waitlist-verify";
import {
  getLatestProtectedAccessRequestForRow,
  getProtectedNameInfoByName,
  submitOrUpdateProtectedAccessRequest,
  type WaitlistProtectedAccessRelationship,
  type WaitlistProtectedContactMethod,
} from "@/lib/campaigns/waitlist-protected-access";
import { sendProtectedNameAccessRequestNotice } from "@/lib/email/protected-name-access";
import { CONTACT_KINDS, type ContactKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProtectedAccessPayload = {
  token?: unknown;
  rowId?: unknown;
  contactMethods?: unknown;
  relationship?: unknown;
  supportingLink?: unknown;
  additionalContext?: unknown;
};

const ALLOWED_RELATIONSHIPS: WaitlistProtectedAccessRelationship[] = [
  "personal_or_public_name",
  "represent_person",
  "represent_organization",
  "manage_brand_or_project",
  "other",
];

function validateUrlValue(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeContactMethods(value: unknown): {
  contactMethods: WaitlistProtectedContactMethod[];
  preferredContactKind: ContactKind | null;
  preferredContactValue: string | null;
  error: string | null;
} {
  if (!Array.isArray(value)) {
    return {
      contactMethods: [],
      preferredContactKind: null,
      preferredContactValue: null,
      error: "Add at least one contact method.",
    };
  }

  const seenKinds = new Set<string>();
  const contactMethods: WaitlistProtectedContactMethod[] = [];
  let preferredContactKind: ContactKind | null = null;
  let preferredContactValue: string | null = null;

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const rawKind = "kind" in entry ? entry.kind : null;
    const rawValue = "value" in entry ? entry.value : null;
    const rawPreferred = "preferred" in entry ? entry.preferred : false;

    if (typeof rawKind !== "string" || typeof rawValue !== "string") {
      continue;
    }

    const kind = rawKind.trim() as ContactKind;
    const contactValue = rawValue.trim();
    if (!CONTACT_KINDS.includes(kind) || !contactValue) {
      continue;
    }
    if (contactValue.length > 200) {
      return {
        contactMethods: [],
        preferredContactKind: null,
        preferredContactValue: null,
        error: "Contact details must be 200 characters or less.",
      };
    }
    if (seenKinds.has(kind)) {
      return {
        contactMethods: [],
        preferredContactKind: null,
        preferredContactValue: null,
        error: "Each contact method can only be listed once.",
      };
    }

    seenKinds.add(kind);
    contactMethods.push({ kind, value: contactValue });

    if (rawPreferred === true) {
      preferredContactKind = kind;
      preferredContactValue = contactValue;
    }
  }

  if (contactMethods.length === 0) {
    return {
      contactMethods: [],
      preferredContactKind: null,
      preferredContactValue: null,
      error: "Add at least one contact method.",
    };
  }

  if (!preferredContactKind) {
    preferredContactKind = contactMethods[0]?.kind ?? null;
    preferredContactValue = contactMethods[0]?.value ?? null;
  }

  return { contactMethods, preferredContactKind, preferredContactValue, error: null };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let payload: ProtectedAccessPayload | null = null;

  try {
    payload = (await request.json()) as ProtectedAccessPayload;
  } catch {
    payload = null;
  }

  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const rowId = typeof payload?.rowId === "string" ? payload.rowId.trim() : "";
  const relationship =
    typeof payload?.relationship === "string"
      ? (payload.relationship.trim() as WaitlistProtectedAccessRelationship)
      : null;
  const supportingLinkRaw =
    typeof payload?.supportingLink === "string" ? payload.supportingLink.trim() : "";
  const additionalContextRaw =
    typeof payload?.additionalContext === "string" ? payload.additionalContext.trim() : "";

  if (!token || !rowId) {
    return NextResponse.json(
      { ok: false, error: "Missing token or row id.", requestId },
      { status: 400 },
    );
  }

  const parsed = parseWaitlistVerifyToken(token);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid verify token.", requestId },
      { status: 400 },
    );
  }

  const {
    contactMethods,
    preferredContactKind,
    preferredContactValue,
    error: contactError,
  } = normalizeContactMethods(payload?.contactMethods);

  if (contactError) {
    return NextResponse.json({ ok: false, error: contactError, requestId }, { status: 400 });
  }

  if (!relationship || !ALLOWED_RELATIONSHIPS.includes(relationship)) {
    return NextResponse.json(
      { ok: false, error: "Choose how you are related to this name.", requestId },
      { status: 400 },
    );
  }

  const supportingLink = supportingLinkRaw ? supportingLinkRaw : null;
  if (supportingLink && !validateUrlValue(supportingLink)) {
    return NextResponse.json(
      { ok: false, error: "Supporting link must start with http:// or https://.", requestId },
      { status: 400 },
    );
  }

  if (additionalContextRaw.length > 400) {
    return NextResponse.json(
      { ok: false, error: "Additional context must be 400 characters or less.", requestId },
      { status: 400 },
    );
  }

  try {
    const rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
    const row = rows.find((candidate) => candidate.id === rowId);

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Waitlist row not found for this verify link.", requestId },
        { status: 404 },
      );
    }

    const normalizedName = normalizeWaitlistName(row.name);
    if (!normalizedName) {
      return NextResponse.json(
        { ok: false, error: "This protected name is missing a usable value.", requestId },
        { status: 400 },
      );
    }

    const protectedNames = await getProtectedNameInfoByName([normalizedName]);
    const protectedName = protectedNames.get(normalizedName);
    if (!protectedName?.isProtected) {
      return NextResponse.json(
        { ok: false, error: "This name is not currently protected.", requestId },
        { status: 400 },
      );
    }

    const latestRequest = await getLatestProtectedAccessRequestForRow({
      rowId,
      normalizedEmail: parsed.normalizedEmail,
    });

    if (latestRequest?.status === "approved") {
      return NextResponse.json({
        ok: true,
        requestId,
        request: latestRequest,
      });
    }

    const protectedRequest = await submitOrUpdateProtectedAccessRequest({
      rowId,
      normalizedEmail: parsed.normalizedEmail,
      requestedName: row.name?.trim() || normalizedName,
      contactMethods,
      preferredContactKind: preferredContactKind!,
      preferredContactValue: preferredContactValue!,
      relationship,
      supportingLink,
      additionalContext: additionalContextRaw || null,
    });

    try {
      await sendProtectedNameAccessRequestNotice({
        event: latestRequest?.status === "submitted" ? "updated" : "submitted",
        request: protectedRequest,
      });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : "Protected-name request notice failed.";
      console.error("[waitlist-protected-access] notice email failed", {
        requestId,
        rowId,
        protectedRequestId: protectedRequest.id,
        normalizedEmail: parsed.normalizedEmail,
        error: message,
      });
    }

    return NextResponse.json({
      ok: true,
      requestId,
      request: protectedRequest,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Protected-name request failed.";
    console.error("[waitlist-protected-access] failed", {
      requestId,
      rowId,
      normalizedEmail: parsed.normalizedEmail,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
}
