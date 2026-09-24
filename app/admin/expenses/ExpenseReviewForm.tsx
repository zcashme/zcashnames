"use client";

import { useState } from "react";
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/lib/expenses/config";
import { saveExpenseReview } from "@/app/admin/expenses/actions";

export default function ExpenseReviewForm({
  id,
  status,
  adminNote,
}: {
  id: string;
  status: ExpenseStatus;
  adminNote: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        try {
          const result = await saveExpenseReview(new FormData(event.currentTarget));
          if (!result.ok) setError(result.error);
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
      >
        {EXPENSE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <textarea
        name="adminNote"
        defaultValue={adminNote ?? ""}
        rows={2}
        placeholder="Note"
        className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </form>
  );
}
