"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isValidUsername, validateAddress } from "@/lib/zns/name";

type Tab = "generate" | "import";
type Source = "generated" | "imported" | null;
type CopyField = "pubkey" | "privkey" | "payload" | "signature";
type PayloadValidationLevel = "empty" | "valid" | "warning" | "error";

type PayloadValidation = {
  level: PayloadValidationLevel;
  message: string;
};

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.trim().replace(/\s+/g, "");
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function tryBase64ToBytes(value: string): Uint8Array | null {
  try {
    return base64ToBytes(value);
  } catch {
    return null;
  }
}

function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value);
}

function validatePayload(payload: string): PayloadValidation {
  const raw = payload.trim();
  if (!raw) return { level: "empty", message: "No payload yet. Paste the payload from the signing modal." };

  if (raw.startsWith("ZNS-SOV-V1|")) {
    return {
      level: "warning",
      message: "Legacy payload format detected. Signing still works, but current flow uses ACTION:name:... format.",
    };
  }

  const parts = raw.split(":");
  const action = (parts[0] ?? "").toUpperCase();

  if (!action) {
    return { level: "error", message: "Missing action. Expected format like CLAIM:name:address." };
  }

  const ensureName = (name: string): PayloadValidation | null => {
    if (!isValidUsername(name)) {
      return { level: "error", message: "Name is invalid. Use lowercase a-z and 0-9, 1 to 62 chars." };
    }
    return null;
  };

  const ensureAddress = (address: string): PayloadValidation | null => {
    const v = validateAddress(address);
    if (!v.valid || v.rejected) {
      return { level: "error", message: v.warning || "Address is invalid for this payload." };
    }
    if (v.warning) return { level: "warning", message: `Address warning: ${v.warning}` };
    return null;
  };

  switch (action) {
    case "CLAIM":
    case "BUY": {
      if (parts.length !== 3) {
        return { level: "error", message: `Expected ${action}:name:address.` };
      }
      const nameError = ensureName(parts[1] ?? "");
      if (nameError) return nameError;
      const addressError = ensureAddress(parts[2] ?? "");
      if (addressError) return addressError;
      return { level: "valid", message: `${action} payload looks valid.` };
    }
    case "UPDATE": {
      if (parts.length !== 4) {
        return { level: "error", message: "Expected UPDATE:name:address:nonce." };
      }
      const nameError = ensureName(parts[1] ?? "");
      if (nameError) return nameError;
      const addressError = ensureAddress(parts[2] ?? "");
      if (addressError) return addressError;
      if (!isWholeNumber(parts[3] ?? "")) {
        return { level: "error", message: "Nonce must be a whole number." };
      }
      return { level: "valid", message: "UPDATE payload looks valid." };
    }
    case "LIST": {
      if (parts.length !== 4) {
        return { level: "error", message: "Expected LIST:name:price_zats:nonce." };
      }
      const nameError = ensureName(parts[1] ?? "");
      if (nameError) return nameError;
      const price = parts[2] ?? "";
      if (!isWholeNumber(price) || Number(price) <= 0) {
        return { level: "error", message: "Price must be a positive whole number in zats." };
      }
      if (!isWholeNumber(parts[3] ?? "")) {
        return { level: "error", message: "Nonce must be a whole number." };
      }
      return { level: "valid", message: "LIST payload looks valid." };
    }
    case "DELIST":
    case "RELEASE": {
      if (parts.length !== 3) {
        return { level: "error", message: `Expected ${action}:name:nonce.` };
      }
      const nameError = ensureName(parts[1] ?? "");
      if (nameError) return nameError;
      if (!isWholeNumber(parts[2] ?? "")) {
        return { level: "error", message: "Nonce must be a whole number." };
      }
      return { level: "valid", message: `${action} payload looks valid.` };
    }
    default:
      return {
        level: "warning",
        message: "Unrecognized action format. You can still sign, but your transaction may not be interpretted correctly.",
      };
  }
}

