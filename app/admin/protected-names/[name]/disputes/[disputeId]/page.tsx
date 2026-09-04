import Link from "next/link";
import { notFound } from "next/navigation";
import DecisionHistory from "@/components/admin/protected-names/DecisionHistory";
import DisputeActions from "@/components/admin/protected-names/DisputeActions";
import DisputeEvidenceEditor from "@/components/admin/protected-names/DisputeEvidenceEditor";
import ProtectedNameSummary from "@/components/admin/protected-names/ProtectedNameSummary";
import {
  RedeemedBadge,
  StatusBadge,
} from "@/components/admin/protected-names/StatusBadge";
import {
  getProtectedNameDetail,
  getProtectedNameDispute,
  listProtectedNameDecisions,
} from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ name: string; disputeId: string }>;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function ProtectedNameDisputePage({ params }: PageProps) {
  const { name: rawName, disputeId } = await params;
  const name = decodeURIComponent(rawName);
  const result = await getProtectedNameDispute(disputeId);
  if (!result) notFound();

  const { dispute, name: nameRow } = result;
  if (dispute.protected_name.toLowerCase() !== name.toLowerCase()) notFound();

  const [decisions, detail] = await Promise.all([
    listProtectedNameDecisions("dispute", dispute.id),
    getProtectedNameDetail(nameRow.name),
  ]);
  const isParent = !nameRow.parent_name;
  const variantCount = detail?.variants.length ?? 0;
  const canTransitionLikely = nameRow.status === dispute.name_status_at_submission;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/admin/protected-names/${encodeURIComponent(nameRow.name)}`} className="text-xs text-zinc-500 hover:text-zinc-300">
          Back to {nameRow.name}
        </Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">Dispute review</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={dispute.review_status} />
          <span className="font-mono text-xs text-zinc-500">{dispute.id}</span>
        </div>
      </div>

      <DisputeActions
        disputeId={dispute.id}
        protectedName={nameRow.name}
        reviewStatus={dispute.review_status}
        isParent={isParent}
        variantCount={variantCount}
        canTransitionLikely={canTransitionLikely}
        currentNameStatus={nameRow.status}
        submittedNameStatus={dispute.name_status_at_submission}
        submittedReason={dispute.reason}
      />

      <DecisionHistory decisions={decisions} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="grid gap-4 rounded-md border border-zinc-800 bg-zinc-950/40 p-4 lg:grid-cols-2">
          <h2 className="lg:col-span-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Dispute details</h2>
          <Field label="Protected name" value={dispute.protected_name} mono />
          <Field label="Normalized name" value={dispute.normalized_name} mono />
          <Field label="Status at submission" value={dispute.name_status_at_submission} />
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Current name status</div>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={nameRow.status} />
              <RedeemedBadge redeemed={nameRow.redeemed} />
            </div>
          </div>
          <Field label="Category" value={dispute.category} />
          <Field label="Parent name" value={dispute.parent_name ?? "-"} mono />
          <Field label="Created" value={formatDate(dispute.created_at)} />
          <Field label="Updated" value={formatDate(dispute.updated_at)} />
          <Field label="Submitted by email" value={dispute.submitted_by_email ?? "-"} />
          <Field label="Preferred contact" value={dispute.preferred_contact_kind ? `${dispute.preferred_contact_kind}: ${dispute.preferred_contact_value ?? ""}` : "-"} />
          <Field label="Zcash UA" value={dispute.zcash_unified_address ?? "-"} mono />
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Dispute reason</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{dispute.reason}</p>
          </div>
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Contact methods</div>
            {dispute.contact_methods.length === 0 ? (
              <p className="mt-1 text-sm text-zinc-500">None</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm text-zinc-300">
                {dispute.contact_methods.map((contact, index) => (
                  <li key={`${contact.kind}-${contact.value}-${index}`}>
                    <span className="text-zinc-500">{contact.kind}:</span>{" "}{contact.value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <ProtectedNameSummary detail={detail} requestedName={nameRow.name} />
      </div>

      <DisputeEvidenceEditor
        disputeId={dispute.id}
        protectedName={nameRow.name}
        evidence={dispute.evidence}
        expectedUpdatedAt={dispute.updated_at}
      />
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
