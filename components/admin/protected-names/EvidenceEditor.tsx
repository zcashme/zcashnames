"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionFeedback } from "@/components/admin/protected-names/ActionFeedback";
import type { EvidenceItem } from "@/lib/protected-names/types";

type Mode = "name" | "dispute";

type Props = {
  mode: Mode;
  name?: string;
  disputeId?: string;
  evidence: EvidenceItem[];
  expectedUpdatedAt: string | null;
  onAdd: (
    input: {
      title: string;
      url: string;
      publisher: string | null;
      sourceType: string | null;
      summary: string | null;
    },
    expectedUpdatedAt: string | null,
  ) => Promise<{ ok: boolean; message?: string }>;
  onPatch: (
    evidenceId: string,
    input: {
      title: string;
      url: string;
      publisher: string | null;
      sourceType: string | null;
      summary: string | null;
    },
    expectedUpdatedAt: string | null,
  ) => Promise<{ ok: boolean; message?: string }>;
  onRemove: (
    evidenceId: string,
    expectedUpdatedAt: string | null,
  ) => Promise<{ ok: boolean; message?: string }>;
};

const emptyForm = {
  title: "",
  url: "",
  publisher: "",
  sourceType: "website",
  summary: "",
};

export default function EvidenceEditor({
  evidence,
  expectedUpdatedAt,
  onAdd,
  onPatch,
  onRemove,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  function startEdit(item: EvidenceItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      url: item.url,
      publisher: item.publisher ?? "",
      sourceType: item.sourceType ?? "website",
      summary: item.summary ?? "",
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function submit() {
    setError(null);
    setSuccess(null);
    const payload = {
      title: form.title,
      url: form.url,
      publisher: form.publisher.trim() || null,
      sourceType: form.sourceType.trim() || null,
      summary: form.summary.trim() || null,
    };

    startTransition(async () => {
      const result = editingId
        ? await onPatch(editingId, payload, expectedUpdatedAt)
        : await onAdd(payload, expectedUpdatedAt);

      if (!result.ok) {
        setError(result.message ?? "Evidence update failed.");
        return;
      }
      setSuccess(editingId ? "Evidence updated." : "Evidence added.");
      clearForm();
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this evidence item?")) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await onRemove(id, expectedUpdatedAt);
      if (!result.ok) {
        setError(result.message ?? "Remove failed.");
        return;
      }
      setSuccess("Evidence removed.");
      if (editingId === id) clearForm();
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Evidence ({evidence.length})
      </h2>

      <div className="mt-3 space-y-2">
        {evidence.length === 0 ? (
          <p className="text-sm text-zinc-500">No evidence items.</p>
        ) : (
          evidence.map((item) => (
            <div
              key={item.id}
              className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-100">
                    {item.title}
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-sky-400 hover:text-sky-300"
                  >
                    {item.url}
                  </a>
                  {item.publisher || item.sourceType ? (
                    <div className="mt-1 text-xs text-zinc-500">
                      {[item.sourceType, item.publisher]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                  {item.summary ? (
                    <p className="mt-1 text-xs text-zinc-400">{item.summary}</p>
                  ) : null}
                  <div className="mt-1 font-mono text-[10px] text-zinc-600">
                    {item.id}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startEdit(item)}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(item.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid gap-2 rounded border border-zinc-800 p-3 md:grid-cols-2">
        <div className="md:col-span-2 text-xs font-medium text-zinc-400">
          {editingId ? `Edit evidence ${editingId}` : "Add evidence"}
        </div>
        <label className="text-xs text-zinc-500">
          Title
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-500">
          URL
          <input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-500">
          Publisher
          <input
            value={form.publisher}
            onChange={(e) =>
              setForm((f) => ({ ...f, publisher: e.target.value }))
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-500">
          Source type
          <input
            value={form.sourceType}
            onChange={(e) =>
              setForm((f) => ({ ...f, sourceType: e.target.value }))
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-500 md:col-span-2">
          Summary
          <textarea
            value={form.summary}
            onChange={(e) =>
              setForm((f) => ({ ...f, summary: e.target.value }))
            }
            rows={2}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <div className="flex gap-2 md:col-span-2">
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="rounded bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {editingId ? "Save evidence" : "Add evidence"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={pending}
              onClick={clearForm}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <ActionFeedback error={error} success={success} />
      </div>
    </section>
  );
}
