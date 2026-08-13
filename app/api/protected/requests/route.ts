import { NextResponse } from "next/server";
import {
  CAPTCHA_ERROR_MESSAGE,
  CAPTCHA_FAILED_CODE,
  verifyRequestCaptcha,
} from "@/lib/captcha/http";
import { sendProtectedNameAccessRequestNotice } from "@/lib/email/protected-name-access";
import {
  getLatestProtectedAccessRequestForEmailAndName,
  getLatestProtectedAccessRequestForRow,
} from "@/lib/campaigns/waitlist-protected-access";
import {
  findWaitlistRowsByNormalizedEmail,
  normalizeWaitlistName,
} from "@/lib/campaigns/waitlist-verify";
import {
  submitPublicProtectedAccessRequest,
  validateProtectedRequestPayload,
} from "@/lib/protected/requests";
import type {
  ProtectedAccessRelationship,
  ProtectedRequestContactMethod,
  ProtectedRequestPayload,
} from "@/lib/protected/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProtectedRequestBody = {
  name?: unknown;
  normalizedName?: unknown;
  contactMethods?: unknown;
  relationship?: unknown;
  supportingLink?: unknown;
  additionalContext?: unknown;
  captcha_token?: unknown;
  captcha_answer?: unknown;
};

function normalizeRequestBody(body: ProtectedRequestBody | null): ProtectedRequestPayload {
  return {
    name: typeof body?.name === "string" ? body.name : "",
    normalizedName: typeof body?.normalizedName === "string" ? body.normalizedName : "",
    contactMethods: Array.isArray(body?.contactMethods)
      ? body.contactMethods.filter(
          (entry): entry is ProtectedRequestContactMethod =>
            !!entry && typeof entry === "object",
        )
      : [],
    relationship:
      typeof body?.relationship === "string"
        ? (body.relationship as ProtectedAccessRelationship)
        : "personal_or_public_name",
    supportingLink: typeof body?.supportingLink === "string" ? body.supportingLink : null,
    additionalContext:
      typeof body?.additionalContext === "string" ? body.additionalContext : null,
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let body: ProtectedRequestBody | null = null;

  try {
    body = (await request.json()) as ProtectedRequestBody;
  } catch {
    body = null;
  }

  if (!verifyRequestCaptcha(body)) {
    return NextResponse.json(
      { ok: false, error: CAPTCHA_ERROR_MESSAGE, code: CAPTCHA_FAILED_CODE, requestId },
      { status: 400 },
    );
  }

  const payload = normalizeRequestBody(body);
  const { normalizedPayload, error } = validateProtectedRequestPayload(payload);

  if (error) {
    return NextResponse.json({ ok: false, error, requestId }, { status: 400 });
  }

  try {
    const waitlistRows = await findWaitlistRowsByNormalizedEmail(
      normalizedPayload.submittedByEmail,
    );
    const matchingWaitlistRow =
      waitlistRows.find(
        (row) => normalizeWaitlistName(row.name) === normalizedPayload.normalizedName,
      ) ?? null;

    const latestRequest = matchingWaitlistRow
      ? await getLatestProtectedAccessRequestForRow({
          rowId: matchingWaitlistRow.id,
          normalizedEmail: normalizedPayload.submittedByEmail,
        })
      : await getLatestProtectedAccessRequestForEmailAndName({
          normalizedEmail: normalizedPayload.submittedByEmail,
          requestedName: normalizedPayload.name,
        });

    const protectedRequest = await submitPublicProtectedAccessRequest(normalizedPayload);

    try {
      await sendProtectedNameAccessRequestNotice({
        event: latestRequest?.status === "submitted" ? "updated" : "submitted",
        request: protectedRequest,
      });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : "Protected-name request notice failed.";
      console.error("[protected-requests] notice email failed", {
        requestId,
        protectedRequestId: protectedRequest.id,
        normalizedEmail: normalizedPayload.submittedByEmail,
        error: message,
      });
    }

    return NextResponse.json({
      ok: true,
      requestId,
      request: protectedRequest,
    });
  } catch (submitError) {
    const message =
      submitError instanceof Error
        ? submitError.message
        : "Failed to submit protected name access request.";

    if (message.includes("do not require this form")) {
      return NextResponse.json({ ok: false, error: message, requestId }, { status: 400 });
    }

    if (
      message.includes("Only non-redeemed protected names")
      || message.includes("not currently protected")
    ) {
      return NextResponse.json({ ok: false, error: message, requestId }, { status: 404 });
    }

    console.error("[protected-requests] failed", {
      requestId,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
}
