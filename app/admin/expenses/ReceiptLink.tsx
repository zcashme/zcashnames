"use client";

import { useState } from "react";
import { getExpenseReceiptUrl } from "@/app/admin/expenses/actions";

export default function ReceiptLink({
  expenseId,
  path,
  label,
}: {
  expenseId: string;
  path: string;
  label: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className="text-amber-400 hover:text-amber-300 disabled:opacity-60"
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            const result = await getExpenseReceiptUrl(expenseId, path);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.open(result.url, "_blank", "noopener,noreferrer");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Opening…" : label}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </span>
  );
}
