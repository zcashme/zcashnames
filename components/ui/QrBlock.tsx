"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { zip321Uri } from "@/lib/purchases/zip321";
import { useCopy } from "@/components/hooks/useCopy";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function downloadQrPng(canvas: HTMLCanvasElement | null, filename: string): Promise<string | null> {
  if (!canvas) return "QR download is unavailable. Try again or copy the URI.";
  try {
    const padding = 96;
    const qrSize = 768;
    const out = document.createElement("canvas");
    out.width = qrSize + padding * 2;
    out.height = qrSize + padding * 2;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, padding, padding, qrSize, qrSize);
    const blob = await new Promise<Blob>((resolve, reject) => {
      out.toBlob((b) => b ? resolve(b) : reject(new Error("QR PNG export failed.")), "image/png");
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return null;
  } catch {
    return "Could not save the QR. Try a screenshot or copy the URI.";
  }
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function RetractIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M9 21H3v-6M15 3v6h6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

type QrBlockProps = {
  address: string;
  amount: string;
  memo: string;
  size?: number;
};

export function QrBlock({ address, amount, memo, size = 200 }: QrBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showUri, setShowUri] = useState(false);
  const [qrError, setQrError] = useState("");
  const uriResult = zip321Uri(address, amount, memo);
  const { uri } = uriResult;
  const { copied: uriCopied, copy: copyUri } = useCopy();
  const { copied: addrCopied, copy: copyAddr } = useCopy();
  const { copied: amtCopied, copy: copyAmt } = useCopy();
  const { copied: memoCopied, copy: copyMemo } = useCopy();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasAmount = !!amount && Number(amount) > 0;

  async function handleSavePng() {
    setQrError("");
    const err = await downloadQrPng(canvasRef.current, "zns-payment.png");
    if (err) setQrError(err);
  }

  return (
    <>
      <div className="flex w-full flex-col items-center gap-4">
        <div className="grid w-full grid-cols-[2.25rem_auto_2.25rem] items-start justify-center gap-2">
          <span aria-hidden="true" />
          <a
            href={uri}
            className="block rounded-xl bg-white p-3 transition-transform duration-150 ease-out active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label="Open in wallet"
            title="Open in wallet"
          >
            <div className="block leading-none">
              <QRCodeSVG value={uri} size={size} fgColor="#000000" bgColor="#ffffff" marginSize={4} />
              <QRCodeCanvas
                ref={canvasRef}
                value={uri}
                size={768}
                fgColor="#000000"
                bgColor="#ffffff"
                marginSize={4}
                className="pointer-events-none absolute h-px w-px opacity-0"
                aria-hidden="true"
              />
            </div>
          </a>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
            aria-label="Expand QR"
            title="Expand QR"
          >
            <ExpandIcon />
          </button>
        </div>

        {showUri && (
          <CopyRow label="Full URI" value={uri} copied={uriCopied} onCopy={() => copyUri(uri)} />
        )}

        <div className="flex w-full flex-col gap-2">
          <CopyRow label="Address" value={address} copied={addrCopied} onCopy={() => copyAddr(address)} />
          {hasAmount && (
            <CopyRow label="Amount" value={`${amount} ZEC`} copied={amtCopied} onCopy={() => copyAmt(amount)} />
          )}
          {memo && (
            <CopyRow label="Memo" value={memo} copied={memoCopied} onCopy={() => copyMemo(memo)} />
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="self-center px-1 py-1 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{ color: "var(--fg-body)" }}
        >
          {showHelp ? "Hide Help" : "Trouble scanning?"}
        </button>

        <div
          className="grid w-full transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{ gridTemplateRows: showHelp ? "1fr" : "0fr", opacity: showHelp ? 1 : 0 }}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="rounded-xl p-4 text-left"
              style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)" }}
            >
              <div className="flex flex-col gap-2 text-xs leading-relaxed" style={{ color: "var(--fg-body)" }}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowUri((v) => !v)}
                    className="w-20 shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                    style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                  >
                    {showUri ? "Hide URI" : "Show URI"}
                  </button>
                  <p className="m-0">Using Zingo! or Zkool? Tap the QR to open in wallet or paste URI in To: field.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleSavePng}
                    className="w-20 shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                    style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                  >
                    Save QR
                  </button>
                  <p className="m-0">Using Zashi? Save the QR, then upload it from the wallet scanner.</p>
                </div>
                <p className="m-0">Manual entry: copy the address, memo, and amount into your wallet.</p>
                {qrError && <p className="m-0" style={{ color: "var(--accent-red, #e05252)" }}>{qrError}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <ExpandedQrModal
          address={address}
          amount={amount}
          memo={memo}
          uriEncoded={uri}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}

type CopyRowProps = {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
};

function CopyRow({ label, value, copied, onCopy }: CopyRowProps) {
  return (
    <div className="flex w-full items-center justify-between overflow-hidden rounded-lg px-3 py-2" style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)" }}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>{label}</span>
        <code className="truncate text-xs" style={{ color: "var(--fg-body)" }}>{value}</code>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="ml-2 shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer transition-opacity hover:opacity-80"
        style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
        aria-label={`Copy ${label}`}
        title={copied ? "Copied!" : `Copy ${label}`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

type ExpandedQrModalProps = {
  address: string;
  amount: string;
  memo: string;
  uriEncoded: string;
  onClose: () => void;
};

function ExpandedQrModal({ address, amount, memo, uriEncoded, onClose }: ExpandedQrModalProps) {
  const memoEncoded = memo ? toBase64Url(memo) : "";
  const { copy: copyUri } = useCopy();
  const { copy: copyAddr } = useCopy();
  const { copy: copyAmt } = useCopy();
  const { copy: copyMemo } = useCopy();

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col items-center gap-6 overflow-y-auto rounded-2xl p-8"
        style={{ background: "var(--feature-card-bg)", border: "1px solid var(--faq-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: "var(--color-raised)", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
          aria-label="Close"
        >
          <RetractIcon />
        </button>
        <div className="flex w-full flex-col items-center gap-1 text-center">
          <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Scan with Your Wallet</h2>
          <p className="text-sm" style={{ color: "var(--fg-body)" }}>Open the QR code in your Zcash wallet app to pre-fill transaction details.</p>
        </div>

        <a
          href={uriEncoded}
          className="block rounded-xl bg-white p-4 transition-transform duration-150 ease-out active:scale-95"
          style={{ WebkitTapHighlightColor: "transparent" }}
          aria-label="Open in wallet"
          title="Open in wallet"
        >
          <QRCodeSVG value={uriEncoded} size={360} fgColor="#000000" bgColor="#ffffff" marginSize={4} />
        </a>

        <div className="flex w-full flex-col gap-2">
          <CopyRow label="Full URI" value={uriEncoded} copied={false} onCopy={() => copyUri(uriEncoded)} />
          <CopyRow label="Address" value={address} copied={false} onCopy={() => copyAddr(address)} />
          {amount && Number(amount) > 0 && (
            <CopyRow label="Amount" value={`${amount} ZEC`} copied={false} onCopy={() => copyAmt(amount)} />
          )}
          {memo && (
            <CopyRow label="Memo (plaintext)" value={memo} copied={false} onCopy={() => copyMemo(memo)} />
          )}
          {memoEncoded && (
            <CopyRow label="Memo (encoded)" value={memoEncoded} copied={false} onCopy={() => copyMemo(memoEncoded)} />
          )}
        </div>
      </div>
    </div>
  );
}
