import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  expenseStorageBucket,
  isExpenseStatus,
  type ExpenseRecord,
  type ExpenseReceiptRecord,
  type ExpenseStatus,
} from "@/lib/expenses/config";
import { issueReceiptGrant } from "@/lib/expenses/receipt-grant";
import {
  assertReceiptList,
  parseAmount,
  parseCategory,
  parseEmail,
  parseExpenseDate,
  parseOptionalText,
  parseCurrency,
  sanitizeReceiptFilename,
  trimRequired,
} from "@/lib/expenses/parse";

function throwMappedDbError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
): never {
  const message = error?.message ?? "";
  const missingTable =
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (/zn_expenses/i.test(message) && /does not exist|schema cache/i.test(message));
  if (missingTable) {
    throw new Error("Apply sql/2026-09-23-zn-expenses.sql in the Supabase SQL editor.");
  }
  throw new Error(fallback);
}

function asExpenseRecord(row: Record<string, unknown>): ExpenseRecord {
  const receipts = Array.isArray(row.receipts)
    ? (row.receipts as ExpenseReceiptRecord[])
    : [];
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    submitter_name: String(row.submitter_name),
    submitter_email: String(row.submitter_email),
    amount: row.amount as number | string,
    currency: row.currency as ExpenseRecord["currency"],
    expense_date: String(row.expense_date),
    category: String(row.category),
    merchant: typeof row.merchant === "string" ? row.merchant : null,
    description: String(row.description),
    receipts,
    status: row.status as ExpenseStatus,
    admin_note: typeof row.admin_note === "string" ? row.admin_note : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
  };
}

export async function createReceiptUploadSlot(input: {
  name: string;
  contentType: string;
  size: number;
}): Promise<{ grant: string; signedUrl: string; token: string; path: string }> {
  const filename = sanitizeReceiptFilename(input.name);
  const path = `expenses/${new Date().toISOString().slice(0, 10)}/${randomUUID()}/${filename}`;
  const receipt: ExpenseReceiptRecord = {
    path,
    name: filename,
    contentType: input.contentType,
    size: input.size,
  };
  const grant = issueReceiptGrant(receipt);
  const bucket = expenseStorageBucket();
  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.signedUrl || !data.token) {
    throw new Error("Could not prepare the receipt upload. Try again.");
  }
  return {
    grant,
    signedUrl: data.signedUrl,
    token: data.token,
    path,
  };
}

export async function assertReceiptUploaded(receipt: ExpenseReceiptRecord): Promise<void> {
  const { error } = await db.storage
    .from(expenseStorageBucket())
    .createSignedUrl(receipt.path, 15);
  if (error) {
    throw new Error(`Receipt "${receipt.name}" did not finish uploading. Try again.`);
  }
}

export async function insertExpense(input: {
  submitterName: unknown;
  submitterEmail: unknown;
  amount: unknown;
  currency: unknown;
  expenseDate: unknown;
  category: unknown;
  merchant: unknown;
  description: unknown;
  receipts: ExpenseReceiptRecord[];
  userAgent: string | null;
}): Promise<{ id: string }> {
  assertReceiptList(input.receipts);
  const currency = parseCurrency(input.currency);
  const row = {
    submitter_name: trimRequired(input.submitterName, "Name", 120),
    submitter_email: parseEmail(input.submitterEmail),
    amount: parseAmount(input.amount, currency),
    currency,
    expense_date: parseExpenseDate(input.expenseDate),
    category: parseCategory(input.category),
    merchant: parseOptionalText(input.merchant, "Merchant", 160),
    description: trimRequired(input.description, "Description", 2000),
    receipts: input.receipts,
    status: "submitted",
    user_agent: input.userAgent?.slice(0, 400) || null,
  };

  const { data, error } = await db
    .from("zn_expenses")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[expenses] insert failed:", error);
    throwMappedDbError(error, "Could not save the expense. Try again.");
  }

  return { id: String(data.id) };
}

export async function listExpenses(status?: ExpenseStatus | "all"): Promise<ExpenseRecord[]> {
  let query = db
    .from("zn_expenses")
    .select(
      "id, created_at, submitter_name, submitter_email, amount, currency, expense_date, category, merchant, description, receipts, status, admin_note, reviewed_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[expenses] list failed:", error);
    throwMappedDbError(error, "Could not load expenses.");
  }
  return (data ?? []).map((row) => asExpenseRecord(row as Record<string, unknown>));
}

export async function getExpense(id: string): Promise<ExpenseRecord | null> {
  const { data, error } = await db
    .from("zn_expenses")
    .select(
      "id, created_at, submitter_name, submitter_email, amount, currency, expense_date, category, merchant, description, receipts, status, admin_note, reviewed_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[expenses] get failed:", error);
    throwMappedDbError(error, "Could not load that expense.");
  }
  if (!data) return null;
  return asExpenseRecord(data as Record<string, unknown>);
}

export async function createExpenseReceiptSignedUrl(
  expenseId: string,
  path: string,
): Promise<string> {
  const expense = await getExpense(expenseId);
  if (!expense) {
    throw new Error("Expense not found.");
  }
  const match = expense.receipts.find((receipt) => receipt.path === path);
  if (!match) {
    throw new Error("Receipt not found on this expense.");
  }
  const { data, error } = await db.storage
    .from(expenseStorageBucket())
    .createSignedUrl(path, 120);
  if (error || !data?.signedUrl) {
    throw new Error("Could not open that receipt.");
  }
  return data.signedUrl;
}

export async function updateExpenseReview(input: {
  id: string;
  status: string;
  adminNote: string;
}): Promise<void> {
  if (!isExpenseStatus(input.status)) {
    throw new Error("Choose a valid status.");
  }
  const note = input.adminNote.trim().slice(0, 2000);
  const { error } = await db
    .from("zn_expenses")
    .update({
      status: input.status,
      admin_note: note || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) {
    console.error("[expenses] update failed:", error);
    throwMappedDbError(error, "Could not update that expense.");
  }
}
