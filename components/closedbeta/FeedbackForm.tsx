"use client";

import { useEffect, useRef, useState } from "react";
import { submitBetaFeedback } from "@/lib/beta/actions";
import type { ChecklistItem } from "@/lib/beta/checklist";

interface Props {
  /** Initial network — usually the current network from StatusToggle. */
  defaultNetwork?: "testnet" | "mainnet";
  /** Optional checklist item this report is scoped to. Used only to tag the submission. */
  checklistItem?: ChecklistItem | null;
  /** Clears the linked checklist item. */
  onClearChecklistItem?: () => void;
  /** Opens the checklist tab so the user can choose an item. */
  onOpenChecklist?: () => void;
  /** Called once on successful submission. */
  onSuccess?: () => void;
}

const MAX_SCREENSHOTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const WALLET_STORAGE_KEY = "beta:wallet";

type Severity = "high" | "low" | "none";

const inputStyle: React.CSSProperties = {
  background: "var(--color-raised)",
  border: "1.5px solid var(--faq-border)",
  color: "var(--fg-heading)",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--home-result-primary-bg)",
  color: "var(--home-result-primary-fg)",
  boxShadow: "var(--home-result-primary-shadow)",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1.5px solid var(--border-muted)",
  color: "var(--fg-body)",
};

const labelStyle: React.CSSProperties = {
  color: "var(--fg-muted)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  display: "block",
};

