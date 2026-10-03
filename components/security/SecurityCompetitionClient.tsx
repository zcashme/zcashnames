"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import PayWithNoirButton from "@/components/wallets/PayWithNoirButton";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";
import { useCopy } from "@/components/hooks/useCopy";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { buildFaqTextFieldStyle } from "@/components/ui/formFieldStyles";
import { QrBlock } from "@/components/ui/QrBlock";
import { validateAddress } from "@/lib/zns/address-validation";
import { SECURITY_MESSAGES } from "@/lib/security/errors";
import type { SecurityPageModel } from "@/lib/security/window";

const STORAGE_KEY = "zns.securityTicket";
const STATUS_POLL_INTERVAL_MS = 10_000;
const STATUS_POLL_WINDOW_MS = 120_000;

type View = "loading" | "start" | "payment" | "report" | "success" | "unavailable";

type Session = {
  ticketId: string;
  accessToken: string;
  feeZec: string;
  address: string;
  memo: string;
  status: string;
  paymentTxid?: string;
  ghsaUrl?: string;
  devTest?: boolean;
};

type Draft = {
  ghsaUrl: string;
  claimedSeverity: string;
  githubUsername: string;
  payoutAddress: string;
};

type ApiBody = {
  ok?: boolean;
  error?: string;
  code?: string;
  ticketId?: string;
  accessToken?: string;
  feeZec?: string;
  address?: string;
  memo?: string;
  status?: string;
  paymentTxid?: string;
  ghsaUrl?: string;
  claimedSeverity?: string;
  finalSeverity?: string | null;
  payment?: { address?: string; memo?: string; amountZec?: string } | null;
};

