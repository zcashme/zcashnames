import Link from "next/link";
import type { ReactNode } from "react";
import ExpenseReviewForm from "@/app/admin/expenses/ExpenseReviewForm";
import ReceiptLink from "@/app/admin/expenses/ReceiptLink";
import {
  EXPENSE_STATUSES,
  categoryLabel,
  formatExpenseAmount,
  isExpenseStatus,
  type ExpenseStatus,
} from "@/lib/expenses/config";
import type { ExpenseRecord } from "@/lib/expenses/config";
import { listExpenses } from "@/lib/expenses/repository";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExpensesAdminPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const statusParam = firstParam(params.status)?.trim() ?? "all";
  const statusFilter: ExpenseStatus | "all" =
    statusParam === "all" || !isExpenseStatus(statusParam) ? "all" : statusParam;

  let rows: ExpenseRecord[] = [];
  let loadError: string | null = null;
  try {
    rows = await listExpenses(statusFilter);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load expenses.";
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
        <p className="text-sm text-zinc-400">
          Team submissions from the shared <span className="font-mono">/expenses</span> link.
          Receipts open as short-lived signed URLs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <FilterLink active={statusFilter === "all"} href="/admin/expenses">
            All
          </FilterLink>
          {EXPENSE_STATUSES.map((status) => (
            <FilterLink
              key={status}
              active={statusFilter === status}
              href={`/admin/expenses?status=${status}`}
            >
              {status}
            </FilterLink>
          ))}
        </div>
      </section>

      {loadError ? (
        <div className="rounded border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
          No expenses in this view yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Details</th>
                <th className="px-3 py-2 font-medium">Receipts</th>
                <th className="px-3 py-2 font-medium">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-800 align-top">
                  <td className="px-3 py-3 text-zinc-400">
                    <div>{new Date(row.created_at).toLocaleString()}</div>
                    <div className="font-mono text-xs text-zinc-600">
                      {row.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-zinc-100">{row.submitter_name}</div>
                    <div className="text-xs text-zinc-400">{row.submitter_email}</div>
                  </td>
                  <td className="px-3 py-3 text-zinc-100">
                    {formatExpenseAmount(row.amount, row.currency)}
                    <div className="text-xs text-zinc-500">{row.expense_date}</div>
                  </td>
                  <td className="px-3 py-3 text-zinc-300">
                    <div>{categoryLabel(row.category)}</div>
                    {row.merchant ? (
                      <div className="text-xs text-zinc-400">{row.merchant}</div>
                    ) : null}
                    <p className="mt-1 max-w-sm whitespace-pre-wrap text-xs text-zinc-400">
                      {row.description}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="grid gap-2 text-xs">
                      {row.receipts.map((receipt) => (
                        <ReceiptLink
                          key={receipt.path}
                          expenseId={row.id}
                          path={receipt.path}
                          label={receipt.name}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <ExpenseReviewForm
                      id={row.id}
                      status={row.status}
                      adminNote={row.admin_note}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-zinc-950"
          : "rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-600"
      }
    >
      {children}
    </Link>
  );
}
