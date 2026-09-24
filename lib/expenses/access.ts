import { isLocalRequestHost } from "@/lib/admin/local-only";
import {
  EXPENSE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  EXPENSE_ACCESS_COOKIE_NAME,
} from "@/lib/expenses/config";

const MIN_SECRET_LENGTH = 16;

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getExpenseFormSecret(): string | null {
  const secret = process.env.EXPENSE_FORM_SECRET?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) return null;

  const adminPassword = process.env.ADMIN_PASSWORD?.trim() ?? "";
  const adminUsername = process.env.ADMIN_USERNAME?.trim() ?? "";
  if (adminPassword && constantTimeEqual(secret, adminPassword)) return null;
  if (adminUsername && constantTimeEqual(secret, adminUsername)) return null;

  return secret;
}

export function expenseAccessCookieOptions() {
  return {
    name: EXPENSE_ACCESS_COOKIE_NAME,
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/expenses",
    maxAge: EXPENSE_ACCESS_COOKIE_MAX_AGE_SECONDS,
  };
}

export async function hashExpenseAccessCookie(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`expense-access:v1:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function isValidExpenseAccessCookie(
  cookieValue: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await hashExpenseAccessCookie(secret);
  return constantTimeEqual(cookieValue, expected);
}

export function isExpensePath(pathname: string): boolean {
  return pathname === "/expenses" || pathname.startsWith("/expenses/");
}

export function canBypassExpenseAccess(host: string | null | undefined): boolean {
  return isLocalRequestHost(host);
}
