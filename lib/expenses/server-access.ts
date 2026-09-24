import "server-only";

import { cookies, headers } from "next/headers";
import {
  canBypassExpenseAccess,
  getExpenseFormSecret,
  isValidExpenseAccessCookie,
} from "@/lib/expenses/access";
import { EXPENSE_ACCESS_COOKIE_NAME } from "@/lib/expenses/config";

export type ExpenseAccessState =
  | { ok: true; reason: "local" | "cookie" }
  | { ok: false; reason: "unconfigured" | "missing" };

export async function readExpenseAccessState(): Promise<ExpenseAccessState> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (canBypassExpenseAccess(host)) {
    return { ok: true, reason: "local" };
  }

  const secret = getExpenseFormSecret();
  if (!secret) {
    return { ok: false, reason: "unconfigured" };
  }

  const store = await cookies();
  const cookieValue = store.get(EXPENSE_ACCESS_COOKIE_NAME)?.value ?? null;
  if (await isValidExpenseAccessCookie(cookieValue, secret)) {
    return { ok: true, reason: "cookie" };
  }

  return { ok: false, reason: "missing" };
}

export async function assertExpenseSubmitAccess(): Promise<void> {
  const state = await readExpenseAccessState();
  if (state.ok) return;
  if (state.reason === "unconfigured") {
    throw new Error("Expense form is not configured.");
  }
  throw new Error("Open the shared team link to submit an expense.");
}
