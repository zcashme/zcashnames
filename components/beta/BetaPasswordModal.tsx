"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  target: "mainnet" | "testnet";
  onCancel: () => void;
  onSubmit: (password: string) => Promise<boolean>;
};

export default function BetaPasswordModal({ target, onCancel, onSubmit }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleSubmit() {
    if (checking) return;
    setChecking(true);
    try {
      const ok = await onSubmit(input);
      if (!ok) {
        setError(true);
        setInput("");
        inputRef.current?.focus();
      }
    } finally {
      setChecking(false);
    }
  }

  if (!mounted) return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="rounded-2xl px-8 py-7 w-full max-w-sm flex flex-col gap-5"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
      >
        <div>
          <h2 className="type-card-title text-fg-heading m-0">
            {target === "mainnet" ? "Mainnet Access" : "Testnet Access"}
          </h2>
          <p className="type-body mt-1.5" style={{ color: "var(--fg-muted)" }}>
            Enter the {target} password to continue.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="password"
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="Password"
            className="w-full rounded-xl px-4 py-3 type-body outline-none"
            style={{
              background: "var(--color-raised)",
              border: error
                ? "1.5px solid var(--accent-red, #e05252)"
                : "1.5px solid var(--faq-border)",
              color: "var(--fg-heading)",
            }}
          />
          {error && (
            <p className="type-chip" style={{ color: "var(--accent-red, #e05252)" }}>
              Incorrect password.
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-full type-body font-bold transition-opacity duration-200 hover:opacity-60 cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={checking}
            className="px-5 py-2.5 rounded-full type-body font-bold cursor-pointer transition-opacity duration-200 hover:opacity-80"
            style={{
              background: "var(--sf-search-btn-bg)",
              color: "var(--sf-claim-text)",
              boxShadow: "var(--sf-search-btn-shadow)",
            }}
          >
            {checking ? "Checking..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}
