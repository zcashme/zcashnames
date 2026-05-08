"use client";

import { useState } from "react";
import { checkUnlockCode } from "@/lib/zns/actions";

interface PhaseUnlockProps {
  name: string;
  onComplete: (proof: string) => void;
  onCancel: () => void;
}

export default function PhaseUnlock({ name, onComplete, onCancel }: PhaseUnlockProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    const trimmed = code.trim();
    if (!trimmed) { setError("Enter your unlock code."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await checkUnlockCode(name, trimmed);
      if (!result.ok) { setError(result.error || "Invalid unlock code."); return; }
      onComplete(result.proof);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Reserved Name</h2>
      <p className="text-sm" style={{ color: "var(--fg-body)" }}>
        <strong>{name}.zcash</strong> is reserved. Enter your unlock code to continue.
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        placeholder="XXXX-XXXX-XXXX"
        autoFocus
        className="w-full rounded-xl px-4 py-3 text-sm font-mono tracking-[0.15em] outline-none text-center"
        style={{
          background: "var(--color-raised)",
          border: `1.5px solid ${error ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`,
          color: "var(--fg-heading)",
        }}
      />
      {error && (
        <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{error}</p>
      )}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-full text-sm font-semibold"
          style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
          {loading ? "Verifying…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}
