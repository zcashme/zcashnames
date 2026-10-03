"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import PayWithNoirButton from "@/components/wallets/PayWithNoirButton";
import { useCopy } from "@/components/hooks/useCopy";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { buildFaqTextFieldStyle } from "@/components/ui/formFieldStyles";
import { QrBlock } from "@/components/ui/QrBlock";
import { validateAddress } from "@/lib/zns/address-validation";
import { SECURITY_MESSAGES } from "@/lib/security/errors";
import type { SecurityPageModel } from "@/lib/security/window";

const STATUS_POLL_INTERVAL_MS = 10_000;
const STATUS_POLL_WINDOW_MS = 120_000;

type View = "start" | "address" | "payment" | "report" | "success";

type Session = {
  ticketId: string;
  feeZec: string;
  address: string;
  memo: string;
  status: string;
  paymentTxid?: string;
  ghsaUrl?: string;
  claimedSeverity?: string;
  finalSeverity?: string | null;
  githubUsername?: string;
  payoutAddress: string;
};

type Draft = {
  ghsaUrl: string;
  claimedSeverity: string;
  githubUsername: string;
};

type ApiBody = {
  ok?: boolean;
  error?: string;
  code?: string;
  ticketId?: string;
  feeZec?: string;
  address?: string;
  memo?: string;
  payoutAddress?: string;
  status?: string;
  paymentTxid?: string;
  ghsaUrl?: string;
  claimedSeverity?: string;
  finalSeverity?: string | null;
  githubUsername?: string;
  payment?: { address?: string; memo?: string; amountZec?: string } | null;
};

const EMPTY_DRAFT: Draft = {
  ghsaUrl: "",
  claimedSeverity: "",
  githubUsername: "",
};

const cardStyle = {
  borderColor: "var(--faq-border)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
};

const primaryButtonClass =
  "inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100";

const primaryButtonStyle = {
  background: "var(--home-result-primary-bg)",
  color: "var(--home-result-primary-fg)",
  boxShadow: "var(--home-result-primary-shadow)",
};

function statusLabel(status: string): string {
  if (status === "awaiting_payment") return "Awaiting payment";
  if (status === "payment_verified") return "Payment verified";
  if (status === "submitted") return "Submitted";
  if (status === "accepted") return "Accepted";
  if (status === "duplicate") return "Duplicate";
  if (status === "invalid") return "Invalid";
  if (status === "paid") return "Paid";
  return "In progress";
}

function viewFor(status: string): View {
  if (["submitted", "accepted", "duplicate", "invalid", "paid"].includes(status)) return "success";
  if (status === "awaiting_payment") return "payment";
  if (status === "payment_verified") return "report";
  return "start";
}

async function postJson(url: string, body: unknown): Promise<{ status: number; payload: ApiBody | null }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object") return { status: response.status, payload: null };
    return { status: response.status, payload: parsed as ApiBody };
  } catch {
    return { status: 0, payload: null };
  }
}

function messageFrom(payload: ApiBody | null): string {
  return payload?.error || SECURITY_MESSAGES.unexpected;
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border px-5 py-6 sm:px-6 sm:py-8" style={cardStyle}>
      {children}
    </section>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-sm leading-6" style={{ color: "var(--accent-red, #e05252)" }}>
      {children}
    </p>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>{label}</span>
      {children}
      {hint ? (
        <span className="mt-2 block text-sm leading-6" style={{ color: "var(--fg-muted)" }}>{hint}</span>
      ) : null}
    </label>
  );
}

