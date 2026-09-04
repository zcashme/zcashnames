import Link from "next/link";
import {
  RedeemedBadge,
  StatusBadge,
} from "@/components/admin/protected-names/StatusBadge";
import type { ProtectedNameDetail } from "@/lib/protected-names/types";

type ProtectedNameSummaryProps = {
  detail: ProtectedNameDetail | null;
  requestedName: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ProtectedNameSummary({
  detail,
  requestedName,
}: ProtectedNameSummaryProps) {
  if (!detail) {
    return (
      <aside className="rounded-md border border-amber-900/70 bg-amber-950/20 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">
          Protected-name context
        </h2>
        <p className="mt-2 text-sm text-amber-100/80">
          No protected-name record was found for <span className="font-mono">{requestedName}</span>.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Protected-name context
          </h2>
          <Link
            href={`/admin/protected-names/${encodeURIComponent(detail.name)}`}
            className="mt-1 inline-block break-all font-mono text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            {detail.name}
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge status={detail.status} />
          <RedeemedBadge redeemed={detail.redeemed} />
        </div>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Category" value={detail.category} />
        <Field label="Parent name" value={detail.parent_name ?? "-"} mono />
        <Field label="Created" value={formatDate(detail.created_at)} />
        <Field label="Updated" value={formatDate(detail.updated_at)} />
        <Field label="Protected at" value={formatDate(detail.protected_at)} />
        <Field label="Rejected at" value={formatDate(detail.rejected_at)} />
        <Field label="Redeemed at" value={formatDate(detail.redeemed_at)} />
        <Field label="Protection expires" value={formatDate(detail.expires_at)} />
        <Field label="Submitted by email" value={detail.submitted_by_email ?? "-"} />
        <Field
          label="Preferred contact"
          value={
            detail.preferred_contact_kind
              ? `${detail.preferred_contact_kind}: ${detail.preferred_contact_value ?? ""}`
              : "-"
          }
        />
        <Field label="Variants" value={String(detail.variants.length)} />
        <Field label="Open disputes" value={String(detail.openDisputes.length)} />
      </dl>

      <TextField label="Reason" value={detail.reason} />
      {detail.rejected_reason ? (
        <TextField label="Rejected reason" value={detail.rejected_reason} tone="text-red-200/90" />
      ) : null}

      <div className="mt-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Contact methods</div>
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
    </aside>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-1 break-all text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function TextField({
  label,
  value,
  tone = "text-zinc-200",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <p className={`mt-1 whitespace-pre-wrap text-sm ${tone}`}>{value}</p>
    </div>
  );
}
