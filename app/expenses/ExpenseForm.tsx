"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  EXPENSE_ALLOWED_RECEIPT_TYPES,
  EXPENSE_CATEGORIES,
  EXPENSE_CURRENCIES,
  EXPENSE_MAX_RECEIPT_BYTES,
  EXPENSE_MAX_RECEIPTS,
  categoryLabel,
} from "@/lib/expenses/config";
import { inferReceiptContentType } from "@/lib/expenses/parse";
import {
  prepareExpenseReceiptUpload,
  submitExpenseReport,
} from "@/app/expenses/actions";

const accept = EXPENSE_ALLOWED_RECEIPT_TYPES.join(",");

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function fieldClassName(): string {
  return "mt-1 w-full rounded-lg border px-3 py-2 text-sm text-fg outline-none focus:border-amber-400";
}

export default function ExpenseForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const maxDate = useMemo(() => todayIsoDate(), []);

  if (submittedId) {
    return (
      <div className="rounded-2xl border p-6" style={{ background: "var(--tool-panel-bg)", borderColor: "var(--tool-panel-border)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">Submitted</p>
        <h2 className="mt-2 text-xl font-semibold text-fg-heading">Expense received</h2>
        <p className="mt-3 text-sm leading-6 text-fg-body">
          Reference <span className="font-mono text-fg-heading">{submittedId.slice(0, 8)}</span>.
          Keep that if you need to follow up. Receipts were attached with this report.
        </p>
        <button
          type="button"
          className="mt-5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950"
          onClick={() => {
            setSubmittedId(null);
            setFiles([]);
            setError(null);
          }}
        >
          Submit another
        </button>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    if (files.length < 1) {
      setError("Attach at least one receipt.");
      return;
    }

    setPending(true);
    try {
      const grants: string[] = [];
      for (const file of files) {
        const contentType = inferReceiptContentType(file.name, file.type);
        const slot = await prepareExpenseReceiptUpload({
          name: file.name,
          contentType,
          size: file.size,
        });
        if (!slot.ok) {
          setError(slot.error);
          return;
        }

        const uploaded = await fetch(slot.signedUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${slot.token}`,
            "Content-Type": contentType,
            "x-upsert": "false",
          },
          body: file,
        });
        if (!uploaded.ok) {
          setError("Could not upload a receipt. Try a smaller PDF or image.");
          return;
        }
        grants.push(slot.grant);
      }

      const result = await submitExpenseReport({
        submitterName: String(data.get("submitterName") ?? ""),
        submitterEmail: String(data.get("submitterEmail") ?? ""),
        amount: String(data.get("amount") ?? ""),
        currency: String(data.get("currency") ?? ""),
        expenseDate: String(data.get("expenseDate") ?? ""),
        category: String(data.get("category") ?? ""),
        merchant: String(data.get("merchant") ?? ""),
        description: String(data.get("description") ?? ""),
        receiptGrants: grants,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setFiles([]);
      setSubmittedId(result.id);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit the expense.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-fg-muted">
          Name
          <input
            required
            name="submitterName"
            autoComplete="name"
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          />
        </label>
        <label className="text-sm text-fg-muted">
          Email
          <input
            required
            type="email"
            name="submitterEmail"
            autoComplete="email"
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm text-fg-muted">
          Amount
          <input
            required
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          />
        </label>
        <label className="text-sm text-fg-muted">
          Currency
          <select
            required
            name="currency"
            defaultValue="USD"
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          >
            {EXPENSE_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-fg-muted">
          Expense date
          <input
            required
            type="date"
            name="expenseDate"
            max={maxDate}
            defaultValue={maxDate}
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-fg-muted">
          Category
          <select
            required
            name="category"
            defaultValue="other"
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-fg-muted">
          Merchant
          <input
            name="merchant"
            placeholder="Vendor or payee"
            className={fieldClassName()}
            style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          />
        </label>
      </div>

      <label className="text-sm text-fg-muted">
        Description
        <textarea
          required
          name="description"
          rows={4}
          placeholder="What this was for"
          className={fieldClassName()}
          style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
        />
      </label>

      <label className="text-sm text-fg-muted">
        Receipts
        <input
          required
          type="file"
          accept={accept}
          multiple
          className={`${fieldClassName()} file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-zinc-950`}
          style={{ background: "var(--color-surface)", borderColor: "var(--border)" }}
          onChange={(event) => {
            const next = Array.from(event.target.files ?? []);
            if (next.length > EXPENSE_MAX_RECEIPTS) {
              setError(`Attach at most ${EXPENSE_MAX_RECEIPTS} receipts.`);
              event.target.value = "";
              setFiles([]);
              return;
            }
            const oversized = next.find((file) => file.size > EXPENSE_MAX_RECEIPT_BYTES);
            if (oversized) {
              setError("Each receipt must be 10 MB or smaller.");
              event.target.value = "";
              setFiles([]);
              return;
            }
            setError(null);
            setFiles(next);
          }}
        />
        <span className="mt-1 block text-xs text-fg-dim">
          Required. PDF or image, up to {EXPENSE_MAX_RECEIPTS} files, 10 MB each.
        </span>
        {files.length > 0 ? (
          <ul className="mt-2 grid gap-1 text-xs text-fg-body">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>{file.name}</li>
            ))}
          </ul>
        ) : null}
      </label>

      {error ? (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit expense"}
      </button>
    </form>
  );
}
