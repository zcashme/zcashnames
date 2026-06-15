"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { submitBetaRebateClaim, type BetaRebateDefaults } from "@/lib/beta/actions";

type Props = {
  defaults: BetaRebateDefaults;
};

const inputStyle: CSSProperties = {
  background: "var(--color-raised)",
  border: "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
  color: "var(--fg-heading)",
};

const labelStyle: CSSProperties = {
  color: "var(--fg-muted)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  display: "block",
};

const primaryBtnStyle: CSSProperties = {
  background: "var(--home-result-primary-bg)",
  color: "var(--home-result-primary-fg)",
  boxShadow: "var(--home-result-primary-shadow)",
};

function captureClientEnv(): string {
  if (typeof window === "undefined") return "";
  try {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const form = w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
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

export default function BetaRebateForm({ defaults }: Props) {
  const [name, setName] = useState("");
  const [actionType, setActionType] = useState<"CLAIM" | "BUY">("CLAIM");
  const [outcome, setOutcome] = useState<"success" | "failure">("success");
  const [txid, setTxid] = useState("");
  const [walletLabel, setWalletLabel] = useState(defaults.walletLabel);
  const [notes, setNotes] = useState("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.set("name", name);
    formData.set("action_type", actionType);
    formData.set("outcome", outcome);
    formData.set("txid", txid);
    formData.set("wallet_label", walletLabel);
    formData.set("notes", notes);
    formData.set("client_env", captureClientEnv());

    const file = fileRef.current?.files?.[0];
    if (file) formData.append("attachment", file);

    const result = await submitBetaRebateClaim(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess("Rebate request saved.");
    setName("");
    setActionType("CLAIM");
    setOutcome("success");
    setTxid("");
    setWalletLabel(defaults.walletLabel);
    setNotes("");
    setAttachmentName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[24px] border px-5 py-5 sm:px-6 sm:py-6"
      style={{
        borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 58%, transparent), color-mix(in srgb, var(--faq-border) 14%, transparent))",
        boxShadow: "0 18px 38px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label style={labelStyle}>Identifier</label>
          <input value={defaults.identifier} readOnly className="w-full rounded-2xl px-4 py-3 text-sm" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Access code</label>
          <input value={defaults.accessCode ?? "Shared mainnet session"} readOnly className="w-full rounded-2xl px-4 py-3 text-sm" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tester</label>
          <input value={defaults.displayName ?? "Shared mainnet"} readOnly className="w-full rounded-2xl px-4 py-3 text-sm" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Stage</label>
          <input value={defaults.stage} readOnly className="w-full rounded-2xl px-4 py-3 text-sm capitalize" style={inputStyle} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rebate-name" style={labelStyle}>Name</label>
          <input
            id="rebate-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm"
            style={inputStyle}
            placeholder="yourname.zcash"
            required
          />
        </div>
        <div>
          <label htmlFor="rebate-wallet" style={labelStyle}>Wallet</label>
          <input
            id="rebate-wallet"
            value={walletLabel}
            onChange={(event) => setWalletLabel(event.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label htmlFor="rebate-action" style={labelStyle}>Action type</label>
          <select
            id="rebate-action"
            value={actionType}
            onChange={(event) => setActionType(event.target.value as "CLAIM" | "BUY")}
            className="w-full rounded-2xl px-4 py-3 text-sm"
            style={inputStyle}
          >
            <option value="CLAIM">CLAIM</option>
            <option value="BUY">BUY</option>
          </select>
        </div>
        <div>
          <label htmlFor="rebate-outcome" style={labelStyle}>Outcome</label>
          <select
            id="rebate-outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as "success" | "failure")}
            className="w-full rounded-2xl px-4 py-3 text-sm"
            style={inputStyle}
          >
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="rebate-txid" style={labelStyle}>Transaction ID</label>
        <input
          id="rebate-txid"
          value={txid}
          onChange={(event) => setTxid(event.target.value)}
          className="w-full rounded-2xl px-4 py-3 text-sm"
          style={inputStyle}
          placeholder={outcome === "success" ? "Required for successful submissions" : "If one was created"}
          required={outcome === "success"}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="rebate-notes" style={labelStyle}>Notes</label>
        <textarea
          id="rebate-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-32 w-full rounded-2xl px-4 py-3 text-sm"
          style={inputStyle}
          placeholder="What happened, what you paid for, and anything we should verify."
        />
      </div>

      <div className="mt-4">
        <label htmlFor="rebate-attachment" style={labelStyle}>Picture</label>
        <input
          ref={fileRef}
          id="rebate-attachment"
          type="file"
          accept="image/*"
          className="block w-full rounded-2xl px-4 py-3 text-sm"
          style={inputStyle}
          onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? "")}
          required
        />
        <p className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
          One image, up to 5 MB. {attachmentName ? `Selected: ${attachmentName}` : "Attach the proof screenshot."}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium" style={{ color: "var(--home-result-status-negative-fg)" }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm font-medium" style={{ color: "var(--home-result-status-positive-fg)" }}>
          {success}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs leading-relaxed" style={{ color: "var(--fg-muted)" }}>
          Identifier and access code are locked from your beta session. Wallet starts with your application choice but can be updated here.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-[18px] px-5 py-3 text-sm font-semibold transition-opacity"
          style={{
            ...primaryBtnStyle,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "progress" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "Submit rebate"}
        </button>
      </div>
    </form>
  );
}
