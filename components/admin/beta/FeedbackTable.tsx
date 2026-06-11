"use client";

import { useState, useRef, useEffect } from "react";
import type { FeedbackRow } from "@/lib/beta/report";
import { getWalletVariant, subcategoryLabel } from "@/lib/wallets/catalog";

interface Props {
  rows: FeedbackRow[];
  checklistLabels: Record<string, string>;
}

function severityBadge(s: "high" | "low" | "none") {
  const cls =
    s === "high"
      ? "bg-red-500/15 text-red-300"
      : s === "low"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-zinc-800 text-zinc-400";
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{s}</span>;
}

function stageBadge(s: "testnet" | "mainnet") {
  const cls =
    s === "mainnet" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300";
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{s}</span>;
}

function versionBadge(version: FeedbackRow["beta_version"]) {
  const cls =
    version === "v2"
      ? "bg-violet-500/15 text-violet-300"
      : "bg-zinc-800 text-zinc-300";
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{version}</span>;
}

function walletVariantLabel(walletVariantId: string | null) {
  if (!walletVariantId) return "—";
  const variant = getWalletVariant(walletVariantId);
  if (!variant) return walletVariantId;
  return `${variant.displayName} / ${subcategoryLabel(variant.subcategory)}`;
}

function exportToCsv(rows: FeedbackRow[], checklistLabels: Record<string, string>) {
  const HEADERS = [
    "id", "tester", "date", "program", "stage", "severity", "item",
    "rating", "notes", "actual", "steps", "expected",
    "txid", "wallet", "wallet_variant_id", "screenshots", "user_agent", "client_env",
  ];

  function escape(v: unknown) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
  }

  const dataRows = rows.map((r) => [
    r.id,
    r.tester_name_snapshot,
    new Date(r.created_at).toISOString().slice(0, 10),
    r.beta_version,
    r.stage,
    r.severity,
    r.item_id ? (checklistLabels[r.item_id] ?? r.item_id) : "",
    r.experience_rating ?? "",
    r.notes ?? "",
    r.actual ?? "",
    r.steps ?? "",
    r.expected ?? "",
    r.txid ?? "",
    r.wallet ?? "",
    r.wallet_variant_id ?? "",
    r.screenshot_paths.length,
    r.user_agent ?? "",
    r.client_env ?? "",
  ].map(escape).join(","));

  const csv = [HEADERS.join(","), ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beta-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type SortCol = "item" | "rating";
type SortDir = "asc" | "desc";

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: SortDir }) {
  if (sortCol !== col) return <span className="ml-1 opacity-30">↕</span>;
  return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

export default function FeedbackTable({ rows, checklistLabels }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "rating") {
      const ra = a.experience_rating ?? -1;
      const rb = b.experience_rating ?? -1;
      return (ra - rb) * dir;
    }
    if (sortCol === "item") {
      const la = a.item_id ? (checklistLabels[a.item_id] ?? a.item_id) : "";
      const lb = b.item_id ? (checklistLabels[b.item_id] ?? b.item_id) : "";
      return la.localeCompare(lb) * dir;
    }
    return 0;
  });

  const exportRows = selected.size > 0 ? sortedRows.filter((r) => selected.has(r.id)) : sortedRows;

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
        No feedback submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">
          {selected.size > 0
            ? `${selected.size} of ${rows.length} selected`
            : `${rows.length} rows`}
        </span>
        <button
          onClick={() => exportToCsv(exportRows, checklistLabels)}
          className="rounded bg-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
        >
          {selected.size > 0 ? `Export ${selected.size} selected` : "Export all"} ↓
        </button>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-md border border-zinc-800">
        <table className="w-full min-w-[1080px] text-left text-xs">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-amber-400 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2">Tester</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Severity</th>
              <th
                className="cursor-pointer select-none px-3 py-2 hover:text-zinc-200"
                onClick={() => toggleSort("item")}
              >
                Item <SortIcon col="item" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-3 py-2 hover:text-zinc-200"
                onClick={() => toggleSort("rating")}
              >
                Rating <SortIcon col="rating" sortCol={sortCol} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2">Notes / Actual</th>
              <th className="px-3 py-2">Wallet</th>
              <th className="px-3 py-2">Txid</th>
              <th className="px-3 py-2 text-right">SS</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isSelected = selected.has(row.id);
              const body = row.notes || row.actual || null;
              const date = new Date(row.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              const itemLabel = row.item_id
                ? (checklistLabels[row.item_id] ?? row.item_id)
                : "—";

              return (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={`cursor-pointer border-t border-zinc-800 ${
                    isSelected ? "bg-amber-500/5" : "hover:bg-zinc-900/60"
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-amber-400 cursor-pointer"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-zinc-100">
                    {row.tester_name_snapshot}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{date}</td>
                  <td className="px-3 py-2">{versionBadge(row.beta_version)}</td>
                  <td className="px-3 py-2">{stageBadge(row.stage)}</td>
                  <td className="px-3 py-2">{severityBadge(row.severity)}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-zinc-400">
                    {itemLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                    {row.experience_rating != null ? `★ ${row.experience_rating}/5` : "—"}
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-2 text-zinc-300">
                    {body ?? "—"}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-zinc-400">
                    {walletVariantLabel(row.wallet_variant_id)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-500">
                    {row.txid ? row.txid.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-500">
                    {row.screenshot_paths.length > 0 ? row.screenshot_paths.length : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