export default function FeedbackForm({
  defaultNetwork = "testnet",
  checklistItem,
  onClearChecklistItem,
  onOpenChecklist,
  onSuccess,
}: Props) {
  const [severity, setSeverity] = useState<Severity>("none");
  const [wallet, setWallet] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [txid, setTxid] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear the "submitted" inline toast after a few seconds.
  useEffect(() => {
    if (!justSubmitted) return;
    const t = window.setTimeout(() => setJustSubmitted(false), 3000);
    return () => window.clearTimeout(t);
  }, [justSubmitted]);

  // Hydrate wallet from localStorage so it sticks across reports + sessions.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WALLET_STORAGE_KEY);
      if (stored) setWallet(stored);
    } catch {
      // localStorage blocked — silent fallback
    }
  }, []);

  // Persist wallet on every change.
  useEffect(() => {
    try {
      if (wallet) {
        window.localStorage.setItem(WALLET_STORAGE_KEY, wallet);
      }
    } catch {
      // silent
    }
  }, [wallet]);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const merged = [...files, ...incoming].slice(0, MAX_SCREENSHOTS);
    for (const f of merged) {
      if (!f.type.startsWith("image/")) {
        setError("Screenshots must be images.");
        return;
      }
      if (f.size > MAX_BYTES) {
        setError("Each screenshot must be under 5 MB.");
        return;
      }
    }
    setError("");
    setFiles(merged);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * Snapshot of viewport + locale + orientation at submission time. One
   * grep-able string so it reads cleanly in the Supabase table editor.
   * Example: "1440x900 dpr=2 form=desktop orient=landscape-primary lang=en-US"
   */
  function captureClientEnv(): string {
    if (typeof window === "undefined") return "";
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const form: "mobile" | "tablet" | "desktop" =
        w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
      const parts: string[] = [`${w}x${h}`, `dpr=${dpr}`, `form=${form}`];
      const orient = window.screen?.orientation?.type;
      if (orient) parts.push(`orient=${orient}`);
      const lang = navigator.languages?.[0] ?? navigator.language;
      if (lang) parts.push(`lang=${lang}`);
      return parts.join(" ").slice(0, 200);
    } catch {
      return "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!checklistItem) {
      setError("Pick a checklist item from the Checklist tab before submitting a report.");
      return;
    }
    const hasContent =
      !!wallet.trim() ||
      !!steps.trim() ||
      !!expected.trim() ||
      !!actual.trim() ||
      !!txid.trim() ||
      !!notes.trim() ||
      files.length > 0;
    if (!hasContent) {
      setError("Add at least one detail or a screenshot before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.set("severity", severity);
    formData.set("network", defaultNetwork);
    formData.set("wallet", wallet);
    formData.set("steps", steps);
    formData.set("expected", expected);
    formData.set("actual", actual);
    formData.set("txid", txid);
    formData.set("notes", notes);
    if (checklistItem) formData.set("checklistItemId", checklistItem.id);
    formData.set("client_env", captureClientEnv());
    for (const f of files) formData.append("screenshots", f);

    try {
      const result = await submitBetaFeedback(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Reset form on success — but keep wallet, since the same tester is
      // almost always reporting from the same wallet across submissions.
      setSeverity("none");
      setSteps("");
      setExpected("");
      setActual("");
      setTxid("");
      setNotes("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setJustSubmitted(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {checklistItem ? (
        <div
          className="flex items-start gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: "var(--color-accent-green-light)",
            border: "1px solid var(--color-accent-green)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-accent-green)" }} aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent-green)" }}>
              Reporting on
            </p>
            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--fg-heading)" }}>
              {checklistItem.section ? `${checklistItem.section}, ${checklistItem.label}` : checklistItem.label}
            </p>
          </div>
          {onClearChecklistItem && (
            <button
              type="button"
              onClick={onClearChecklistItem}
              aria-label="Clear linked checklist item"
              title="Clear"
              className="shrink-0 text-xl leading-none opacity-60 hover:opacity-100 cursor-pointer"
              style={{ color: "var(--fg-body)" }}
            >
              &times;
            </button>
          )}
        </div>
      ) : (
        <div
          className="flex items-start gap-3 rounded-lg px-3 py-2.5"
          style={{
            background: "var(--home-error-bg, rgba(224,82,82,0.12))",
            border: "1px solid var(--accent-red, #e05252)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent-red, #e05252)" }} aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-red, #e05252)" }}>
              No item selected
            </p>
            <p className="text-sm leading-snug" style={{ color: "var(--fg-heading)" }}>
              Pick a checklist item to report on.
            </p>
            {onOpenChecklist && (
              <button
                type="button"
                onClick={onOpenChecklist}
                className="text-xs mt-1 underline cursor-pointer"
                style={{ color: "var(--fg-body)" }}
              >
                &larr; Open the Checklist tab
              </button>
            )}
          </div>
        </div>
      )}

      {/* Severity */}
      <div>
        <label style={labelStyle}>Severity</label>
        <div className="flex gap-2">
          {(["high", "low", "none"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className="flex-1 rounded-lg py-2 text-sm font-semibold cursor-pointer capitalize"
              style={severity === s ? primaryBtnStyle : secondaryBtnStyle}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div>
        <label style={labelStyle}>Wallet + Version + OS</label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="e.g. Zingo 1.4.0 on macOS 14.5"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
      </div>

      {/* Steps */}
      <div>
        <label style={labelStyle}>Steps to Reproduce</label>
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          rows={3}
          placeholder="1. ...&#10;2. ..."
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>

      {/* Expected */}
      <div>
        <label style={labelStyle}>Expected Behavior</label>
        <textarea
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          rows={2}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>

      {/* Actual */}
      <div>
        <label style={labelStyle}>Actual Behavior</label>
        <textarea
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          rows={2}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>

      {/* Txid */}
      <div>
        <label style={labelStyle}>Txid (optional)</label>
        <input
          type="text"
          value={txid}
          onChange={(e) => setTxid(e.target.value)}
          placeholder="Paste the transaction id if relevant"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none font-mono"
          style={inputStyle}
        />
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>

      {/* Screenshots */}
      <div>
        <label style={labelStyle}>Screenshots (up to {MAX_SCREENSHOTS}, &le;5MB each)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="w-full text-xs"
          style={{ color: "var(--fg-body)" }}
        />
        {files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs"
                style={{ background: "var(--color-raised)", color: "var(--fg-body)" }}
              >
                <span className="truncate mr-2">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="opacity-60 hover:opacity-100 cursor-pointer"
                  aria-label={`Remove ${f.name}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
          {error}
        </p>
      )}

      {justSubmitted && (
        <p
          className="text-sm font-semibold flex items-center justify-center gap-2"
          style={{ color: "var(--color-accent-green)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Report submitted. You can submit another anytime.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !checklistItem}
        className="w-full rounded-full py-3 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={primaryBtnStyle}
      >
        {submitting ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}
