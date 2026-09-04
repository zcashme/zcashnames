import Link from "next/link";
import { notFound } from "next/navigation";
import AccessRequestActions from "@/components/admin/protected-names/AccessRequestActions";
import DecisionHistory from "@/components/admin/protected-names/DecisionHistory";
import ProtectedNameSummary from "@/components/admin/protected-names/ProtectedNameSummary";
import { StatusBadge } from "@/components/admin/protected-names/StatusBadge";
import {
  getProtectedNameAccessRequest,
  getProtectedNameDetail,
  listProtectedNameDecisions,
} from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ requestId: string }>;
};

export default async function ProtectedNameAccessRequestPage({ params }: PageProps) {
  const { requestId } = await params;
  const request = await getProtectedNameAccessRequest(requestId);
  if (!request) notFound();

  const [decisions, detail] = await Promise.all([
    listProtectedNameDecisions("access_request", request.id),
    getProtectedNameDetail(request.requested_name),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin/protected-names/access" className="text-xs text-zinc-500 hover:text-zinc-300">
          Back to access requests
        </Link>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-100">{request.requested_name}</h2>
        <div className="mt-2">
          <StatusBadge status={request.status} />
        </div>
      </div>

      <AccessRequestActions
        requestId={request.id}
        status={request.status}
        name={request.requested_name}
        protectedNameContext={{
          category: detail?.category ?? null,
          ensPriorityClaim: detail?.ens_priority_claim === true,
          zmPriorityClaim: detail?.zm_priority_claim === true,
        }}
      />
      <DecisionHistory decisions={decisions} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="grid gap-4 rounded-md border border-zinc-800 bg-zinc-950/40 p-4 lg:grid-cols-2">
          <h2 className="lg:col-span-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Access request details</h2>
          <Field label="Requester email" value={request.normalized_email} />
          <Field label="Reference" value={request.reference_number} mono />
          <Field label="Submitted" value={new Date(request.submitted_at).toLocaleString()} />
          <Field label="Relationship" value={request.relationship ?? "-"} />
          <Field label="Preferred contact" value={request.preferred_contact_kind ? `${request.preferred_contact_kind}: ${request.preferred_contact_value ?? ""}` : "-"} />
          <Field label="Supporting link" value={request.supporting_link ?? "-"} />
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Additional context</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{request.additional_context ?? "-"}</p>
          </div>
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Contact methods</div>
            <ul className="mt-1 space-y-1 text-sm text-zinc-300">
              {request.contact_methods.length ? (
                request.contact_methods.map((contact, index) => (
                  <li key={`${contact.kind}-${contact.value}-${index}`}>
                    <span className="text-zinc-500">{contact.kind}:</span>{" "}{contact.value}
                    {contact.preferred ? " (preferred)" : ""}
                  </li>
                ))
              ) : (
                <li className="text-zinc-500">None</li>
              )}
            </ul>
          </div>
        </section>

        <ProtectedNameSummary detail={detail} requestedName={request.requested_name} />
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 break-all text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
