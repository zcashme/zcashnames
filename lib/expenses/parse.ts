import {
  EXPENSE_MAX_RECEIPT_BYTES,
  EXPENSE_MAX_RECEIPTS,
  isAllowedReceiptType,
  isExpenseCategory,
  isExpenseCurrency,
  type ExpenseCategory,
  type ExpenseCurrency,
  type ExpenseReceiptRecord,
} from "@/lib/expenses/config";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function trimRequired(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required.`);
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long.`);
  }
  return trimmed;
}

export function parseOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long.`);
  }
  return trimmed;
}

export function parseEmail(value: unknown): string {
  const email = trimRequired(value, "Email", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

export function parseExpenseDate(value: unknown): string {
  const raw = trimRequired(value, "Expense date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("Expense date must be YYYY-MM-DD.");
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Expense date is invalid.");
  }
  const today = new Date();
  const latest = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (parsed.getTime() > latest) {
    throw new Error("Expense date cannot be in the future.");
  }
  return raw;
}

export function parseAmount(value: unknown, currency: ExpenseCurrency): string {
  const raw = trimRequired(value, "Amount", 32).replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error("Amount must be a positive number.");
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  const decimals = raw.includes(".") ? raw.split(".")[1]!.length : 0;
  const maxDecimals = currency === "USD" ? 2 : 8;
  if (decimals > maxDecimals) {
    throw new Error(
      currency === "USD"
        ? "USD amounts can have at most two decimal places."
        : "ZEC amounts can have at most eight decimal places.",
    );
  }
  if (numeric > 1_000_000) {
    throw new Error("Amount is too large.");
  }
  return raw;
}

export function parseCurrency(value: unknown): ExpenseCurrency {
  const currency = trimRequired(value, "Currency", 8).toUpperCase();
  if (!isExpenseCurrency(currency)) {
    throw new Error("Choose USD or ZEC.");
  }
  return currency;
}

export function parseCategory(value: unknown): ExpenseCategory {
  const category = trimRequired(value, "Category", 32).toLowerCase();
  if (!isExpenseCategory(category)) {
    throw new Error("Choose a valid category.");
  }
  return category;
}

export function inferReceiptContentType(name: string, reportedType: string): string {
  const reported = reportedType.trim().toLowerCase();
  if (reported === "image/jpg") return "image/jpeg";
  if (isAllowedReceiptType(reported)) return reported;

  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return reportedType;
}

export function sanitizeReceiptFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop()?.trim() || "receipt";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  const trimmed = cleaned.replace(/^[.-]+/, "").slice(0, 80);
  return trimmed || "receipt";
}

export function assertReceiptMeta(input: {
  contentType: string;
  size: number;
  name: string;
}): void {
  if (!input.name.trim()) {
    throw new Error("Receipt filename is required.");
  }
  if (!isAllowedReceiptType(input.contentType)) {
    throw new Error("Receipts must be a PDF or image (JPEG, PNG, WebP, GIF, or HEIC).");
  }
  if (!Number.isInteger(input.size) || input.size <= 0) {
    throw new Error("Receipt file is empty.");
  }
  if (input.size > EXPENSE_MAX_RECEIPT_BYTES) {
    throw new Error("Each receipt must be 10 MB or smaller.");
  }
}

export function assertReceiptList(receipts: ExpenseReceiptRecord[]): void {
  if (receipts.length < 1) {
    throw new Error("At least one receipt is required.");
  }
  if (receipts.length > EXPENSE_MAX_RECEIPTS) {
    throw new Error(`You can attach at most ${EXPENSE_MAX_RECEIPTS} receipts.`);
  }
}
