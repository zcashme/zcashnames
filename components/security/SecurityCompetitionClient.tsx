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
import { validateSecurityReport } from "@/lib/security/report";
import type { SecurityPageModel } from "@/lib/security/window";

const STORAGE_KEY = "zns.securityTicket";
const STATUS_POLL_INTERVAL_MS = 10_000;
const STATUS_POLL_WINDOW_MS = 120_000;

const MODULES = [
  "src/boot.rs",
  "src/capsule.rs",
  "src/tee.rs",
  "src/key.rs",
  "src/mint/*",
  "src/wallet/*",
  "src/zcash.rs",
  "zcashme/orchard",
  "zcashme/zns-zcash_primitives",
  "regtest / fake-tee",
];

type View = "loading" | "start" | "payment" | "report" | "success" | "unavailable";

type Session = {
  ticketId: string;
  resumeToken: string;
  feeZec: string;
  address: string;
  memo: string;
  pinnedCommit: string | null;
  status: string;
  hasStoredReport: boolean;
};

type Draft = {
  title: string;
  affectedModule: string;
  severity: string;
  cwe: string;
  description: string;
  impact: string;
  proofOfConcept: string;
  suggestedFix: string;
  researcherHandle: string;
  githubUsername: string;
  payoutAddress: string;
};

type ApiBody = {
  ok?: boolean;
  error?: string;
  code?: string;
  retryAfter?: number;
  ticketId?: string;
  resumeToken?: string;
  feeZec?: string;
  address?: string;
  memo?: string;
  pinnedCommit?: string | null;
  status?: string;
  hasStoredReport?: boolean;
  payment?: { address?: string; memo?: string; amountZec?: string } | null;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  affectedModule: "",
  severity: "",
  cwe: "",
  description: "",
  impact: "",
  proofOfConcept: "",
  suggestedFix: "",
  researcherHandle: "",
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
  if (status === "submitting") return "Submitting";
  if (status === "github_failed") return "Saved, not filed";
  if (status === "submitted") return "Submitted";
  return "In progress";
}

function viewFor(status: string): View {
  if (status === "submitted") return "success";
  if (status === "awaiting_payment") return "payment";
  if (status === "payment_verified" || status === "github_failed" || status === "submitting") return "report";
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
  onVerified: (status: string) => void;
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
        resumeToken: session.resumeToken,
        ...(hint ? { hintTxid: hint } : {}),
      });
      if (payload?.ok && payload.status && payload.status !== "awaiting_payment") {
        stop = true;
        onVerified(payload.status);
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
  onSubmitted: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const commit = session.pinnedCommit;
  const payout = validateAddress(draft.payoutAddress.trim());
  const payoutWarning = draft.payoutAddress.trim() && (payout.status === "sapling" || payout.status === "transparent")
    ? payout.warning
    : "";
  const proofRequired = draft.severity === "critical" || draft.severity === "high";

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function send(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { payload } = await postJson("/api/security/report", {
        ticketId: session.ticketId,
        resumeToken: session.resumeToken,
        ...body,
      });
      if (payload?.ok && payload.status === "submitted") {
        onSubmitted();
        return;
      }
      setError(messageFrom(payload));
    } finally {
      setBusy(false);
    }
  }

  function submitDraft() {
    const validated = validateSecurityReport(draft);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    void send(draft);
  }

  const fieldClass = "w-full min-w-0 rounded-xl px-4 py-3 text-sm outline-none";

  return (
    <Panel>
      <div className="grid gap-5">
        <TicketLine ticketId={session.ticketId} />
        <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          {statusLabel(session.status)}. Payment is saved. File the private report here.
        </p>
        {session.status === "submitting" ? (
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>{SECURITY_MESSAGES.inProgress}</p>
        ) : null}
        {session.hasStoredReport ? (
          <button
            type="button"
            onClick={() => void send({ retryStored: true })}
            disabled={busy}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            {busy ? <AnimatedLoadingLabel label="Submitting" active /> : "Submit saved report"}
          </button>
        ) : null}
        <Field label="Title">
          <input className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.title} maxLength={200} onChange={(event) => set("title", event.target.value)} />
        </Field>
        <Field label="Affected module / file" hint="Choose a path or type one.">
          <input className={fieldClass} style={buildFaqTextFieldStyle(false)} list="security-modules" value={draft.affectedModule} maxLength={200} onChange={(event) => set("affectedModule", event.target.value)} />
          <datalist id="security-modules">
            {MODULES.map((entry) => <option key={entry} value={entry} />)}
          </datalist>
        </Field>
        <Field label="Affected commit">
          <p className="break-all font-mono text-sm" style={{ color: "var(--fg-body)" }}>
            {commit || "The pinned commit is not configured."}
          </p>
        </Field>
        <Field label="Severity claim">
          <select className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.severity} onChange={(event) => set("severity", event.target.value)}>
            <option value="">Choose severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Weakness class / CWE" hint="Example: CWE-287">
          <input className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.cwe} onChange={(event) => set("cwe", event.target.value)} autoComplete="off" />
        </Field>
        <Field label="Description">
          <textarea className={`${fieldClass} min-h-32`} style={buildFaqTextFieldStyle(false)} value={draft.description} onChange={(event) => set("description", event.target.value)} />
        </Field>
        <Field label="Impact">
          <textarea className={`${fieldClass} min-h-32`} style={buildFaqTextFieldStyle(false)} value={draft.impact} onChange={(event) => set("impact", event.target.value)} />
        </Field>
        <Field label="Proof of concept" hint={proofRequired ? "Required for critical and high findings." : "Optional for medium and low findings."}>
          <textarea className={`${fieldClass} min-h-32 font-mono`} style={buildFaqTextFieldStyle(false)} value={draft.proofOfConcept} onChange={(event) => set("proofOfConcept", event.target.value)} />
        </Field>
        <Field label="Suggested fix" hint="Optional.">
          <textarea className={`${fieldClass} min-h-24 font-mono`} style={buildFaqTextFieldStyle(false)} value={draft.suggestedFix} onChange={(event) => set("suggestedFix", event.target.value)} />
        </Field>
        <Field label="Researcher handle">
          <input className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.researcherHandle} maxLength={64} onChange={(event) => set("researcherHandle", event.target.value)} autoComplete="off" />
        </Field>
        <Field label="GitHub username" hint="Optional. The private report is filed by Zcash Names.">
          <input className={fieldClass} style={buildFaqTextFieldStyle(false)} value={draft.githubUsername} maxLength={40} onChange={(event) => set("githubUsername", event.target.value)} autoComplete="off" />
        </Field>
        <Field label="ZEC payout address" hint={payoutWarning || "Unified, Sapling, or transparent."}>
          <input className={`${fieldClass} break-all font-mono`} style={buildFaqTextFieldStyle(false)} value={draft.payoutAddress} onChange={(event) => set("payoutAddress", event.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={submitDraft} disabled={busy || !commit} className={primaryButtonClass} style={primaryButtonStyle}>
          {busy ? <AnimatedLoadingLabel label="Submitting" active /> : "Submit report"}
        </button>
      </div>
    </Panel>
  );
}

