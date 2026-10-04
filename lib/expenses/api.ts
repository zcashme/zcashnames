export type ExpenseSubmitResult =
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

export function expenseErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
