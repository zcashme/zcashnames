"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionFeedback } from "@/components/admin/protected-names/ActionFeedback";
import { updateProtectedNameMetadataAction } from "@/app/admin/protected-names/actions";
import {
  CONTACT_KINDS,
  PROTECTED_NAME_CATEGORIES,
  type ContactMethod,
  type ProtectedNameRow,
} from "@/lib/protected-names/types";

export default function MetadataEditor({ row }: { row: ProtectedNameRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [category, setCategory] = useState(row.category);
  const [parentName, setParentName] = useState(row.parent_name ?? "");
  const [reason, setReason] = useState(row.reason);
  const [ua, setUa] = useState(row.zcash_unified_address ?? "");
  const [preferredKind, setPreferredKind] = useState(
    row.preferred_contact_kind ?? "",
  );
  const [preferredValue, setPreferredValue] = useState(
    row.preferred_contact_value ?? "",
  );
  const [contactsJson, setContactsJson] = useState(
    JSON.stringify(row.contact_methods ?? [], null, 2),
  );

  function onSave() {
    setError(null);
    setSuccess(null);

    let contactMethods: ContactMethod[] = [];
    try {
      const parsed = JSON.parse(contactsJson) as unknown;
      if (!Array.isArray(parsed)) {
        setError("contact_methods must be a JSON array.");
        return;
      }
      contactMethods = parsed as ContactMethod[];
    } catch {
      setError("contact_methods JSON is invalid.");
      return;
    }

    startTransition(async () => {
      const result = await updateProtectedNameMetadataAction(row.name, {
        category,
        parentName: parentName.trim() || null,
        reason,
        contactMethods,
        preferredContactKind: preferredKind.trim() || null,
        preferredContactValue: preferredValue.trim() || null,
        zcashUnifiedAddress: ua.trim() || null,
        expectedUpdatedAt: row.updated_at,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess("Metadata saved.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Edit metadata
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Name and normalized_name are immutable. Uses optimistic concurrency on
        updated_at.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          >
            {PROTECTED_NAME_CATEGORIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Parent name
          <input
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
            placeholder="optional"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400 md:col-span-2">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Preferred contact kind
          <select
            value={preferredKind}
            onChange={(e) => setPreferredKind(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          >
            <option value="">none</option>
            {CONTACT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Preferred contact value
          <input
            value={preferredValue}
            onChange={(e) => setPreferredValue(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400 md:col-span-2">
          Zcash unified address
          <input
            value={ua}
            onChange={(e) => setUa(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400 md:col-span-2">
          Contact methods (JSON array)
          <textarea
            value={contactsJson}
            onChange={(e) => setContactsJson(e.target.value)}
            rows={5}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="rounded bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          Save metadata
        </button>
        <ActionFeedback error={error} success={success} />
      </div>
    </section>
  );
}
