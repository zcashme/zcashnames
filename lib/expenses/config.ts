export const EXPENSE_ACCESS_COOKIE_NAME = "zn_expense_access";
export const EXPENSE_ACCESS_QUERY_PARAM = "access";
export const EXPENSE_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const EXPENSE_STORAGE_BUCKET = "expense-receipts";
export const EXPENSE_MAX_RECEIPTS = 5;
export const EXPENSE_MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export const EXPENSE_CURRENCIES = ["USD", "ZEC"] as const;
export const EXPENSE_STATUSES = [
  "submitted",
  "reviewed",
  "reimbursed",
  "rejected",
] as const;
export const EXPENSE_CATEGORIES = [
  "travel",
  "meals",
  "software",
  "hardware",
  "contractor",
  "legal",
  "marketing",
  "other",
] as const;

export const EXPENSE_ALLOWED_RECEIPT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export type ExpenseCurrency = (typeof EXPENSE_CURRENCIES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseReceiptRecord = {
  path: string;
  name: string;
  contentType: string;
  size: number;
};

export type ExpenseRecord = {
  id: string;
  created_at: string;
  submitter_name: string;
  submitter_email: string;
  amount: number | string;
  currency: ExpenseCurrency;
  expense_date: string;
  category: string;
  merchant: string | null;
  description: string;
  receipts: ExpenseReceiptRecord[];
  status: ExpenseStatus;
  admin_note: string | null;
  reviewed_at: string | null;
};

export function isExpenseCurrency(value: string): value is ExpenseCurrency {
  return (EXPENSE_CURRENCIES as readonly string[]).includes(value);
}

export function isExpenseStatus(value: string): value is ExpenseStatus {
  return (EXPENSE_STATUSES as readonly string[]).includes(value);
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function isAllowedReceiptType(value: string): boolean {
  return (EXPENSE_ALLOWED_RECEIPT_TYPES as readonly string[]).includes(value);
}

export function expenseStorageBucket(): string {
  return process.env.EXPENSE_STORAGE_BUCKET?.trim() || EXPENSE_STORAGE_BUCKET;
}

export function formatExpenseAmount(
  amount: number | string,
  currency: string,
): string {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numeric);
  }
  if (currency === "ZEC") {
    return `${numeric.toLocaleString("en-US", {
      maximumFractionDigits: 8,
    })} ZEC`;
  }
  return `${numeric} ${currency}`;
}

export function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
