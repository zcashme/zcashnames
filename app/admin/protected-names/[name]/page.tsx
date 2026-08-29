import Link from "next/link";
import { notFound } from "next/navigation";
import DisputeList from "@/components/admin/protected-names/DisputeList";
import DecisionHistory from "@/components/admin/protected-names/DecisionHistory";
import MetadataEditor from "@/components/admin/protected-names/MetadataEditor";
import NameActions from "@/components/admin/protected-names/NameActions";
import NameEvidenceEditor from "@/components/admin/protected-names/NameEvidenceEditor";
import {
  RedeemedBadge,
  StatusBadge,
} from "@/components/admin/protected-names/StatusBadge";
import { getProtectedNameDetail, listProtectedNameDecisions } from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ name: string }>;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function ProtectedNameDetailPage({ params }: PageProps) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const detail = await getProtectedNameDetail(name);
  if (!detail) notFound();
  const decisions = await listProtectedNameDecisions("suggestion", detail.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/protected-names"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← Back to queue
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">
            {detail.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.status} />
            <RedeemedBadge redeemed={detail.redeemed} />
            <span className="text-xs text-zinc-500">{detail.category}</span>
          </div>
        </div>
      </div>

      <NameActions
        name={detail.name}
        status={detail.status}
        redeemed={detail.redeemed}
      />

      <DecisionHistory decisions={decisions} />

      <section className="grid gap-4 rounded-md border border-zinc-800 bg-zinc-950/40 p-4 lg:grid-cols-2">
        <Field label="Normalized name" value={detail.normalized_name} mono />
        <Field label="Parent name" value={detail.parent_name ?? "—"} mono />
        <Field label="Created" value={formatDate(detail.created_at)} />
        <Field label="Updated" value={formatDate(detail.updated_at)} />
        <Field label="Protected at" value={formatDate(detail.protected_at)} />
        <Field label="Rejected at" value={formatDate(detail.rejected_at)} />
        <Field label="Redeemed at" value={formatDate(detail.redeemed_at)} />
        <Field
          label="Submitted by email"
          value={detail.submitted_by_email ?? "—"}
        />
        <Field
          label="Preferred contact"
          value={
            detail.preferred_contact_kind
              ? `${detail.preferred_contact_kind}: ${detail.preferred_contact_value ?? ""}`
              : "—"
          }
        />
        <Field
          label="Zcash UA"
          value={detail.zcash_unified_address ?? "—"}
          mono
        />
        <div className="lg:col-span-2">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Reason
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
            {detail.reason}
          </p>
        </div>
        {detail.rejected_reason ? (
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Rejected reason
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-200/90">
              {detail.rejected_reason}
            </p>
          </div>
        ) : null}
        <div className="lg:col-span-2">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Contact methods
          </div>
          {detail.contact_methods.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">None</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-zinc-300">
              {detail.contact_methods.map((contact, index) => (
                <li key={`${contact.kind}-${contact.value}-${index}`}>
                  <span className="text-zinc-500">{contact.kind}:</span>{" "}
                  {contact.value}
                  {contact.preferred ? (
                    <span className="ml-1 text-xs text-amber-400">preferred</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {detail.variants.length > 0 ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Variants ({detail.variants.length})
          </h2>
          <ul className="mt-2 divide-y divide-zinc-800">
            {detail.variants.map((variant) => (
              <li
                key={variant.name}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link
                  href={`/admin/protected-names/${encodeURIComponent(variant.name)}`}
                  className="font-medium text-amber-400 hover:text-amber-300"
                >
                  {variant.name}
                </Link>
                <div className="flex items-center gap-2">
                  <StatusBadge status={variant.status} />
                  <RedeemedBadge redeemed={variant.redeemed} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MetadataEditor row={detail} />

      <NameEvidenceEditor
        name={detail.name}
        evidence={detail.evidence}
        expectedUpdatedAt={detail.updated_at}
      />

      <DisputeList
        name={detail.name}
        openDisputes={detail.openDisputes}
        pastDisputes={detail.pastDisputes}
      />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={`mt-1 break-all text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
