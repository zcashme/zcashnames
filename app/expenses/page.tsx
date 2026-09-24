import type { Metadata } from "next";
import ExpenseForm from "@/app/expenses/ExpenseForm";
import { readExpenseAccessState } from "@/lib/expenses/server-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expense report",
  robots: { index: false, follow: false },
};

export default async function ExpensesPage() {
  const access = await readExpenseAccessState();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header
        className="mb-6 rounded-2xl border p-6"
        style={{ background: "var(--tool-panel-bg)", borderColor: "var(--tool-panel-border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">
          Team form
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg-heading">
          Submit an expense
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-fg-muted">
          Use this shared link to file a report with receipts. You will get a
          short reference after it lands in the review inbox.
        </p>
      </header>

      {access.ok ? (
        <section
          className="rounded-2xl border p-6"
          style={{ background: "var(--tool-panel-bg)", borderColor: "var(--tool-panel-border)" }}
        >
          <ExpenseForm />
        </section>
      ) : (
        <section
          className="rounded-2xl border p-6 text-sm leading-6 text-fg-body"
          style={{ background: "var(--tool-panel-bg)", borderColor: "var(--tool-panel-border)" }}
        >
          {access.reason === "unconfigured" ? (
            <p>
              This form is not configured yet. Set a dedicated
              <span className="font-mono"> EXPENSE_FORM_SECRET </span>
              on the deployment, then open the shared team link.
            </p>
          ) : (
            <p>
              This form is private. Open the shared team link you were sent.
              After that, this browser can submit reports.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
