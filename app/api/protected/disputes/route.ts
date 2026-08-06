import { NextResponse } from "next/server";
import {
  getDisputableProtectedNameByName,
  submitProtectedNameDispute,
  validateProtectedDisputePayload,
} from "@/lib/protected/disputes";
import type {
  ProtectedSuggestionContactMethod,
  ProtectedDisputePayload,
} from "@/lib/protected/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProtectedDisputeRequestBody = {
  name?: unknown;
  normalizedName?: unknown;
  category?: unknown;
  parentName?: unknown;
  reason?: unknown;
  evidenceLinks?: unknown;
  contactMethods?: unknown;
  unifiedAddress?: unknown;
};

function normalizeRequestBody(
  body: ProtectedDisputeRequestBody | null,
): ProtectedDisputePayload {
  return {
    name: typeof body?.name === "string" ? body.name : "",
    normalizedName: typeof body?.normalizedName === "string" ? body.normalizedName : "",
    category: typeof body?.category === "string" ? body.category : "",
    parentName: typeof body?.parentName === "string" ? body.parentName : null,
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
  let body: ProtectedDisputeRequestBody | null = null;

  try {
    body = (await request.json()) as ProtectedDisputeRequestBody;
  } catch {
    body = null;
  }

  const payload = normalizeRequestBody(body);
  const { normalizedPayload, error } = validateProtectedDisputePayload(payload);

  if (error) {
    return NextResponse.json({ ok: false, error, requestId }, { status: 400 });
  }

  try {
    const disputableName = await getDisputableProtectedNameByName(normalizedPayload.name);
    if (!disputableName) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only non-redeemed protected or rejected names can be disputed.",
          requestId,
        },
        { status: 404 },
      );
    }

    const submission = await submitProtectedNameDispute({
      ...normalizedPayload,
      name: disputableName.value,
      normalizedName: disputableName.normalizedName,
      parentName: normalizedPayload.parentName ?? disputableName.parentName,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      submission,
    });
  } catch (submitError) {
    const message =
      submitError instanceof Error
        ? submitError.message
        : "Failed to submit protected name dispute.";

    if (message.includes("Redeemed names cannot be disputed")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Redeemed names cannot be disputed.",
          requestId,
        },
        { status: 409 },
      );
    }

    if (
      message.includes("Only protected or rejected")
      || message.includes("was not found")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only non-redeemed protected or rejected names can be disputed.",
          requestId,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: false, error: message, requestId },
      { status: 500 },
    );
  }
}
