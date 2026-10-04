import { NextResponse } from "next/server";
import { createReceiptUploadSlot } from "@/lib/expenses/repository";
import { assertReceiptMeta } from "@/lib/expenses/parse";
import { assertExpenseSubmitAccess } from "@/lib/expenses/server-access";
import {
  expenseErrorMessage,
  type ReceiptUploadSlotResult,
} from "@/lib/expenses/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(result: ReceiptUploadSlotResult, status = 200) {
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  try {
    await assertExpenseSubmitAccess();
    const body = (await request.json()) as {
      name?: unknown;
      contentType?: unknown;
      size?: unknown;
    };
    const input = {
      name: typeof body.name === "string" ? body.name : "",
      contentType: typeof body.contentType === "string" ? body.contentType : "",
      size: typeof body.size === "number" ? body.size : Number.NaN,
    };
    assertReceiptMeta(input);
    const slot = await createReceiptUploadSlot(input);
    return json({ ok: true, ...slot });
  } catch (error) {
    const message = expenseErrorMessage(error, "Could not start the receipt upload.");
    const status = message.includes("shared team link")
      ? 401
      : message.includes("not configured")
        ? 503
        : 400;
    return json({ ok: false, error: message }, status);
  }
}