export default function KeypairPage() {
  const params = useSearchParams();
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<Tab>("import");
  const [busy, setBusy] = useState(false);

  const [payload, setPayload] = useState("");
  const [signatureB64, setSignatureB64] = useState("");

  const [activeKeypair, setActiveKeypair] = useState<CryptoKeyPair | null>(null);
  const [activeSource, setActiveSource] = useState<Source>(null);
  const [publicKeyB64, setPublicKeyB64] = useState("");
  const [privateKeyB64, setPrivateKeyB64] = useState("");
  const [exportLabel, setExportLabel] = useState("");

  const [importPubB64, setImportPubB64] = useState("");
  const [importPrivB64, setImportPrivB64] = useState("");
  const [importPubError, setImportPubError] = useState("");
  const [importPrivError, setImportPrivError] = useState("");

  const [copied, setCopied] = useState<Record<CopyField, boolean>>({
    pubkey: false,
    privkey: false,
    payload: false,
    signature: false,
  });
  const [step1Open, setStep1Open] = useState(true);
  const [step2Open, setStep2Open] = useState(false);
  const [step3Open, setStep3Open] = useState(false);
  const subtleAvailable = useMemo(
    () => typeof window !== "undefined" && !!window.crypto?.subtle,
    [],
  );

  useEffect(() => {
    const initialPayload = params.get("payload");
    if (initialPayload) setPayload(initialPayload);
    setReady(true);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    const value = importPubB64.trim();
    if (!value) {
      setImportPubError("");
      return;
    }
    if (!subtleAvailable) {
      setImportPubError("WebCrypto is unavailable in this browser.");
      return;
    }
    (async () => {
      const bytes = tryBase64ToBytes(value);
      if (!bytes) {
        if (!cancelled) setImportPubError("Public key must be valid base64.");
        return;
      }
      if (bytes.length !== 32) {
        if (!cancelled) setImportPubError("Public key must decode to 32 bytes.");
        return;
      }
      try {
        await window.crypto.subtle.importKey("raw", bytes, { name: "Ed25519" }, false, ["verify"]);
        if (!cancelled) setImportPubError("");
      } catch {
        if (!cancelled) setImportPubError("Public key is not a valid Ed25519 key.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importPubB64, subtleAvailable]);

  useEffect(() => {
    let cancelled = false;
    const value = importPrivB64.trim();
    if (!value) {
      setImportPrivError("");
      return;
    }
    if (!subtleAvailable) {
      setImportPrivError("WebCrypto is unavailable in this browser.");
      return;
    }
    (async () => {
      const bytes = tryBase64ToBytes(value);
      if (!bytes) {
        if (!cancelled) setImportPrivError("Private key must be valid base64.");
        return;
      }
      try {
        await window.crypto.subtle.importKey("pkcs8", bytes, { name: "Ed25519" }, false, ["sign"]);
        if (!cancelled) setImportPrivError("");
      } catch {
        if (!cancelled) setImportPrivError("Private key must be a valid Ed25519 PKCS8 key.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [importPrivB64, subtleAvailable]);

  async function syncKeyDisplay(pair: CryptoKeyPair) {
    const [pubRaw, privPkcs8] = await Promise.all([
      window.crypto.subtle.exportKey("raw", pair.publicKey),
      window.crypto.subtle.exportKey("pkcs8", pair.privateKey),
    ]);
    setPublicKeyB64(bytesToBase64(pubRaw));
    setPrivateKeyB64(bytesToBase64(privPkcs8));
  }

  function markCopied(field: CopyField) {
    setCopied((prev) => ({ ...prev, [field]: true }));
    window.setTimeout(() => {
      setCopied((prev) => ({ ...prev, [field]: false }));
    }, 1500);
  }

  async function copyText(value: string, field: CopyField) {
    try {
      await navigator.clipboard.writeText(value);
      markCopied(field);
    } catch {
      setError("Clipboard unavailable. Copy manually.");
    }
  }

  async function pastePayloadFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Clipboard is empty.");
        return;
      }
      setPayload(text);
      markCopied("payload");
      setError("");
    } catch {
      setError("Clipboard read is blocked. Paste manually into the payload field.");
    }
  }

  async function generateKeypair() {
    if (!subtleAvailable) {
      setError("WebCrypto is unavailable in this browser.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const pair = (await window.crypto.subtle.generateKey(
        { name: "Ed25519" },
        true,
        ["sign", "verify"],
      )) as CryptoKeyPair;
      setActiveKeypair(pair);
      setActiveSource("generated");
      await syncKeyDisplay(pair);
      setSignatureB64("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate keypair.");
    } finally {
      setBusy(false);
    }
  }

  async function importKeypairValues(pubValue: string, privValue: string) {
    const trimmedPub = pubValue.trim();
    const trimmedPriv = privValue.trim();
    if (!trimmedPub || !trimmedPriv) {
      throw new Error("Paste both public and private keys to import.");
    }

    const pub = await window.crypto.subtle.importKey(
      "raw",
      base64ToBytes(trimmedPub),
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    const priv = await window.crypto.subtle.importKey(
      "pkcs8",
      base64ToBytes(trimmedPriv),
      { name: "Ed25519" },
      true,
      ["sign"],
    );
    const pair = { publicKey: pub, privateKey: priv } as CryptoKeyPair;
    setImportPubB64(trimmedPub);
    setImportPrivB64(trimmedPriv);
    setActiveKeypair(pair);
    setActiveSource("imported");
    setPublicKeyB64(trimmedPub);
    setPrivateKeyB64(trimmedPriv);
    return pair;
  }

  async function signPayload() {
    if (!subtleAvailable) {
      setError("WebCrypto is unavailable in this browser.");
      return;
    }
    if (!payload.trim()) {
      setError("Payload is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const pair: CryptoKeyPair | null = activeKeypair;
      if (!pair?.privateKey) {
        throw new Error("Complete Step 1 and use a keypair first.");
      }
      const data = new TextEncoder().encode(payload);
      const sig = await window.crypto.subtle.sign("Ed25519", pair.privateKey, data);
      setSignatureB64(bytesToBase64(sig));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign payload.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImportJsonFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as {
      pubkey?: unknown;
      privkey_pkcs8?: unknown;
    };
    if (typeof parsed.pubkey !== "string" || typeof parsed.privkey_pkcs8 !== "string") {
      throw new Error("Invalid keypair file. Expected pubkey and privkey_pkcs8.");
    }
    setImportPubB64(parsed.pubkey.trim());
    setImportPrivB64(parsed.privkey_pkcs8.trim());
    if (activeSource === "imported") {
      setActiveKeypair(null);
      setActiveSource(null);
    }
    setSignatureB64("");
  }

  function exportKeypair() {
    if (!publicKeyB64 || !privateKeyB64) {
      setError("Generate a keypair before exporting.");
      return;
    }
    setError("");
    const data = {
      pubkey: publicKeyB64,
      privkey_pkcs8: privateKeyB64,
      timestamp: new Date().toISOString(),
      label: exportLabel.trim() || null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zns-sovereign-keypair-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasGeneratedKey =
    activeSource === "generated" && !!publicKeyB64.trim() && !!privateKeyB64.trim();
  const canUseImportedKeypair =
    !!importPubB64.trim() && !!importPrivB64.trim() && !importPubError && !importPrivError;
  const canSign = !!activeKeypair;
  const step1Complete = hasGeneratedKey || activeSource === "imported";
  const step2Complete = !!signatureB64.trim();
  const step3Complete = !!signatureB64.trim();
  const step3PublicKey = publicKeyB64.trim() || importPubB64.trim();
  const payloadValidation = useMemo(() => validatePayload(payload), [payload]);
  const activeSourceSentence =
    activeSource === "generated"
      ? "You are using the keypair generated in Step 1."
      : activeSource === "imported"
        ? "You are using the keypair you imported in Step 1."
        : "No keypair is active yet. Complete Step 1 to continue.";
  const generatedKeyWarning = activeSource === "generated" ? " Make sure you save your private key!" : "";
  const step3StatusSentence = !step1Complete
    ? "No keypair is active yet. Complete Step 1 to continue."
    : !payload.trim()
      ? "No payload is prepared. Complete Step 2 to continue."
      : !signatureB64.trim()
        ? "No signature is available yet. Complete Step 2 to continue."
        : "Signature is ready. Copy it and paste it back into the modal.";

  useEffect(() => {
    if (step2Complete) {
      setStep1Open(false);
      setStep2Open(false);
      setStep3Open(true);
      return;
    }
    if (step1Complete) {
      setStep1Open(activeSource === "generated");
      setStep2Open(true);
      setStep3Open(false);
      return;
    }
    setStep1Open(true);
    setStep2Open(false);
    setStep3Open(false);
  }, [step1Complete, step2Complete, activeSource]);

  if (!ready) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <section
        className="rounded-2xl border p-6"
        style={{ background: "var(--feature-card-bg)", borderColor: "var(--faq-border)" }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "var(--fg-heading)" }}>
          Keypair Tool
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--fg-body)" }}>
          Generate or import an Ed25519 keypair, then sign the payload.
        </p>
        {!subtleAvailable && (
          <p className="mt-4 text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
            WebCrypto Ed25519 is unavailable in this browser.
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
            {error}
          </p>
        )}

        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "var(--border-muted)" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-left">
              <h2 className="text-sm font-bold" style={{ color: "var(--fg-heading)" }}>
                Step 1. Source your key
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
                Generate a new keypair or import your existing one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (step1Open && !step1Complete) return;
                setStep1Open((open) => !open);
              }}
              disabled={step1Open && !step1Complete}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
            >
              {step1Open ? "Collapse" : "Expand"}
            </button>
          </div>

          {step1Open && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTab("import")}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={tab === "import"
                    ? { background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }
                    : { background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                >
                  Import a Keypair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("generate");
                    if (tab !== "generate" && !busy) {
                      void generateKeypair();
                    }
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold"
                  style={tab === "generate"
                    ? { background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }
                    : { background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                >
                  Generate New Keypair
                </button>
              </div>
              <div className="mt-4 border-t" style={{ borderColor: "var(--border-muted)" }} />

              {tab === "generate" && (
                <div className="mt-4 grid gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                      Public Key (base64)
                    </label>
                    <textarea
                      readOnly
                      rows={2}
                      value={publicKeyB64}
                      placeholder="Public key (base64 raw)"
                      className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                      style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
                    />
                    <button
                      type="button"
                      onClick={() => copyText(publicKeyB64, "pubkey")}
                      disabled={!publicKeyB64}
                      className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      style={{
                        background: copied.pubkey ? "var(--color-accent-green-light)" : "transparent",
                        border: `1.5px solid ${copied.pubkey ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                        color: copied.pubkey ? "var(--color-accent-green)" : "var(--fg-body)",
                      }}
                    >
                      {copied.pubkey ? "Copied!" : "Copy Public Key"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                      Private Key PKCS8 (base64)
                    </label>
                    <textarea
                      readOnly
                      rows={3}
                      value={privateKeyB64}
                      placeholder="Private key PKCS8 (base64)"
                      className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                      style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    <button
                      type="button"
                      onClick={generateKeypair}
                      disabled={!subtleAvailable || busy}
                      className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                      style={{
                        background: "var(--home-result-primary-bg)",
                        color: "var(--home-result-primary-fg)",
                        boxShadow: "var(--home-result-primary-shadow)",
                      }}
                    >
                      Generate Another
                    </button>
                    {hasGeneratedKey && (
                      <>
                        <button
                          type="button"
                          onClick={exportKeypair}
                          className="rounded-lg px-3 py-2 text-xs font-semibold"
                          style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                        >
                          Export Keypair
                        </button>
                        <input
                          type="text"
                          value={exportLabel}
                          onChange={(e) => setExportLabel(e.target.value)}
                          placeholder="Optional export label"
                          className="h-[34px] w-full max-w-xs rounded-xl px-3 py-2 text-xs outline-none"
                          style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === "import" && (
                <div className="mt-4 grid gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                      Public Key (base64)
                    </label>
                    <textarea
                      rows={2}
                      value={importPubB64}
                      onChange={(e) => {
                        setImportPubB64(e.target.value);
                        if (activeSource === "imported") {
                          setActiveKeypair(null);
                          setActiveSource(null);
                        }
                      }}
                      placeholder="Public key (base64 raw)"
                      className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                      style={{
                        background: "var(--color-raised)",
                        border: `1px solid ${!importPubB64.trim() ? "var(--border-muted)" : importPubError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)"}`,
                        color: "var(--fg-body)",
                      }}
                    />
                    {importPubB64.trim() && (
                      <p
                        className="text-xs"
                        style={{ color: importPubError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}
                      >
                        {importPubError || "Valid Ed25519 public key."}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => copyText(importPubB64, "pubkey")}
                      disabled={!importPubB64.trim()}
                      className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      style={{
                        background: copied.pubkey ? "var(--color-accent-green-light)" : "transparent",
                        border: `1.5px solid ${copied.pubkey ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                        color: copied.pubkey ? "var(--color-accent-green)" : "var(--fg-body)",
                      }}
                    >
                      {copied.pubkey ? "Copied!" : "Copy Public Key"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                      Private Key PKCS8 (base64)
                    </label>
                    <textarea
                      rows={3}
                      value={importPrivB64}
                      onChange={(e) => {
                        setImportPrivB64(e.target.value);
                        if (activeSource === "imported") {
                          setActiveKeypair(null);
                          setActiveSource(null);
                        }
                      }}
                      placeholder="Private key PKCS8 (base64)"
                      className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                      style={{
                        background: "var(--color-raised)",
                        border: `1px solid ${!importPrivB64.trim() ? "var(--border-muted)" : importPrivError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)"}`,
                        color: "var(--fg-body)",
                      }}
                    />
                    {importPrivB64.trim() && (
                      <p
                        className="text-xs"
                        style={{ color: importPrivError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}
                      >
                        {importPrivError || "Valid Ed25519 private key."}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!subtleAvailable || busy || !canUseImportedKeypair) return;
                        setBusy(true);
                        setError("");
                        try {
                          await importKeypairValues(importPubB64, importPrivB64);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to use imported keypair.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={!subtleAvailable || busy || !canUseImportedKeypair}
                      className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                      style={{
                        background: "var(--home-result-primary-bg)",
                        color: "var(--home-result-primary-fg)",
                        boxShadow: "var(--home-result-primary-shadow)",
                      }}
                    >
                      Use this keypair
                    </button>
                    <button
                      type="button"
                      onClick={() => importFileInputRef.current?.click()}
                      disabled={!subtleAvailable || busy}
                      className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                      style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                    >
                      Import Keypair JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportPrivB64("");
                        setImportPubB64("");
                        if (activeSource === "imported") {
                          setActiveKeypair(null);
                          setActiveSource(null);
                        }
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-semibold"
                      style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                    >
                      Clear
                    </button>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (!subtleAvailable) {
                          setError("WebCrypto is unavailable in this browser.");
                          return;
                        }
                        setBusy(true);
                        setError("");
                        try {
                          await handleImportJsonFile(file);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to import keypair file.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border-muted)" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-left">
              <h2 className="text-sm font-bold" style={{ color: "var(--fg-heading)" }}>
                Step 2. Prepare to sign
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
                Paste the payload here to sign it with your selected keypair.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (step2Open && !step2Complete) return;
                setStep2Open((open) => !open);
              }}
              disabled={step2Open && !step2Complete}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
            >
              {step2Open ? "Collapse" : "Expand"}
            </button>
          </div>
          {step2Open && (
            <>
              <p
                className="mt-2 text-xs"
                style={{
                  color:
                    activeSource === null
                      ? "var(--accent-red, #e05252)"
                      : "var(--color-accent-green)",
                }}
              >
                {activeSourceSentence}
                {generatedKeyWarning && (
                  <span style={{ color: "var(--fg-muted)" }}>{generatedKeyWarning}</span>
                )}
              </p>
              <textarea
                rows={5}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder="Paste the sovereign payload from the modal"
                className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-mono"
                style={{
                  background: "var(--color-raised)",
                  border:
                    payloadValidation.level === "error"
                      ? "1px solid var(--accent-red, #e05252)"
                      : payloadValidation.level === "warning"
                        ? "1px solid #ca8a04"
                        : payloadValidation.level === "valid"
                          ? "1px solid var(--color-accent-green)"
                          : "1px solid var(--border-muted)",
                  color: "var(--fg-body)",
                }}
              />
              <p
                className="mt-2 text-xs"
                style={{
                  color:
                    payloadValidation.level === "error"
                      ? "var(--accent-red, #e05252)"
                      : payloadValidation.level === "warning"
                        ? "#ca8a04"
                        : payloadValidation.level === "valid"
                          ? "var(--color-accent-green)"
                          : "var(--fg-muted)",
                }}
              >
                {payloadValidation.message}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={signPayload}
                  disabled={!subtleAvailable || !canSign || busy}
                  className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  style={{
                    background: "var(--home-result-primary-bg)",
                    color: "var(--home-result-primary-fg)",
                    boxShadow: "var(--home-result-primary-shadow)",
                  }}
                >
                  Sign Payload
                </button>
                <button
                  type="button"
                  onClick={pastePayloadFromClipboard}
                  disabled={busy}
                  className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                  style={{
                    background: copied.payload ? "var(--color-accent-green-light)" : "transparent",
                    border: `1.5px solid ${copied.payload ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                    color: copied.payload ? "var(--color-accent-green)" : "var(--fg-body)",
                  }}
                >
                  {copied.payload ? (
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Pasted!
                    </span>
                  ) : (
                    "Paste Payload"
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border-muted)" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-left">
              <h2 className="text-sm font-bold" style={{ color: "var(--fg-heading)" }}>
                Step 3. Your signed payload
              </h2>
              <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
                Copy the signed payload and public key and paste them into the signing modal to complete your transaction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (step3Open && !step3Complete) return;
                setStep3Open((open) => !open);
              }}
              disabled={step3Open && !step3Complete}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
            >
              {step3Open ? "Collapse" : "Expand"}
            </button>
          </div>
          {step3Open && (
            <>
              <p
                className="mt-2 text-xs"
                style={{
                  color: step3Complete ? "var(--color-accent-green)" : "var(--accent-red, #e05252)",
                }}
              >
                {step3StatusSentence}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Signature (base64)
                </label>
                <textarea
                  readOnly
                  rows={3}
                  value={signatureB64}
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                  style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
                />
                <button
                  type="button"
                  onClick={() => copyText(signatureB64, "signature")}
                  disabled={!signatureB64}
                  className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  style={{
                    background: copied.signature ? "var(--color-accent-green-light)" : "transparent",
                    border: `1.5px solid ${copied.signature ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                    color: copied.signature ? "var(--color-accent-green)" : "var(--fg-body)",
                  }}
                >
                  {copied.signature ? (
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    "Copy Signature"
                  )}
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Public key (base64)
                </label>
                <textarea
                  readOnly
                  rows={2}
                  value={step3PublicKey}
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                  style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
                />
                <button
                  type="button"
                  onClick={() => copyText(step3PublicKey, "pubkey")}
                  disabled={!step3PublicKey}
                  className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  style={{
                    background: copied.pubkey ? "var(--color-accent-green-light)" : "transparent",
                    border: `1.5px solid ${copied.pubkey ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                    color: copied.pubkey ? "var(--color-accent-green)" : "var(--fg-body)",
                  }}
                >
                  {copied.pubkey ? "Copied!" : "Copy Public Key"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
