"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACTION_PHASES } from "@/lib/types";
import type { Action, Phase, ResolveName } from "@/lib/types";
import PhaseUnlock from "./PhaseUnlock";

interface Zip321ModalProps {
  action: Action;
  name: string;
  resolveResult: ResolveName;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePrice(raw: string): number | null {
  const n = raw.replace(/,/g, "").trim();
  if (!n) return null;
  const num = Number(n);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function decodeBase64ToBytes(value: string): Uint8Array | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!normalized) return null;
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Ensure we pass a real ArrayBuffer (not a view over SharedArrayBuffer) to WebCrypto.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function prepareDescription(action: Action, name: string, amount: string): React.ReactNode {
  switch (action) {
    case "BUY":
      return <>Purchase for <strong>{amount}</strong>.</>;
    case "DELIST":
      return <>Remove from sale.</>;
    case "RELEASE":
      return <>Allowing others to claim it.</>;
    case "UPDATE":
      return <>Set a new address.</>;
    case "LIST":
      return <>Set a price for <strong>{name}</strong>.</>;
    case "CLAIM":
      return <><strong>{name}</strong></>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zip321Modal({
  action,
  name,
  resolveResult,
  onClose,
  onSuccess,
}: Zip321ModalProps) {
  const phases: Phase[] = (() => {
    const base = [...ACTION_PHASES[action]];
    if (action === "CLAIM" && resolveResult.status === "reserved") {
      base.unshift("unlock");
    }
    return base;
  })();
  const [step, setStep] = useState(0);
  const phase = phases[step] ?? phases[phases.length - 1];

  const [address, setAddress] = useState<string>();
  const [price, setPrice] = useState<string>();
  const [proof, setProof] = useState<string>();
  const [uri, setUri] = useState<string>();

  function advance(result?: Record<string, string>) {
    if (result) {
      if (result.address !== undefined) setAddress(result.address);
      if (result.price !== undefined) setPrice(result.price);
      if (result.proof !== undefined) setProof(result.proof);
      if (result.uri !== undefined) setUri(result.uri);
    }
    setStep((s) => Math.min(s + 1, phases.length - 1));
  }

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl w-full max-w-md overflow-visible p-8"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          color: "var(--fg-body)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "unlock" && (
          <PhaseUnlock name={name} onComplete={(proof) => advance({ proof })} onCancel={onClose} />
        )}
        {phase !== "unlock" && (
          <>
            <p className="text-sm">Phase: {phase} ({step + 1}/{phases.length})</p>
            {address && <p className="text-xs mt-1">Address: {address}</p>}
            {price && <p className="text-xs mt-1">Price: {price}</p>}
            {proof && <p className="text-xs mt-1">Proof: {proof.slice(0, 16)}…</p>}
            {uri && <p className="text-xs mt-1 break-all">URI: {uri}</p>}
            {step < phases.length - 1 && (
              <button type="button" onClick={() => advance()}
                className="mt-4 px-4 py-2 rounded-full text-xs font-semibold"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}>
                Next → {phases[step + 1]}
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
