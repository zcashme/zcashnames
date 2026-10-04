import { NextResponse } from "next/server";
import { parseReceiptGrant } from "@/lib/expenses/receipt-grant";
import { assertExpenseSubmitAccess } from "@/lib/expenses/server-access";
import {
  assertReceiptUploaded,
  insertExpense,
} from "@/lib/expenses/repository";
import {
  expenseErrorMessage,
  type ExpenseSubmitResult,
} from "@/lib/expenses/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(result: ExpenseSubmitResult, status = 200) {
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  try {
    await assertExpenseSubmitAccess();
    const body = (await request.json()) as {
      submitterName?: unknown;
      submitterEmail?: unknown;
      amount?: unknown;
      currency?: unknown;
      expenseDate?: unknown;
      category?: unknown;
      merchant?: unknown;
      description?: unknown;
      receiptGrants?: unknown;
    };
    const grants = Array.isArray(body.receiptGrants)
      ? body.receiptGrants.filter((grant): grant is string => typeof grant === "string")
      : [];
    const receipts = grants.map((grant) => parseReceiptGrant(grant));
    for (const receipt of receipts) {
      await assertReceiptUploaded(receipt);
    }
    const inserted = await insertExpense({
      submitterName: body.submitterName,
      submitterEmail: body.submitterEmail,
      amount: body.amount,
      currency: body.currency,
      expenseDate: body.expenseDate,
      category: body.category,
      merchant: body.merchant,
      description: body.description,
      receipts,
      userAgent: request.headers.get("user-agent"),
    });
    return json({ ok: true, id: inserted.id });
  } catch (error) {
    const message = expenseErrorMessage(error, "Could not submit the expense.");
    const status = message.includes("shared team link")
      ? 401
      : message.includes("not configured")
        ? 503
        : 400;
    return json({ ok: false, error: message }, status);
  }
}