const EMPTY_DRAFT: Draft = {
  ghsaUrl: "",
  claimedSeverity: "",
  githubUsername: "",
  payoutAddress: "",
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
  return "unavailable";
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

function PaymentTabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px bg-transparent px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
        active
          ? "border-b-4 border-[var(--color-accent-interactive)] text-[var(--color-accent-interactive)]"
          : "border-b-2 border-transparent text-fg-body hover:text-[var(--color-accent-interactive)]"
      }`}
    >
      {label}
    </button>
  );
}

function PaymentCard({
  session,
  onVerified,
}: {
  session: Session;
  onVerified: (status: string, paymentTxid?: string) => void;
}) {
  const [tab, setTab] = useState<"payment" | "sent">("payment");
  const [opened, setOpened] = useState(false);
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
      const { status, payload } = await postJson("/api/security/tickets/verify", {
        ticketId: session.ticketId,
        accessToken: session.accessToken,
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
    if (tab !== "sent" || opened) return;
    setOpened(true);
    beginAutoWindow(Date.now());
    void runRef.current("auto");
  }, [tab, opened]);

  useEffect(() => {
    if (nextCheckAt <= Date.now()) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [nextCheckAt]);

  useEffect(() => {
    if (tab !== "sent" || nextCheckAt <= 0 || stopRef.current) return;
    const delay = Math.max(0, nextCheckAt - Date.now());
    const timeout = window.setTimeout(() => {
      void runRef.current("auto");
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [tab, nextCheckAt]);

  function handleSent(txid: string) {
    if (txid) pendingHintRef.current = txid;
    setTab("sent");
    if (opened) {
      beginAutoWindow(Date.now());
      void runRef.current("manual");
    }
  }

  if (session.devTest) {
    return (
      <Panel>
        <div className="grid gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--accent-red, #e05252)" }}>Local development simulation</p>
          <TicketLine ticketId={session.ticketId} />
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            No ZEC is sent and no Supabase ticket is created. Use this gate to walk through the submission form.
          </p>
          <button type="button" onClick={() => onVerified("payment_verified", "d".repeat(64))} className={primaryButtonClass} style={primaryButtonStyle}>
            Simulate fee payment
          </button>
        </div>
      </Panel>
    );
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
          Send {session.feeZec} ZEC with the memo below. The fee is non-refundable.
        </p>
      </div>
      <div
        className="mt-6 flex h-full flex-col rounded-2xl border px-4 py-4 sm:px-5"
        style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
      >
        <div
          className="flex items-end justify-center gap-6 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
        >
          <PaymentTabButton label="Pay+Memo" active={tab === "payment"} onClick={() => setTab("payment")} />
          <PaymentTabButton label="I Sent It!" active={tab === "sent"} onClick={() => setTab("sent")} />
        </div>
        {tab === "payment" ? (
          <div className="mt-6 text-center">
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
                  onSent={(txid) => handleSent(txid)}
                />
              }
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
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
                    ? `Refresh Status (${Math.ceil(remainingMs / 1000)}s)`
                    : "Refresh Status"}
              </button>
            </div>
            <ErrorText>{error}</ErrorText>
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
  onSubmitted: (ghsaUrl: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const payout = validateAddress(draft.payoutAddress.trim());
  const payoutWarning = draft.payoutAddress.trim() && payout.status !== "unified"
    ? payout.warning || "Enter a valid Unified Zcash address."
    : "";

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function send(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (session.devTest) {
        if (!/^https:\/\/github\.com\/.+\/security\/advisories\/GHSA-[A-Za-z0-9-]+\/?$/.test(draft.ghsaUrl.trim())) {
          setError("Enter a GitHub Security Advisory URL.");
          return;
        }
        if (!draft.claimedSeverity) {
          setError("Choose a claimed severity.");
          return;
        }
        if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(draft.githubUsername.trim().replace(/^@/, ""))) {
          setError("Enter a valid GitHub username.");
          return;
        }
        if (payout.status !== "unified") {
          setError("Enter a valid Zcash Unified address for bounty payment.");
          return;
        }
        onSubmitted(draft.ghsaUrl.trim());
        return;
      }
      const { payload } = await postJson("/api/security/report", {
        ticketId: session.ticketId,
        accessToken: session.accessToken,
        paymentTxid: session.paymentTxid,
        ...body,
      });
      if (payload?.ok && payload.status === "submitted") {
        onSubmitted(draft.ghsaUrl.trim());
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
          Payment verified. Create the private GitHub Security Advisory, then submit its link here. The ticket is recorded after submission.
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
        <Field label="Unified address for bounty payment" hint={payoutWarning || "Enter a Unified Zcash address where bounty rewards can be paid."}>
          <input className={`${fieldClass} break-all font-mono`} style={buildFaqTextFieldStyle(false)} value={draft.payoutAddress} onChange={(event) => set("payoutAddress", event.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={submitDraft} disabled={busy || payout.status !== "unified" || !session.paymentTxid} className={primaryButtonClass} style={primaryButtonStyle}>
          {busy ? <AnimatedLoadingLabel label="Saving ticket" active /> : "Submit GHSA link"}
        </button>
      </div>
    </Panel>
  );
}

export default function SecurityCompetitionClient({ model, devTestEnabled = false }: { model: SecurityPageModel; devTestEnabled?: boolean }) {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function remember(next: Session) {
    if (!next.devTest) writeLocalStorage(STORAGE_KEY, { ticketId: next.ticketId, accessToken: next.accessToken });
    setSession(next);
    setView(viewFor(next.status));
  }

  async function loadStored(
    stored: { ticketId: string; accessToken: string },
    cancelled: () => boolean = () => false,
  ) {
    const { status, payload } = await postJson("/api/security/tickets/status", stored);
    if (cancelled()) return;
    if (payload?.code === "not_found" || status === 404) {
      removeLocalStorage(STORAGE_KEY);
      setSession(null);
      setView("start");
      return;
    }
    if (!payload?.ok || !payload.status) {
      setSession({ ticketId: stored.ticketId, accessToken: stored.accessToken, feeZec: model.feeZec, address: "", memo: "", status: "" });
      setError(messageFrom(payload));
      setView("unavailable");
      return;
    }
    const payment = payload.payment;
    remember({
      ticketId: payload.ticketId || stored.ticketId,
      accessToken: stored.accessToken,
      feeZec: payload.feeZec || model.feeZec,
      address: payment?.address || "",
      memo: payment?.memo || "",
      status: payload.status,
      paymentTxid: payload.paymentTxid,
      ghsaUrl: payload.ghsaUrl,
    });
  }

  useEffect(() => {
    let cancelled = false;
    const stored = readLocalStorage<{ ticketId?: string; accessToken?: string } | null>(STORAGE_KEY, null);
    if (!stored?.ticketId || !stored.accessToken) {
      setView("start");
      return;
    }
    void loadStored(
      { ticketId: stored.ticketId, accessToken: stored.accessToken },
      () => cancelled,
    );
    return () => {
      cancelled = true;
    };
    // Load the saved ticket once, after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (busy || !model.submissionsOpen) return;
    setBusy(true);
    setError("");
    try {
      const { payload } = await postJson("/api/security/tickets", {});
      if (!payload?.ok || !payload.ticketId || !payload.accessToken || !payload.address || !payload.memo) {
        setError(messageFrom(payload));
        return;
      }
      remember({
        ticketId: payload.ticketId,
        accessToken: payload.accessToken,
        feeZec: payload.feeZec || model.feeZec,
        address: payload.address,
        memo: payload.memo,
        status: "awaiting_payment",
      });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    removeLocalStorage(STORAGE_KEY);
    setSession(null);
    setError("");
    setView("start");
  }

  function startDevTest() {
    removeLocalStorage(STORAGE_KEY);
    remember({
      ticketId: "ZNS-DEV-001",
      accessToken: "local-development-only",
      feeZec: model.feeZec,
      address: "local-simulation",
      memo: "local-simulation",
      status: "awaiting_payment",
      devTest: true,
    });
  }

  if (view === "loading") {
    return (
      <Panel>
        <p className="text-sm" style={{ color: "var(--fg-body)" }}>
          <AnimatedLoadingLabel label="Loading" active />
        </p>
      </Panel>
    );
  }

  if (view === "unavailable") {
    return (
      <Panel>
        <div className="grid gap-4">
          <ErrorText>{error}</ErrorText>
          <button
            type="button"
            className={primaryButtonClass}
            style={primaryButtonStyle}
            onClick={() => {
              if (!session) return;
              setView("loading");
              void loadStored(session);
            }}
          >
            Try again
          </button>
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
        onSubmitted={(ghsaUrl) => remember({ ...session, status: "submitted", ghsaUrl })}
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
          {model.submissionsOpen || session.devTest ? (
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
        <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          Pay the {model.feeZec} ZEC fee, create a private GitHub Security Advisory, then submit its link with your severity and payout details.
        </p>
        {model.closedMessage ? (
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>{model.closedMessage}</p>
        ) : null}
        {devTestEnabled ? (
          <div className="rounded-xl border border-dashed px-4 py-4" style={{ borderColor: "var(--faq-border)" }}>
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--fg-muted)" }}>Developer-only test gate</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--fg-body)" }}>Simulates fee verification and form submission locally. It does not call the ticket APIs or write to Supabase.</p>
            <button type="button" onClick={startDevTest} className={`${primaryButtonClass} mt-3`} style={primaryButtonStyle}>Start simulated submission</button>
          </div>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={() => void start()} disabled={busy || !model.submissionsOpen} className={primaryButtonClass} style={primaryButtonStyle}>
          {busy ? <AnimatedLoadingLabel label="Starting" active /> : "Submit finding"}
        </button>
      </div>
    </Panel>
  );
}
