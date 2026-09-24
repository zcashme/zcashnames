"use server";

import { headers } from "next/headers";
import { parseReceiptGrant } from "@/lib/expenses/receipt-grant";
import { assertExpenseSubmitAccess } from "@/lib/expenses/server-access";
import {
  assertReceiptUploaded,
  createReceiptUploadSlot,
  insertExpense,
} from "@/lib/expenses/repository";
import { assertReceiptMeta } from "@/lib/expenses/parse";

export type ExpenseActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type ReceiptUploadSlotResult =
  | {
      ok: true;
      grant: string;
      signedUrl: string;
      token: string;
      path: string;
    }
  | { ok: false; error: string };

export async function prepareExpenseReceiptUpload(input: {
  name: string;
  contentType: string;
  size: number;
}): Promise<ReceiptUploadSlotResult> {
  try {
    await assertExpenseSubmitAccess();
    assertReceiptMeta(input);
    const slot = await createReceiptUploadSlot(input);
    return { ok: true, ...slot };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not start the receipt upload.",
    };
  }
}

export async function submitExpenseReport(input: {
  submitterName: string;
  submitterEmail: string;
  amount: string;
  currency: string;
  expenseDate: string;
  category: string;
  merchant: string;
  description: string;
  receiptGrants: string[];
}): Promise<ExpenseActionResult> {
  try {
    await assertExpenseSubmitAccess();
    const receipts = input.receiptGrants.map((grant) => parseReceiptGrant(grant));
    for (const receipt of receipts) {
      await assertReceiptUploaded(receipt);
    }
    const headerStore = await headers();
    const inserted = await insertExpense({
      submitterName: input.submitterName,
      submitterEmail: input.submitterEmail,
      amount: input.amount,
      currency: input.currency,
      expenseDate: input.expenseDate,
      category: input.category,
      merchant: input.merchant,
      description: input.description,
      receipts,
      userAgent: headerStore.get("user-agent"),
    });
    return { ok: true, id: inserted.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not submit the expense.",
    };
  }
}
