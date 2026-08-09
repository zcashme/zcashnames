import { NextResponse } from "next/server";
import {
  CAPTCHA_ERROR_MESSAGE,
  CAPTCHA_FAILED_CODE,
  verifyRequestCaptcha,
} from "@/lib/captcha/http";
import {
  getCanonicalProtectedNameByName,
  protectedSuggestionNameExists,
  submitProtectedNameSuggestion,
  validateProtectedSuggestionPayload,
} from "@/lib/protected/suggestions";
import type {
  ProtectedSuggestionContactMethod,
  ProtectedSuggestionPayload,
} from "@/lib/protected/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProtectedSuggestionRequestBody = {
  suggestionType?: unknown;
  name?: unknown;
  parentName?: unknown;
  category?: unknown;
  reason?: unknown;
  evidenceLinks?: unknown;
  contactMethods?: unknown;
  unifiedAddress?: unknown;
  captcha_token?: unknown;
  captcha_answer?: unknown;
};

function normalizeRequestBody(
  body: ProtectedSuggestionRequestBody | null,
): ProtectedSuggestionPayload {
  return {
    suggestionType: body?.suggestionType === "variant" ? "variant" : "canonical",
    name: typeof body?.name === "string" ? body.name : "",
    parentName: typeof body?.parentName === "string" ? body.parentName : null,
    category: typeof body?.category === "string" ? body.category : "",
    reason: typeof body?.reason === "string" ? body.reason : "",
    evidenceLinks: Array.isArray(body?.evidenceLinks)
      ? body.evidenceLinks.filter((entry): entry is string => typeof entry === "string")
      : [],
    contactMethods: Array.isArray(body?.contactMethods)
      ? body.contactMethods.filter(
          (entry): entry is ProtectedSuggestionContactMethod =>
            !!entry && typeof entry === "object",
        )
      : [],
    unifiedAddress:
      typeof body?.unifiedAddress === "string" ? body.unifiedAddress : null,
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let body: ProtectedSuggestionRequestBody | null = null;

  try {
    body = (await request.json()) as ProtectedSuggestionRequestBody;
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
  const { normalizedPayload, error } = validateProtectedSuggestionPayload(payload);

  if (error) {
    return NextResponse.json({ ok: false, error, requestId }, { status: 400 });
  }

  try {
    const duplicateExists = await protectedSuggestionNameExists(normalizedPayload.name);
    if (duplicateExists) {
      return NextResponse.json(
        { ok: false, error: "This name has already been submitted.", requestId },
        { status: 409 },
      );
    }

    if (normalizedPayload.suggestionType === "variant") {
      const canonicalName = await getCanonicalProtectedNameByName(
        normalizedPayload.parentName ?? "",
      );
      if (!canonicalName) {
        return NextResponse.json(
          {
            ok: false,
            error: "The parent name must be submitted before its variants.",
            requestId,
          },
          { status: 400 },
        );
      }
    }

    const submission = await submitProtectedNameSuggestion(normalizedPayload);

    return NextResponse.json({
      ok: true,
      requestId,
      submission,
    });
  } catch (submitError) {
    const message =
      submitError instanceof Error
        ? submitError.message
        : "Failed to submit protected name suggestion.";

    if (
      message.includes("normalized_name")
      || message.includes("zn_protected_names_normalized_name_key")
    ) {
      return NextResponse.json(
        { ok: false, error: "This name has already been submitted.", requestId },
        { status: 409 },
      );
    }

    if (message.includes("parent_name")) {
      return NextResponse.json(
        {
          ok: false,
          error: "The parent name must be submitted before its variants.",
          requestId,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: message, requestId },
      { status: 500 },
    );
  }
}
