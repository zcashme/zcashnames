"use server";

import { revalidatePath } from "next/cache";
import {
  createExpenseReceiptSignedUrl,
  updateExpenseReview,
} from "@/lib/expenses/repository";

export async function getExpenseReceiptUrl(
  expenseId: string,
  path: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const url = await createExpenseReceiptSignedUrl(expenseId, path);
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not open that receipt.",
    };
  }
}

export async function saveExpenseReview(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateExpenseReview({
      id: String(formData.get("id") ?? ""),
      status: String(formData.get("status") ?? ""),
      adminNote: String(formData.get("adminNote") ?? ""),
    });
    revalidatePath("/admin/expenses");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update that expense.",
    };
  }
}
