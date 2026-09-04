import Link from "next/link";
import DecisionCorrectionForm from "@/components/admin/protected-names/DecisionCorrectionForm";
import DecisionEmailAttemptActions from "@/components/admin/protected-names/DecisionEmailAttemptActions";
import type { ProtectedNameDecision } from "@/lib/protected-names/types";

type Props = { decisions: ProtectedNameDecision[]; showSourceLink?: boolean };

function date(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function DecisionHistory({ decisions, showSourceLink = false }: Props) {
  if (decisions.length === 0) return null;
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Decision history</h2>
      <div className="mt-3 space-y-3">
        {decisions.map((decision) => (
          <article key={decision.id} className="rounded border border-zinc-800 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-100">{decision.decision}</span>
              <span className="text-xs text-zinc-500">{date(decision.decided_at)}</span>
            </div>
            {showSourceLink ? <Link href={decision.source_href} className="mt-1 inline-block text-xs text-amber-300 hover:text-amber-200">Open source record</Link> : null}
            <div className="mt-2"><div className="text-xs uppercase tracking-wide text-zinc-500">Original reason</div><p className="mt-1 whitespace-pre-wrap text-zinc-300">{decision.reason}</p></div>
            {decision.amendments.length ? <div className="mt-3 space-y-2 border-l border-amber-800/70 pl-3"><div className="text-xs uppercase tracking-wide text-amber-300">Corrections</div>{decision.amendments.map((amendment, index) => <div key={amendment.id}><div className="text-xs text-zinc-500">{index === decision.amendments.length - 1 ? "Current reason" : "Superseded correction"} · {date(amendment.created_at)}{amendment.corrected_decision ? ` · corrected outcome: ${amendment.corrected_decision}` : ""}</div><p className="mt-1 whitespace-pre-wrap text-zinc-200">{amendment.reason}</p></div>)}</div> : null}
            <p className="mt-3 text-xs text-zinc-500">Recipient: {decision.recipient_email ?? "none"}</p>
            <ul className="mt-2 text-xs text-zinc-400">{decision.contact_methods.map((contact, index) => <li key={`${contact.kind}-${contact.value}-${index}`}>{contact.kind}: {contact.value}{contact.preferred ? " (preferred)" : ""}</li>)}</ul>
            <div className="mt-3 space-y-2"><div className="text-xs uppercase tracking-wide text-zinc-500">Email attempts</div>{decision.email_attempts.length ? decision.email_attempts.map((attempt) => <div key={attempt.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2"><div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400"><span>{attempt.send_kind} · {attempt.delivery_status} · {date(attempt.attempted_at)}</span><span>{attempt.provider_id ?? "No provider ID"}</span></div><p className="mt-1 break-all text-xs text-zinc-500">To: {attempt.recipient_email}{attempt.subject ? ` · ${attempt.subject}` : ""}</p>{attempt.error ? <p className="mt-1 text-xs text-red-300">{attempt.error}</p> : null}<DecisionEmailAttemptActions attempt={attempt} /></div>) : <p className="text-xs text-zinc-500">No email attempts recorded.</p>}</div>
            <DecisionCorrectionForm decision={decision} />
          </article>
        ))}
      </div>
    </section>
  );
}
