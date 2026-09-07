"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rebateUnifiedAddressError } from "@/lib/waitlist/rebate-address";
import { normalizeRefundTxid, REFUND_CHECK_STEPS, type RefundCheck, type RefundCheckStep } from "@/lib/waitlist/reservation-refund-validation";
import { readRefundCheckResponse, RefundResponseError } from "@/lib/waitlist/refund-check-response";
import CaptchaChallengeModal, { type CaptchaSolution } from "@/components/captcha/CaptchaChallengeModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";

type Props = {
  token: string; rowId: string; name: string; paymentAddress: string;
  onClose: () => void; onQualified: () => Promise<void>;
};

export default function ReservationRefundModal({ token, rowId, name, paymentAddress, onClose, onQualified }: Props) {
  const titleId = useId();
  const txidId = useId();
  const addressId = useId();
  const addressErrorId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [txid, setTxid] = useState("");
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<RefundCheck | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const resultClearTimer = useRef<number | null>(null);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [checkLocked, setCheckLocked] = useState(false);
  const checkLockedRef = useRef(false);
  const [checkStep, setCheckStep] = useState<RefundCheckStep | null>(null);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const captchaOpenRef = useRef(false);
  captchaOpenRef.current = captchaOpen;
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const retrySeconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const [saved, setSaved] = useState<{ requestId: string; notified: boolean } | null>(null);
  const mounted = useRef(true);
  const hadCaptcha = useRef(false);
  const refundAddressError = rebateUnifiedAddressError(address, paymentAddress);
  const showCheckAction = !resultVisible || result?.state !== "unsuccessful";

  function hideResult() {
    setResultVisible(false);
    if (resultClearTimer.current !== null) window.clearTimeout(resultClearTimer.current);
    resultClearTimer.current = window.setTimeout(() => {
      setResult(null);
      resultClearTimer.current = null;
    }, 300);
  }

  useEffect(() => {
    const wasOpen = hadCaptcha.current;
    hadCaptcha.current = captchaOpen;
    if (captchaOpen || !wasOpen) return;
    const frame = requestAnimationFrame(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [captchaOpen]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  useEffect(() => {
    mounted.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    function onKey(event: KeyboardEvent) {
      if (captchaOpenRef.current) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]') ?? []);
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      const outsideTabOrder = !items.includes(document.activeElement as HTMLElement);
      if (event.shiftKey && (document.activeElement === first || outsideTabOrder)) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && (document.activeElement === last || outsideTabOrder)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      mounted.current = false;
      if (resultClearTimer.current !== null) window.clearTimeout(resultClearTimer.current);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const post = useCallback(async (path: string, body: object) => {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, rowId, txid, ...body }) });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      if (data.retryAfter) { setNow(Date.now()); setRetryAt(Date.now() + data.retryAfter * 1000); }
      throw new RefundResponseError(data.error || "The request could not be completed. Please try again.", data.retryAfter);
    }
    return data;
  }, [token, rowId, txid]);

  async function check(selectedPayment?: string) {
    if (busyRef.current || (!selectedPayment && checkLockedRef.current)) return;
    checkLockedRef.current = true;
    setCheckLocked(true);
    if (!normalizeRefundTxid(txid)) { setError("Enter a transaction ID containing 64 hexadecimal characters."); return; }
    busyRef.current = true;
    setBusy(true); setError(""); setCheckStep("reservation");
    try {
      const response = await fetch("/api/waitlist/reservation-refund/check", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ token, rowId, txid, paymentKey: selectedPayment || "" }),
      });
      const next = await readRefundCheckResponse(response, step => { if (mounted.current) setCheckStep(step); });
      if (!mounted.current) return;
      if (resultClearTimer.current !== null) window.clearTimeout(resultClearTimer.current);
      setResult(next);
      setResultVisible(true);
      if (next.state === "qualifying") await onQualified();
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Could not check your payment.");
        if (e instanceof RefundResponseError && e.retryAfter) { setNow(Date.now()); setRetryAt(Date.now() + e.retryAfter * 1000); }
      }
    } finally { busyRef.current = false; if (mounted.current) { setBusy(false); setCheckStep(null); } }
  }

  function requestSubmission() {
    if (busyRef.current || retrySeconds) return;
    const validation = rebateUnifiedAddressError(address, paymentAddress);
    if (validation) { setError(validation); return; }
    setError(""); setCaptchaOpen(true);
  }

  const selectedPaymentKey = result?.paymentKey;
  const getChallenge = useCallback(async () => {
    const data = await post("/api/waitlist/reservation-refund/captcha", { paymentKey: selectedPaymentKey, refundAddress: address.trim() });
    if (data.state === "already_refunded") {
      setResult(data); setCaptchaOpen(false);
      throw new Error(data.message);
    }
    if (!data.challenge) throw new Error("Could not prepare the human check.");
    return data.challenge;
  }, [post, selectedPaymentKey, address]);

  async function submit(solution?: CaptchaSolution) {
    if (busyRef.current || retrySeconds) return;
    const validation = rebateUnifiedAddressError(address, paymentAddress);
    if (!saved && validation) { setError(validation); return; }
    if (!saved && !solution) { requestSubmission(); return; }
    busyRef.current = true;
    setBusy(true); setError("");
    try {
      const next = await post("/api/waitlist/reservation-refund", { paymentKey: result?.paymentKey, refundAddress: address.trim(), ...solution });
      if (mounted.current) {
        setCaptchaOpen(false);
        if (next.state === "already_refunded") { setSaved(null); setResult(next); return; }
        setSaved({ requestId: next.requestId, notified: next.notified });
        if (!next.notified) { setNow(Date.now()); setRetryAt(Date.now() + 60_000); }
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Could not submit your request.");
      if (solution) throw e;
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  }

  const inputClass = "w-full rounded-xl border border-[var(--faq-border)] bg-[var(--color-card)] px-3 py-3 text-sm text-fg-heading focus:outline-2 focus:outline-[var(--color-accent-interactive)]";
  const buttonClass = "w-full rounded-full bg-[var(--color-accent-interactive)] px-5 py-3 font-semibold text-white disabled:opacity-50";
  return createPortal(
    <div className="fixed inset-0 z-[10003] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-12 backdrop-blur-sm" onClick={() => { if (!captchaOpenRef.current) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal={!captchaOpen} aria-hidden={captchaOpen || undefined} inert={captchaOpen} aria-labelledby={titleId} tabIndex={-1}
        className="relative my-auto w-full max-w-[34rem] rounded-[2rem] border border-[var(--faq-border)] bg-[var(--color-card)] px-5 pb-6 pt-12 shadow-2xl sm:px-7"
        onClick={event => event.stopPropagation()}>
        <div aria-hidden="true" className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--faq-border)] bg-[var(--color-card)] text-3xl font-bold text-[var(--color-accent-interactive)]">?</div>
        <button type="button" onClick={onClose} className="zns-modal-close absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-2xl" aria-label="Close payment help">×</button>
        <h2 id={titleId} className="text-center text-2xl font-bold text-fg-heading">Reservation payment help</h2>
        <p className="mt-2 text-center text-sm text-fg-body">Check your payment for{"\u00a0"}<strong><code>{name}</code></strong></p>
        <div className="mt-5 space-y-4" aria-busy={busy}>
          {!saved && <form onSubmit={event => { event.preventDefault(); void check(); }} className="space-y-3">
            <label htmlFor={txidId} className="block text-sm font-semibold text-fg-heading">Transaction ID</label>
            <input id={txidId} className={inputClass} value={txid} maxLength={128} autoComplete="off" spellCheck={false} disabled={busy}
              onChange={event => { setTxid(event.target.value); hideResult(); setSelection(""); setError(""); setCheckLocked(false); checkLockedRef.current = false; }} />
            <div className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: resultVisible && result?.state === "select_payment" ? "1fr" : "0fr", opacity: resultVisible && result?.state === "select_payment" ? 1 : 0 }}
              aria-hidden={!resultVisible || result?.state !== "select_payment"} inert={!resultVisible || result?.state !== "select_payment"}>
              <div className="min-h-0 overflow-hidden">
                {result?.state === "select_payment" && <label className="block text-sm text-fg-heading">Choose the payment you intended for this reservation
                  <select className={`${inputClass} mt-2`} value={selection} disabled={busy || !!retrySeconds} onChange={event => { setSelection(event.target.value); if (event.target.value) void check(event.target.value); }} required>
                    <option value="">Select a payment</option>
                    {result.payments?.map((p, index) => <option key={p.key} value={p.key}>Payment {index + 1}: {p.amount} zatoshis · {p.pool || "unknown pool"} · {p.detectedAt || "unknown time"}</option>)}
                  </select>
                </label>}
              </div>
            </div>
            <div data-refund-check-action className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: showCheckAction ? "1fr" : "0fr", opacity: showCheckAction ? 1 : 0 }} aria-hidden={!showCheckAction} inert={!showCheckAction}>
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-3">
                  <button className={buttonClass} disabled={busy || checkLocked || !!retrySeconds} aria-live="polite">
                    {checkStep ? <AnimatedLoadingLabel label={REFUND_CHECK_STEPS[checkStep]} active /> : "Check transaction"}
                  </button>
                  {checkLocked && !busy && <p className="text-center text-xs text-fg-body">Edit the transaction ID to check again.</p>}
                </div>
              </div>
            </div>
          </form>}
          <div data-refund-result-panel className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{ gridTemplateRows: resultVisible ? "1fr" : "0fr", opacity: resultVisible ? 1 : 0 }} aria-hidden={!resultVisible} inert={!resultVisible}>
            <div className="min-h-0 space-y-4 overflow-hidden">
          <div aria-live="polite" className="space-y-3 text-sm text-fg-body">
            {!saved && result?.message && <p className="text-center">{result.message}</p>}
            {!saved && result?.state === "qualifying" && <p className="text-center">Your payment and memo meet the reservation requirements. Your reservation status has been refreshed.</p>}
            {!saved && !!result?.failures?.length && <div><p className="font-semibold">We found these problems:</p><ul className="mt-2 list-disc space-y-1 pl-5">{result.failures.map(f => <li key={f.code}>{f.message}.</li>)}</ul></div>}
            {saved && <div className="space-y-2 text-center"><p>Your refund request is saved and awaiting manual review. No refund has been sent yet.</p><p className="break-all">Request ID: {saved.requestId}</p>{!saved.notified && <p>The support email has not been confirmed as sent. Retry notification delivery; this will not create another request.</p>}</div>}
          </div>
          {!saved && result?.state === "unsuccessful" && <form className="space-y-3" onSubmit={event => { event.preventDefault(); requestSubmission(); }}>
            <p className="text-center text-sm text-fg-body">Request a refund of {result.amountZec} ZEC for manual review.</p>
            <label htmlFor={addressId} className="block text-sm font-semibold text-fg-heading">Your refund Unified Address</label>
            <input id={addressId} className={inputClass} value={address} onChange={event => { setAddress(event.target.value); setError(""); }} autoComplete="off" spellCheck={false} disabled={busy} placeholder="u1…"
              aria-invalid={address.length > 0 && !!refundAddressError} aria-describedby={address.length > 0 && refundAddressError ? addressErrorId : undefined} />
            {address.length > 0 && refundAddressError && <p id={addressErrorId} className="text-center text-xs text-[var(--accent-red,#e05252)]">{refundAddressError}</p>}
            <button className={buttonClass} disabled={busy || !!retrySeconds || !!refundAddressError}>{busy ? <AnimatedLoadingLabel label="Submitting" active /> : "Submit refund request"}</button>
          </form>}
            </div>
          </div>
          {saved && !saved.notified && <button className={buttonClass} disabled={busy || !!retrySeconds} onClick={() => void submit()}>{busy ? <AnimatedLoadingLabel label="Retrying" active /> : "Retry support notification"}</button>}
          {retrySeconds > 0 && <p className="text-center text-xs text-fg-body">Please wait {retrySeconds} seconds before trying again.</p>}
          {error && <p role="alert" className="text-center text-sm text-[var(--accent-red,#e05252)]">{error}</p>}
        </div>
      </div>
      <CaptchaChallengeModal isOpen={captchaOpen} getChallenge={getChallenge} submitting={busy} confirmDisabled={!!retrySeconds}
        description={retrySeconds ? `Please wait ${retrySeconds} seconds before trying again.` : "Complete this quick check to submit your refund request."}
        confirmLabel="Submit" onCancel={() => setCaptchaOpen(false)} onConfirm={submit} />
    </div>, document.body,
  );
}
