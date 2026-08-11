"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { zip321Uri } from "@/lib/purchases/zip321";
import { useCopy } from "@/components/hooks/useCopy";

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
  layout?: "default" | "verify";
  downloadFilename?: string;
};

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function QrBlock({
  address,
  amount,
  memo,
  size = 200,
  layout = "default",
  downloadFilename = "zns-payment.png",
}: QrBlockProps) {
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
    const err = await downloadQrPng(canvasRef.current, downloadFilename);
    if (err) setQrError(err);
  }

  if (layout === "verify") {
    return (
      <>
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative flex w-full justify-center">
                <div className="relative">
                  <a
                    href={uri}
                    className="block rounded-[24px] bg-white p-3 transition-transform duration-150 ease-out active:scale-95"
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
                        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                        aria-hidden="true"
                      />
                    </div>
                  </a>
                  <div className="absolute left-full top-0 bottom-0 ml-3 flex flex-col justify-between py-1">
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xs font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--color-accent-interactive)]"
                      aria-label="Expand QR"
                      title="Expand QR"
                    >
                      <ExpandIcon />
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePng}
                      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xs font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--color-accent-interactive)]"
                      aria-label="Save QR"
                      title="Save QR"
                    >
                      <DownloadIcon />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs leading-5" style={{ color: "var(--fg-muted)" }}>
                Scan above or paste the details below into your wallet
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <CopyRow label="Address" value={address} copied={addrCopied} onCopy={() => copyAddr(address)} variant="verify" />
            {hasAmount && (
              <CopyRow label="Amount" value={`${amount} ZEC`} copied={amtCopied} onCopy={() => copyAmt(amount)} variant="verify" />
            )}
            {memo && (
              <CopyRow label="Memo" value={memo} copied={memoCopied} onCopy={() => copyMemo(memo)} variant="verify" />
            )}
          </div>

          {qrError ? (
            <p className="text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
              {qrError}
            </p>
          ) : null}
        </div>

        {expanded && (
          <ExpandedQrModal
            uriEncoded={uri}
            onClose={() => setExpanded(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex w-full flex-col items-center gap-4">
        <div className="relative flex w-full justify-center">
          <div className="relative">
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
                  className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                  aria-hidden="true"
                />
              </div>
            </a>
            <div className="absolute left-full top-0 bottom-0 ml-3 flex flex-col justify-between py-1">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xs font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--color-accent-interactive)]"
                aria-label="Expand QR"
                title="Expand QR"
              >
                <ExpandIcon />
              </button>
              <button
                type="button"
                onClick={handleSavePng}
                className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xs font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--color-accent-interactive)]"
                aria-label="Save QR"
                title="Save QR"
              >
                <DownloadIcon />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="self-center cursor-pointer px-1 py-1 text-xs font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--color-accent-interactive)]"
        >
          {showHelp ? "Hide Help" : "Trouble scanning?"}
        </button>

        <div
          className="grid w-full max-w-md transition-[grid-template-rows,opacity] duration-300 ease-out"
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
                    className="w-20 shrink-0 self-start rounded-lg border-[1.5px] border-border-muted bg-transparent px-3 py-1.5 text-xs font-semibold text-fg-body cursor-pointer transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                  >
                    {showUri ? "Hide URI" : "Show URI"}
                  </button>
                  <p className="m-0">Tap the QR to open in wallet or paste URI in To: field.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleSavePng}
                    className="w-20 shrink-0 self-start rounded-lg border-[1.5px] border-border-muted bg-transparent px-3 py-1.5 text-xs font-semibold text-fg-body cursor-pointer transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                  >
                    Save QR
                  </button>
                  <p className="m-0">Download a PNG for your wallet&rsquo;s QR reader.</p>
                </div>
                <p className="m-0 text-center">Or, manually copy the address, memo, and amount below.</p>
                {qrError && <p className="m-0" style={{ color: "var(--accent-red, #e05252)" }}>{qrError}</p>}
              </div>
            </div>
          </div>
        </div>

        {showUri && (
          <div className="w-full max-w-md">
            <CopyRow label="Full URI" value={uri} copied={uriCopied} onCopy={() => copyUri(uri)} />
          </div>
        )}

        <div className="flex w-full max-w-md flex-col gap-2">
          <CopyRow label="Address" value={address} copied={addrCopied} onCopy={() => copyAddr(address)} />
          {hasAmount && (
            <CopyRow label="Amount" value={`${amount} ZEC`} copied={amtCopied} onCopy={() => copyAmt(amount)} />
          )}
          {memo && (
            <CopyRow label="Memo" value={memo} copied={memoCopied} onCopy={() => copyMemo(memo)} />
          )}
        </div>
      </div>

      {expanded && (
        <ExpandedQrModal
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
  variant?: "default" | "verify";
};

function CopyRow({ label, value, copied, onCopy, variant = "default" }: CopyRowProps) {
  const isVerify = variant === "verify";

  return (
    <div
      className={`grid w-full items-center gap-2 text-left ${
        isVerify ? "grid-cols-[4.35rem_minmax(0,1fr)]" : "grid-cols-[4.5rem_minmax(0,1fr)]"
      }`}
    >
      <span className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>{label}</span>
      {/* Value scrolls in its own column; copy control is a sibling so they never overlap. */}
      <div
        className={`flex min-w-0 items-center ${isVerify ? "rounded-xl" : "rounded-md"}`}
        style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)" }}
      >
        <code
          className={[
            "min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono",
            // Hide scrollbar; trackpad/touch/shift-wheel still scroll.
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            isVerify ? "py-3 pl-3 pr-2 text-[0.78rem]" : "py-1 pl-2 pr-1.5 text-xs",
          ].join(" ")}
          style={{ color: "var(--fg-body)" }}
          title={value}
        >
          {value || "Not set"}
        </code>
        <button
          type="button"
          onClick={onCopy}
          disabled={!value}
          className={[
            "inline-flex shrink-0 items-center justify-center self-stretch",
            "cursor-pointer border-0 bg-transparent text-fg-body transition-colors duration-200",
            "hover:text-[var(--color-accent-interactive)]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-fg-body",
            isVerify ? "w-10 pr-2" : "w-7 pr-1.5",
          ].join(" ")}
          aria-label={`Copy ${label.toLowerCase()}`}
          title={copied ? "Copied!" : `Copy ${label.toLowerCase()}`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}

type ExpandedQrModalProps = {
  uriEncoded: string;
  onClose: () => void;
};

function ExpandedQrModal({ uriEncoded, onClose }: ExpandedQrModalProps) {
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] items-start justify-center gap-2">
        <a
          href={uriEncoded}
          className="block rounded-xl bg-white p-3 transition-transform duration-150 ease-out active:scale-95"
          style={{ WebkitTapHighlightColor: "transparent" }}
          aria-label="Open in wallet"
          title="Open in wallet"
          onClick={(e) => e.stopPropagation()}
        >
          <QRCodeSVG
            value={uriEncoded}
            size={900}
            fgColor="#000000"
            bgColor="#ffffff"
            marginSize={4}
            className="h-auto w-[min(76vw,76vh,900px)] max-w-full"
          />
        </a>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="mt-2 zns-modal-close inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-black cursor-pointer transition-colors duration-200 hover:border-[var(--color-accent-interactive)]"
          aria-label="Retract QR"
          title="Retract QR"
        >
          <RetractIcon />
        </button>
      </div>
    </div>
  );
}
