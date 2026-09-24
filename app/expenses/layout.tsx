import type { ReactNode } from "react";

export default function ExpensesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--fg)]">
      {children}
    </div>
  );
}