function TicketLine({ ticketId }: { ticketId: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="min-w-0">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
        Ticket
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-3">
        <p className="min-w-0 break-all font-mono text-sm" style={{ color: "var(--fg-heading)" }}>{ticketId}</p>
        <button
          type="button"
          onClick={() => void copy(ticketId)}
          className="shrink-0 cursor-pointer text-xs font-semibold text-fg-body hover:text-[var(--color-accent-interactive)]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function PaymentCard({
  session,
  onVerified,
}: {
  session: Session;
  onVerified: (status: string, paymentTxid?: string) => void;
}) {
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [quiet, setQuiet] = useState("");
  const [error, setError] = useState("");
  const [nextCheckAt, setNextCheckAt] = useState(0);
  const [autoUntil, setAutoUntil] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const checkingRef = useRef(false);
  const autoUntilRef = useRef(0);
  const stopRef = useRef(false);
  const pendingHintRef = useRef("");
  const runRef = useRef<(source: "auto" | "manual") => Promise<void>>(async () => {});

  const remainingMs = Math.max(0, nextCheckAt - nowMs);
  const autoWindowActive = autoUntil > nowMs && !stopRef.current;
  const waitingForNextCheck = autoWindowActive && remainingMs > 0;
  const refreshDisabled = checking || waitingForNextCheck;

  function beginAutoWindow(fromMs: number) {
    stopRef.current = false;
    autoUntilRef.current = fromMs + STATUS_POLL_WINDOW_MS;
    setAutoUntil(autoUntilRef.current);
    setNextCheckAt(fromMs + STATUS_POLL_INTERVAL_MS);
    setNowMs(fromMs);
  }

  function scheduleNextCheck(fromMs: number) {
    if (stopRef.current || fromMs >= autoUntilRef.current) {
      setNextCheckAt(0);
      return;
    }
    setNextCheckAt(fromMs + STATUS_POLL_INTERVAL_MS);
    setNowMs(fromMs);
  }

  async function run(source: "auto" | "manual") {
    if (checkingRef.current) return;
    if (source === "manual" && waitingForNextCheck) return;
    checkingRef.current = true;
    setChecking(true);
    setError("");
    const hint = pendingHintRef.current;
    pendingHintRef.current = "";
    let stop = false;
    try {
      const { status, payload } = await postJson("/api/security", {
        action: "verify",
        ticketId: session.ticketId,
        payoutAddress: session.payoutAddress,
        ...(hint ? { hintTxid: hint } : {}),
      });
      if (payload?.ok && payload.status && payload.status !== "awaiting_payment") {
        stop = true;
        onVerified(payload.status, payload.paymentTxid);
        return;
      }
      const code = payload?.code ?? "";
      const message = messageFrom(payload);
      if (
        status === 429
        || code === "rate_limited"
        || code === "already_used"
        || code === "wrong_amount"
        || code === "window_closed"
        || code === "not_configured"
      ) {
        stop = true;
        setQuiet("");
        setError(message);
        return;
      }
      if (code === "payment_not_found") {
        setQuiet(message);
        return;
      }
      setQuiet("");
      setError(message || SECURITY_MESSAGES.unexpected);
    } finally {
      checkingRef.current = false;
      setChecking(false);
      const now = Date.now();
      if (stop) {
        stopRef.current = true;
        autoUntilRef.current = 0;
        setAutoUntil(0);
        setNextCheckAt(0);
      } else if (source === "manual") {
        beginAutoWindow(now);
      } else {
        scheduleNextCheck(now);
      }
    }
  }

  runRef.current = run;

  useEffect(() => {
    if (nextCheckAt <= Date.now()) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [nextCheckAt]);

  useEffect(() => {
    if (!sent || nextCheckAt <= 0 || stopRef.current) return;
    const delay = Math.max(0, nextCheckAt - Date.now());
    const timeout = window.setTimeout(() => {
      void runRef.current("auto");
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [sent, nextCheckAt]);

  function confirmSent(txid?: string) {
    if (txid) pendingHintRef.current = txid;
    setError("");
    setSent(true);
    beginAutoWindow(Date.now());
    void runRef.current(txid ? "manual" : "auto");
  }

  const sentCopy = checking
    ? "Looking for a matching payment."
    : quiet
      ? autoWindowActive
        ? `${quiet} We'll keep checking for a couple of minutes.`
        : `${quiet} Tap Refresh Status to check again.`
      : "Tap Refresh Status to check for the submission fee.";

  return (
    <Panel>
      <div className="grid gap-4">
        <TicketLine ticketId={session.ticketId} />
        <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          Send {session.feeZec} ZEC with the memo below. The fee is non-refundable — have your GHSA link ready and submit it right after this step.
        </p>
      </div>
      <div
        className="mt-6 rounded-2xl border px-4 py-4 sm:px-5"
        style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
      >
        {sent ? (
          <div className="space-y-4">
            <div
              className="rounded-2xl border px-4 py-4 text-left sm:px-5"
              style={{
                borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
                background: "var(--verify-panel-fill)",
              }}
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
                Payment status
              </p>
              <p className="mt-4 text-sm leading-6" style={{ color: "var(--fg-body)" }}>{sentCopy}</p>
              <button
                type="button"
                onClick={() => void run("manual")}
                disabled={refreshDisabled}
                className="mt-4 inline-flex h-[42px] items-center justify-center rounded-full px-5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:brightness-100"
                style={primaryButtonStyle}
              >
                {checking
                  ? <AnimatedLoadingLabel label="Checking" active />
                  : waitingForNextCheck
                    ? `Check again (${Math.ceil(remainingMs / 1000)}s)`
                    : "Check again"}
              </button>
            </div>
            <ErrorText>{error}</ErrorText>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <QrBlock
                address={session.address}
                amount={session.feeZec}
                memo={session.memo}
                layout="verify"
                size={184}
                downloadFilename={`zns-security-${session.ticketId}.png`}
                belowQr={
                  <PayWithNoirButton
                    to={session.address}
                    amount={session.feeZec}
                    memo={session.memo}
                    onSent={(txid) => confirmSent(txid)}
                  />
                }
              />
            </div>
            <p className="text-center text-sm leading-6" style={{ color: "var(--fg-body)" }}>
              Paying with a different wallet? Send exactly {session.feeZec} ZEC with the exact memo, then confirm below.
            </p>
            <button
              type="button"
              onClick={() => confirmSent()}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              I&apos;ve sent it — check for my payment
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ReportForm({
  session,
  onSubmitted,
}: {
  session: Session;
  onSubmitted: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function send(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { payload } = await postJson("/api/security", {
        action: "submit",
        ticketId: session.ticketId,
        paymentTxid: session.paymentTxid,
        payoutAddress: session.payoutAddress,
        ...body,
      });
      if (payload?.ok && payload.status === "submitted") {
        onSubmitted(draft);
        return;
      }
      setError(messageFrom(payload));
    } finally {
      setBusy(false);
    }
  }

  function submitDraft() { void send(draft); }

  const fieldClass = "w-full min-w-0 rounded-xl px-4 py-3 text-sm outline-none";

  return (
    <Panel>
      <div className="grid gap-5">
        <TicketLine ticketId={session.ticketId} />
        <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          Payment verified. Paste the link to the private GitHub Security Advisory you created earlier — the ticket is recorded once you submit.
        </p>
        <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          <a href="https://github.com/zcashme/zns-mint/security/advisories/new" target="_blank" rel="noreferrer" className="underline underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>Create a GitHub Security Advisory ↗</a>
        </p>
        <Field label="GitHub Security Advisory URL">
          <input className={`${fieldClass} break-all font-mono`} style={buildFaqTextFieldStyle(false)} value={draft.ghsaUrl} maxLength={300} onChange={(event) => set("ghsaUrl", event.target.value)} autoComplete="url" spellCheck={false} />
        </Field>
        <Field label="Claimed severity">
          <select className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.claimedSeverity} onChange={(event) => set("claimedSeverity", event.target.value)}>
            <option value="">Choose severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="GitHub username">
          <input className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.githubUsername} maxLength={40} onChange={(event) => set("githubUsername", event.target.value)} autoComplete="username" />
        </Field>
        <div className="min-w-0 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          <p className="font-semibold" style={{ color: "var(--fg-heading)" }}>Unified address for bounty payment</p>
          <p className="mt-1 break-all font-mono text-xs">{session.payoutAddress}</p>
        </div>
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={submitDraft} disabled={busy || !session.paymentTxid} className={primaryButtonClass} style={primaryButtonStyle}>
          {busy ? <AnimatedLoadingLabel label="Saving ticket" active /> : "Submit GHSA link"}
        </button>
      </div>
    </Panel>
  );
}

export default function SecurityCompetitionClient({ model }: { model: SecurityPageModel }) {
  const [view, setView] = useState<View>("start");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState("");
  const payout = validateAddress(payoutAddress.trim());

  function remember(next: Session) {
    setSession(next);
    setView(viewFor(next.status));
  }

  async function start() {
    if (busy || !model.submissionsOpen) return;
    if (payout.status !== "unified") {
      setError(payout.warning || "Enter a valid Unified Zcash address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { payload } = await postJson("/api/security", { action: "start", payoutAddress: payoutAddress.trim() });
      if (!payload?.ok || !payload.ticketId || !payload.address || !payload.memo) {
        setError(messageFrom(payload));
        return;
      }
      remember({
        ticketId: payload.ticketId,
        feeZec: payload.feeZec || model.feeZec,
        address: payload.address,
        memo: payload.memo,
        payoutAddress: payload.payoutAddress || payoutAddress.trim(),
        status: "awaiting_payment",
      });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSession(null);
    setError("");
    setPayoutAddress("");
    setView("start");
  }

  if (view === "address") {
    return (
      <Panel>
        <div className="grid gap-5">
          <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--fg-heading)" }}>Start submission</h2>
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            Enter the Unified address where any bounty reward should be paid. It will also appear in your payment memo.
          </p>
          <Field label="Unified address for bounty payment" hint={payoutAddress.trim() && payout.status !== "unified" ? payout.warning : undefined}>
            <input
              className="w-full min-w-0 rounded-xl px-4 py-3 font-mono text-sm outline-none"
              style={buildFaqTextFieldStyle(false)}
              value={payoutAddress}
              onChange={(event) => { setPayoutAddress(event.target.value); setError(""); }}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <button type="button" onClick={() => void start()} disabled={busy || payout.status !== "unified" || !model.submissionsOpen} className={primaryButtonClass} style={primaryButtonStyle}>
            {busy ? <AnimatedLoadingLabel label="Creating ticket" active /> : "Start submission"}
          </button>
          <button type="button" onClick={() => setView("start")} disabled={busy} className="text-sm underline underline-offset-4" style={{ color: "var(--fg-body)" }}>Back</button>
        </div>
      </Panel>
    );
  }

  if (view === "payment" && session?.address && session.memo) {
    return (
      <PaymentCard
        session={session}
        onVerified={(status, paymentTxid) => remember({ ...session, status, paymentTxid })}
      />
    );
  }

  if ((view === "report" || view === "payment") && session) {
    if (view === "payment") {
      return (
        <Panel>
          <ErrorText>{SECURITY_MESSAGES.unexpected}</ErrorText>
        </Panel>
      );
    }
    return (
      <ReportForm
        session={session}
        onSubmitted={(draft) => remember({
          ...session,
          status: "submitted",
          ghsaUrl: draft.ghsaUrl.trim(),
          claimedSeverity: draft.claimedSeverity,
          githubUsername: draft.githubUsername.trim().replace(/^@/, ""),
          payoutAddress: session.payoutAddress,
        })}
      />
    );
  }

  if (view === "success" && session) {
    return (
      <Panel>
        <div className="grid gap-4 text-left">
          <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--fg-heading)" }}>Ticket status</h2>
          <TicketLine ticketId={session.ticketId} />
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            Status: {statusLabel(session.status)}. Keep this ticket ID for your records.
          </p>
          {session.ghsaUrl ? <a href={session.ghsaUrl} target="_blank" rel="noreferrer" className="break-all text-sm underline underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>Open your GHSA ↗</a> : null}
          {session.claimedSeverity ? <p className="text-sm" style={{ color: "var(--fg-body)" }}>Claimed severity: {session.claimedSeverity}</p> : null}
          {session.finalSeverity ? <p className="text-sm" style={{ color: "var(--fg-body)" }}>Final severity: {session.finalSeverity}</p> : null}
          {session.githubUsername ? <p className="text-sm" style={{ color: "var(--fg-body)" }}>GitHub username: @{session.githubUsername}</p> : null}
          {session.payoutAddress ? <p className="break-all font-mono text-xs" style={{ color: "var(--fg-body)" }}>Payout address: {session.payoutAddress}</p> : null}
          {session.paymentTxid ? <p className="break-all font-mono text-xs" style={{ color: "var(--fg-muted)" }}>Fee payment: {session.paymentTxid}</p> : null}
          {model.submissionsOpen ? (
            <button type="button" onClick={reset} className={primaryButtonClass} style={primaryButtonStyle}>
              Submit another finding
            </button>
          ) : null}
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="grid gap-4">
        <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--fg-heading)" }}>Submit finding</h2>
        <ol className="space-y-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          <li>
            <span className="font-semibold" style={{ color: "var(--fg-heading)" }}>First, write your private GitHub Security Advisory</span> with the finding and a reproducible proof of concept.{' '}
            <a href="https://github.com/zcashme/zns-mint/security/advisories/new" target="_blank" rel="noreferrer" className="underline underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>Create a GitHub Security Advisory ↗</a>
          </li>
          <li><span className="font-semibold" style={{ color: "var(--fg-heading)" }}>Then start here</span> and pay the {model.feeZec} ZEC fee to get your ticket and payment memo.</li>
          <li><span className="font-semibold" style={{ color: "var(--fg-heading)" }}>Right after paying</span>, submit the GHSA link with your severity and GitHub username. Keep this tab open until submitted — the fee is non-refundable.</li>
        </ol>
        {model.closedMessage ? (
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>{model.closedMessage}</p>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={() => setView("address")} disabled={!model.submissionsOpen} className={primaryButtonClass} style={primaryButtonStyle}>
          Start submission
        </button>
      </div>
    </Panel>
  );
}
