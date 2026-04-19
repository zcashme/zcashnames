"use client";

import { getPublicKeyAsync, signAsync } from "@noble/ed25519";
import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { validatePayload, payloadBorderStyle, payloadMessageColor } from "@/lib/zns/payload";
import type { PayloadValidation } from "@/lib/zns/payload";
import { useCopy } from "@/lib/useCopy";

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function tryBase64ToBytes(value: string): Uint8Array | null {
  try {
    const bin = atob(value.trim().replace(/\s+/g, ""));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function CopyBtn({ value, label, copied, onCopy }: { value: string; label: string; copied: boolean; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!value}
      className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: copied ? "var(--color-accent-green-light)" : "transparent",
        border: `1.5px solid ${copied ? "var(--color-accent-green)" : "var(--border-muted)"}`,
        color: copied ? "var(--color-accent-green)" : "var(--fg-body)",
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function KeypairPageInner() {
  const searchParams = useSearchParams();
  const initialPayload = searchParams.get("payload") ?? "";
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const pubkeyCopy = useCopy();
  const privkeyCopy = useCopy();
  const signatureCopy = useCopy();

  const [error, setError] = useState("");
  const [tab, setTab] = useState<"generate" | "import">("import");
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const [seed, setSeed] = useState<Uint8Array | null>(null);
  const [pubkeyB64, setPubkeyB64] = useState("");

  const [payload, setPayload] = useState(initialPayload);
  const [signatureB64, setSignatureB64] = useState("");

  const [importPrivB64, setImportPrivB64] = useState("");
  const [importPrivError, setImportPrivError] = useState("");
  const [generatedPrivateKeySaved, setGeneratedPrivateKeySaved] = useState(false);

  const privkeyB64 = seed ? bytesToBase64(seed) : "";
  const payloadValidation = useMemo(() => validatePayload(payload), [payload]);
  const isGeneratedKey = tab === "generate" && !!seed && !!pubkeyB64;
  const isImportedKey = tab === "import" && !!seed && !!pubkeyB64 && !!importPrivB64.trim() && !importPrivError;
  const hasActiveKey = isGeneratedKey || isImportedKey;

  function clearSignedPayload() {
    setSignatureB64("");
  }

  function clearActiveKey() {
    setSeed(null);
    setPubkeyB64("");
    setGeneratedPrivateKeySaved(false);
    clearSignedPayload();
  }

  async function switchToImport() {
    setTab("import");
    clearSignedPayload();
    if (!importPrivB64.trim()) {
      setImportPrivError("");
      clearActiveKey();
      return;
    }
    await handleImportPrivChange(importPrivB64);
  }

  async function generateKeypair() {
    setError("");
    clearSignedPayload();
    try {
      const s = crypto.getRandomValues(new Uint8Array(32));
      const pub = await getPublicKeyAsync(s);
      setSeed(s);
      setPubkeyB64(bytesToBase64(pub));
      setGeneratedPrivateKeySaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate keypair.");
    }
  }

  async function activateImportedSeed(seedBytes: Uint8Array) {
    clearSignedPayload();
    const pub = await getPublicKeyAsync(seedBytes);
    setSeed(seedBytes);
    setPubkeyB64(bytesToBase64(pub));
  }

  async function handleImportPrivChange(value: string) {
    clearSignedPayload();
    setImportPrivB64(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setImportPrivError("");
      setSeed(null);
      setPubkeyB64("");
      return;
    }
    const bytes = tryBase64ToBytes(trimmed);
    if (!bytes || bytes.length !== 32) {
      setImportPrivError(bytes ? "Key must decode to exactly 32 bytes." : "Invalid base64.");
      setSeed(null);
      setPubkeyB64("");
      return;
    }
    setImportPrivError("");
    try {
      await activateImportedSeed(bytes);
    } catch {
      setImportPrivError("Invalid Ed25519 key.");
      setSeed(null);
      setPubkeyB64("");
    }
  }

  async function signPayload() {
    if (!payload.trim()) {
      setError("Payload is required.");
      return;
    }
    if (!hasActiveKey || !seed) {
      setError("Load a keypair first.");
      return;
    }
    setError("");
    try {
      const data = new TextEncoder().encode(payload.trim());
      const sig = await signAsync(data, seed);
      setSignatureB64(bytesToBase64(sig));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign payload.");
    }
  }

  async function handleImportJsonFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as { privkey?: unknown };
    if (typeof parsed.privkey !== "string") {
      throw new Error("Invalid keypair file. Expected privkey.");
    }
    const seedStr = parsed.privkey.trim();
    const bytes = tryBase64ToBytes(seedStr);
    if (!bytes || bytes.length !== 32) {
      throw new Error("Invalid privkey: must be 32-byte base64.");
    }
    setImportPrivB64(seedStr);
    setImportPrivError("");
    await activateImportedSeed(bytes);
  }

  function handlePayloadChange(value: string) {
    clearSignedPayload();
    setPayload(value);
  }

  function exportKeypair() {
    if (!pubkeyB64 || !privkeyB64) {
      setError("Generate a keypair before exporting.");
      return;
    }
    setError("");
    const data = {
      pubkey: pubkeyB64,
      privkey: privkeyB64,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zns-sovereign-keypair-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setGeneratedPrivateKeySaved(true);
  }

  const borderStyle = (v: PayloadValidation) => payloadBorderStyle(v.level);
  const msgColor = (v: PayloadValidation) => payloadMessageColor(v.level);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <SiteRouteTitle title="Keypair" />
      <section
        className="rounded-2xl border p-6"
        style={{ background: "var(--feature-card-bg)", borderColor: "var(--faq-border)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Use this tool to sign a payload with a Ed25519 keypair.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAboutOpen((open) => !open)}
              aria-expanded={isAboutOpen}
              aria-controls="keypair-about"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-muted)" }}
            >
              About
            </button>
          </div>
        </div>

        {isAboutOpen && (
          <div
            id="keypair-about"
            className="mt-4 rounded-xl border p-4 text-xs"
            style={{ background: "var(--color-raised)", borderColor: "var(--border-muted)", color: "var(--fg-body)" }}
          >
            <p style={{ color: "var(--fg-muted)" }}>
              This tool runs in your browser. You can review the{" "}
              <a
                href="https://github.com/zcashme/zcashnames/blob/main/app/%28site%29/keypair/page.tsx"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                keypair tool code
              </a>{" "}
              and its{" "}
              <a
                href="https://github.com/zcashme/zcashnames/blob/main/tests/keypair.spec.ts"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                test coverage
              </a>
              .
            </p>
            <p className="mt-2" style={{ color: "var(--fg-muted)" }}>
              It covers key generation with <span className="font-mono">crypto.getRandomValues</span>, public-key derivation with{" "}
              <span className="font-mono">@noble/ed25519</span>, imports, signing, export, and copy actions.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
            {error}
          </p>
        )}

        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "var(--border-muted)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--fg-heading)" }}>
            Step 1. Source your key
          </h2>
          <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
            Import your existing keypair or generate a new one.
          </p>

          <div
            className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--border-muted)" }}
          >
            <button
              type="button"
              onClick={() => { void switchToImport(); }}
              className="px-4 py-2.5 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85"
              style={
                tab === "import"
                  ? { background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }
                  : { background: "transparent", color: "var(--fg-body)" }
              }
            >
              Use Existing
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("generate");
                if (tab !== "generate") {
                  void generateKeypair();
                } else {
                  clearSignedPayload();
                }
              }}
              className="border-l px-4 py-2.5 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85"
              style={
                tab === "generate"
                  ? { background: "var(--home-result-primary-bg)", borderColor: "var(--border-muted)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }
                  : { background: "transparent", color: "var(--fg-body)", borderColor: "var(--border-muted)" }
              }
            >
              Generate New
            </button>
          </div>
          <div className="mt-4 border-t" style={{ borderColor: "var(--border-muted)" }} />

          {tab === "generate" && (
            <div className="mt-4 grid gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Private Key (base64)
                </label>
                <textarea
                  readOnly
                  rows={2}
                  value={privkeyB64}
                  placeholder="Private key (base64)"
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                  style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <CopyBtn
                    value={privkeyB64}
                    label="Copy Private Key"
                    copied={privkeyCopy.copied}
                    onCopy={() => {
                      privkeyCopy.copy(privkeyB64);
                      setGeneratedPrivateKeySaved(true);
                    }}
                  />
                  {isGeneratedKey && (
                    <>
                      <button
                        type="button"
                        onClick={exportKeypair}
                        className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                      >
                        Export Keypair
                      </button>
                      <button
                        type="button"
                        onClick={() => void generateKeypair()}
                        className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                      >
                        Regenerate
                      </button>
                    </>
                  )}
                </div>
                {seed && (
                  <p
                    className="text-xs font-semibold"
                    style={{ color: generatedPrivateKeySaved ? "var(--fg-muted)" : "var(--accent-red, #e05252)" }}
                  >
                    Securely store your private key. It is the only way to authorize changes to your name after you claim or buy it, and it cannot be recovered if lost. Your public key can be derived from your private key.
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "import" && (
            <div className="mt-4 grid gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Private Key (base64)
                </label>
                <textarea
                  rows={2}
                  value={importPrivB64}
                  onChange={(e) => { void handleImportPrivChange(e.target.value); }}
                  placeholder="Private key (32-byte base64)"
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                  style={{
                    background: "var(--color-raised)",
                    border: `1px solid ${
                      !importPrivB64.trim()
                        ? "var(--border-muted)"
                        : importPrivError
                          ? "var(--accent-red, #e05252)"
                          : "var(--color-accent-green)"
                    }`,
                    color: "var(--fg-body)",
                  }}
                />
                {importPrivB64.trim() && (
                  <p
                    className="text-xs"
                    style={{ color: importPrivError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}
                  >
                    {importPrivError || "Valid Ed25519 key."}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2">
                {!importPrivB64.trim() && (
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                >
                  Import Keypair JSON
                </button>
                )}
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setError("");
                    clearSignedPayload();
                    try {
                      await handleImportJsonFile(file);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to import keypair file.");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {hasActiveKey && (
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border-muted)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--fg-heading)" }}>
              Step 2. Sign a payload
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
              Paste the payload from the signing modal and sign it with your keypair.
            </p>
            <textarea
              rows={5}
              value={payload}
              onChange={(e) => handlePayloadChange(e.target.value)}
              placeholder="Paste the sovereign payload from the modal"
              className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-mono"
              style={{
                background: "var(--color-raised)",
                border: borderStyle(payloadValidation),
                color: "var(--fg-body)",
              }}
            />
            <p className="mt-2 text-xs" style={{ color: msgColor(payloadValidation) }}>
              {payloadValidation.message}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void signPayload()}
                disabled={!!signatureB64}
                className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                  opacity: signatureB64 ? 0.65 : 1,
                  cursor: signatureB64 ? "not-allowed" : "pointer",
                }}
               >
                 {signatureB64 ? "(Signed)" : "Sign Payload"}
               </button>
             </div>
          </div>
        )}

        {signatureB64 && (
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--border-muted)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--fg-heading)" }}>
              Step 3. Your signed payload
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
              Copy the public key and signature back into the signing modal to complete your transaction.
            </p>

            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                Public key (base64)
              </label>
              <textarea
                readOnly
                rows={2}
                value={pubkeyB64}
                className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
              />
                <CopyBtn value={pubkeyB64} label="Copy Public Key" copied={pubkeyCopy.copied} onCopy={() => pubkeyCopy.copy(pubkeyB64)} />
            </div>

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
              <CopyBtn value={signatureB64} label="Copy Signature" copied={signatureCopy.copied} onCopy={() => signatureCopy.copy(signatureB64)} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function KeypairPage() {
  return (
    <Suspense>
      <KeypairPageInner />
    </Suspense>
  );
}
