import type { ActionErrorCode, ActionResult } from "@/lib/protected-names/types";

export function mapProtectedNameRpcError(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected error.";

  const code = extractErrorCode(message);
  return {
    ok: false,
    code,
    message: stripErrorPrefix(message),
  };
}

function extractErrorCode(message: string): ActionErrorCode {
  if (message.includes("PN_NOT_FOUND:")) return "NOT_FOUND";
  if (message.includes("PN_CONFLICT:")) return "CONFLICT";
  if (message.includes("PN_VALIDATION:")) return "VALIDATION";
  if (message.includes("PN_CONCURRENCY:")) return "CONCURRENCY";
  if (
    message.includes("function public.admin_protected_name")
    || message.includes("Could not find the function")
    || message.includes("does not exist")
  ) {
    return "UNKNOWN";
  }
  return "UNKNOWN";
}

function stripErrorPrefix(message: string): string {
  const stripped = message
    .replace(/.*PN_(NOT_FOUND|CONFLICT|VALIDATION|CONCURRENCY):\s*/i, "")
    .trim();
  return stripped || message;
}

export function setupHintIfMissingRpc(message: string): string {
  if (
    message.includes("Could not find the function")
    || message.includes("function public.admin_protected_name")
    || message.includes("schema cache")
  ) {
    return `${message} Apply sql/2026-08-06-protected-names-admin-ops.sql in Supabase first.`;
  }
  return message;
}
