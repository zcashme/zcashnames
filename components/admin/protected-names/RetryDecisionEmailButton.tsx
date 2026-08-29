"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryProtectedNameDecisionEmailAction } from "@/app/admin/protected-names/actions";

export default function RetryDecisionEmailButton({ decisionId }: { decisionId: string }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <span className="ml-2"><button type="button" disabled={pending} onClick={() => startTransition(async () => { setError(null); const result = await retryProtectedNameDecisionEmailAction(decisionId); if (!result.ok) { setError(result.message); return; } router.refresh(); })} className="text-xs text-amber-300 hover:text-amber-200 disabled:opacity-50">{pending ? "Retrying..." : "Retry email"}</button>{error ? <span className="ml-2 text-xs text-red-300">{error}</span> : null}</span>;
}