export default function SecurityCompetitionClient({ model }: { model: SecurityPageModel }) {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function remember(next: Session) {
    writeLocalStorage(STORAGE_KEY, { ticketId: next.ticketId, resumeToken: next.resumeToken });
    setSession(next);
    setView(viewFor(next.status));
  }

  async function loadStored(
    stored: { ticketId: string; resumeToken: string },
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
      setSession({
        ticketId: stored.ticketId,
        resumeToken: stored.resumeToken,
        feeZec: model.feeZec,
        address: "",
        memo: "",
        pinnedCommit: model.pinnedCommit,
        status: "",
        hasStoredReport: false,
      });
      setError(messageFrom(payload));
      setView("unavailable");
      return;
    }
    const payment = payload.payment;
    remember({
      ticketId: payload.ticketId || stored.ticketId,
      resumeToken: stored.resumeToken,
      feeZec: payload.feeZec || model.feeZec,
      address: payment?.address || "",
      memo: payment?.memo || "",
      pinnedCommit: payload.pinnedCommit ?? model.pinnedCommit,
      status: payload.status,
      hasStoredReport: payload.hasStoredReport === true,
    });
  }

  useEffect(() => {
    let cancelled = false;
    const stored = readLocalStorage<{ ticketId?: string; resumeToken?: string } | null>(STORAGE_KEY, null);
    if (!stored?.ticketId || !stored.resumeToken) {
      setView("start");
      return;
    }
    void loadStored(
      { ticketId: stored.ticketId, resumeToken: stored.resumeToken },
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
      if (!payload?.ok || !payload.ticketId || !payload.resumeToken || !payload.address || !payload.memo) {
        setError(messageFrom(payload));
        return;
      }
      remember({
        ticketId: payload.ticketId,
        resumeToken: payload.resumeToken,
        feeZec: payload.feeZec || model.feeZec,
        address: payload.address,
        memo: payload.memo,
        pinnedCommit: payload.pinnedCommit ?? model.pinnedCommit,
        status: "awaiting_payment",
        hasStoredReport: false,
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
        onVerified={(status) => remember({ ...session, status, hasStoredReport: false })}
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
        onSubmitted={() => remember({ ...session, status: "submitted", hasStoredReport: false })}
      />
    );
  }

  if (view === "success" && session) {
    return (
      <Panel>
        <div className="grid gap-4 text-left">
          <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--fg-heading)" }}>Report submitted</h2>
          <TicketLine ticketId={session.ticketId} />
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            Status: {statusLabel(session.status)}. Keep this ticket ID. The report will now be triaged.
          </p>
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
        <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          Start a ticket, pay the {model.feeZec} ZEC fee, then file the report on this page.
        </p>
        {model.closedMessage ? (
          <p className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>{model.closedMessage}</p>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <button type="button" onClick={() => void start()} disabled={busy || !model.submissionsOpen} className={primaryButtonClass} style={primaryButtonStyle}>
          {busy ? <AnimatedLoadingLabel label="Starting" active /> : "Submit finding"}
        </button>
      </div>
    </Panel>
  );
}
