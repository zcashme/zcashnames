import { expect, test } from "@playwright/test";
import { bech32m } from "bech32";
import { PGlite } from "@electric-sql/pglite";
import { createHash, createHmac, createVerify, generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { buildGitHubReportBody } from "../lib/security/github-body";
import { isSecurityTicketId, memoTicketId, securityPaymentMemo } from "../lib/security/memo";
import { selectQualifyingPayment, type SecurityLedgerRow } from "../lib/security/payment";
import { validateSecurityReport, type ValidatedReport } from "../lib/security/report";
import { createResumeToken, hashResumeToken, resumeMatches } from "../lib/security/resume";
import { competitionPhase, parseCommit, parseFeeZec, parseGithubSlug, parseTxTable, zecToZats } from "../lib/security/window";

const address = bech32m.encode("u", new Array(100).fill(1), 300);
const sentinel = "SENTINEL-POC-DO-NOT-LEAK";
const commit = "abcdef1";
const txid = "ab".repeat(32);
const otherTxid = "cd".repeat(32);

function report(overrides: Partial<ValidatedReport> = {}): ValidatedReport {
  return {
    title: "Seed leak",
    affectedModule: "src/capsule.rs",
    severity: "critical",
    cwe: "CWE-0079",
    description: "line one\nline two",
    impact: "Registry seed leaves the enclave.",
    proofOfConcept: sentinel,
    suggestedFix: "",
    researcherHandle: "alice",
    githubUsername: "alice-dev",
    payoutAddress: address,
    ...overrides,
  };
}

function row(overrides: Partial<SecurityLedgerRow> = {}): SecurityLedgerRow {
  return {
    amount_zats: 1_000_000,
    detected_at: "2026-10-02T00:00:00.000Z",
    memo: "ZNS:SECURITY|ticket::ZNS-26-042",
    txid,
    is_outgoing: false,
    status: "confirmed",
    recipient_address: address,
    ...overrides,
  };
}

test("competition window, fees, commits, and ticket memos", () => {
  const start = new Date("2026-10-01T00:00:00.000Z");
  const end = new Date("2026-10-20T00:00:00.000Z");
  expect(competitionPhase(null, end)).toBe("unconfigured");
  expect(competitionPhase(end, start)).toBe("unconfigured");
  expect(competitionPhase(start, end, new Date("2026-09-30T00:00:00.000Z"))).toBe("before");
  expect(competitionPhase(start, end, new Date("2026-10-02T00:00:00.000Z"))).toBe("open");
  expect(competitionPhase(start, end, end)).toBe("after");
  expect(parseFeeZec("0.0100")).toBe("0.01");
  expect(parseFeeZec("1.00000000")).toBe("1");
  expect(zecToZats("0.01")).toBe(1_000_000);
  for (const value of ["0", "-1", "0.000000001", "nope", ""]) expect(parseFeeZec(value)).toBeNull();
  expect(parseCommit(" ABCDEF1 ")).toBe("abcdef1");
  expect(parseCommit("abc")).toBeNull();
  expect(parseTxTable(undefined)).toBe("zn_security_comp");
  expect(parseTxTable("Bad-Name")).toBeNull();
  expect(parseGithubSlug(undefined, "znsme")).toBe("znsme");
  expect(parseGithubSlug("bad repo", "znsme")).toBeNull();

  expect(isSecurityTicketId("ZNS-26-042")).toBe(true);
  expect(isSecurityTicketId("ZNS-26-1000")).toBe(true);
  expect(isSecurityTicketId("ZNS-26-42")).toBe(false);
  expect(securityPaymentMemo("ZNS-26-042")).toBe("ZNS:SECURITY|ticket::ZNS-26-042");
  expect(memoTicketId("ZNS:SECURITY|ticket::ZNS-26-042\0")).toBe("ZNS-26-042");
  expect(memoTicketId("ticket::ZNS-26-042")).toBe("ZNS-26-042");
  expect(memoTicketId("ZNS:SECURITY|ticket::ZNS-26-0420")).toBe("ZNS-26-0420");
  expect(memoTicketId("ZNS:SECURITY|ticket::ZNS-26-0420")).not.toBe("ZNS-26-042");
  expect(memoTicketId("hello")).toBeNull();
});

test("payment selection rejects short, reused, hinted, and lookalike memos", () => {
  const base = { rows: [row(), row({ txid: otherTxid, detected_at: "2026-10-01T00:00:00.000Z", amount_zats: "2000000" })], ticketId: "ZNS-26-042", feeAddress: address, minimumZats: 1_000_000, usedTxids: new Set<string>() };
  const earliest = selectQualifyingPayment(base);
  expect(earliest.ok ? earliest.txid : "").toBe(otherTxid);
  expect(selectQualifyingPayment({ ...base, hintTxid: ` ${txid.toUpperCase()} ` })).toMatchObject({ ok: true, txid, amountZats: 1_000_000 });
  expect(selectQualifyingPayment({ ...base, hintTxid: "zz" }).ok).toBe(false);
  expect(selectQualifyingPayment({ ...base, hintTxid: "ee".repeat(32) })).toMatchObject({ code: "payment_not_found" });
  expect(selectQualifyingPayment({ ...base, rows: [row({ amount_zats: 999_999 })] })).toMatchObject({ code: "wrong_amount" });
  expect(selectQualifyingPayment({ ...base, rows: [row()], usedTxids: new Set([txid]) })).toMatchObject({ code: "already_used" });
  expect(selectQualifyingPayment({ ...base, rows: [row({ memo: "ZNS:SECURITY|ticket::ZNS-26-0420", is_outgoing: false })] })).toMatchObject({ code: "payment_not_found" });
  expect(selectQualifyingPayment({ ...base, rows: [row({ is_outgoing: true }), row({ status: "failed" }), row({ recipient_address: "other" })] })).toMatchObject({ code: "payment_not_found" });
});

test("report validation keeps line breaks and rejects unpaid severity claims", () => {
  const valid = validateSecurityReport({ ...report(), description: "line one\r\nline two", githubUsername: "@alice-dev", cwe: " cwe-0079 " });
  expect(valid.ok && valid.value.cwe).toBe("CWE-0079");
  expect(valid.ok && valid.value.description).toBe("line one\nline two");
  expect(valid.ok && valid.value.githubUsername).toBe("alice-dev");
  expect(validateSecurityReport(report({ severity: "high", proofOfConcept: "   " }))).toMatchObject({ error: "A proof of concept is required for critical and high findings." });
  expect(validateSecurityReport(report({ severity: "critical", proofOfConcept: "" }))).toMatchObject({ error: "A proof of concept is required for critical and high findings." });
  expect(validateSecurityReport(report({ severity: "medium", proofOfConcept: "" })).ok).toBe(true);
  expect(validateSecurityReport(report({ severity: "severe" as ValidatedReport["severity"] }))).toMatchObject({ error: "Choose a severity of critical, high, medium, or low." });
  expect(validateSecurityReport(report({ cwe: "79" }))).toMatchObject({ error: "Enter a CWE id such as CWE-287." });
  expect(validateSecurityReport(report({ description: "bad\u0001text" }))).toMatchObject({ error: "Enter a description." });
  expect(validateSecurityReport(report({ payoutAddress: "not-an-address" }))).toMatchObject({ error: "Enter a Zcash unified, Sapling, or transparent payout address." });
  expect(validateSecurityReport(report({ proofOfConcept: "x".repeat(12_001) }))).toMatchObject({ error: "The proof of concept is too long." });
});

test("GitHub report body uses the documented fields and keeps the ticket id", () => {
  const body = buildGitHubReportBody({ ticketId: "ZNS-26-042", report: report(), affectedCommit: commit, packageName: "zns-mint" });
  expect(body.summary.startsWith("[ZNS-26-042] ")).toBe(true);
  expect(body.severity).toBe("critical");
  expect(body.cwe_ids).toEqual(["CWE-0079"]);
  expect(body.vulnerabilities[0]).toEqual({ package: { ecosystem: "rust", name: "zns-mint" }, vulnerable_version_range: commit });
  expect(body.description).toContain("Competition ticket\nZNS-26-042");
  expect(body.description).toContain(sentinel);
  expect(body.description).toContain("line one\nline two");
  expect("credits" in body).toBe(false);
  expect(() => buildGitHubReportBody({
    ticketId: "ZNS-26-042",
    report: report({ description: "a".repeat(20_000), impact: "b".repeat(20_000), proofOfConcept: "c".repeat(20_000), suggestedFix: "d".repeat(20_000) }),
    affectedCommit: commit,
    packageName: "zns-mint",
  })).toThrow("GitHub limit");
});

test("resume tokens are hashed and compared without a short-circuit on length", () => {
  const created = createResumeToken();
  expect(created.hash).toBe(hashResumeToken(created.token));
  expect(created.token.length).toBeGreaterThanOrEqual(32);
  expect(resumeMatches(created.token, created.hash)).toBe(true);
  expect(resumeMatches(`${created.token}x`, created.hash)).toBe(false);
  expect(resumeMatches(created.token, "ab")).toBe(false);
});

test("browser code does not carry GitHub credentials", () => {
  const client = readFileSync("components/security/SecurityCompetitionClient.tsx", "utf8");
  const rules = readFileSync("components/security/SecurityRules.tsx", "utf8");
  const page = readFileSync("app/(site)/security/page.tsx", "utf8");
  for (const source of [client, rules, page]) {
    expect(source.includes("GITHUB")).toBe(false);
    expect(source.includes("PRIVATE_KEY")).toBe(false);
    expect(source.includes("process.env")).toBe(false);
    expect(source.includes("SECURITY_COMP_")).toBe(false);
  }
});

test.describe("security competition server", () => {
  type Ticket = {
    ticket_id: string;
    resume_token_hash: string;
    status: string;
    report_payload: unknown;
    payment_txid: string | null;
    payment_amount_zats: number | null;
    researcher_handle: string | null;
    github_username: string | null;
    payout_address: string | null;
    claimed_severity: string | null;
    affected_commit: string | null;
    affected_module: string | null;
    github_ghsa_id: string | null;
    github_html_url: string | null;
  };
  type Ledger = SecurityLedgerRow;
  const tickets: Ticket[] = [];
  const ledger: Ledger[] = [];
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const logs: string[] = [];
  let seq = 41;
  let limitsAllowed = true;
  let finishFailures = 0;
  let ledgerError = false;
  let explode: Error | null = null;
  let mode: "ok" | "create-fail" | "auth-fail" | "validation-fail" | "rate" = "ok";
  let postCount = 0;
  const reports: Array<{ summary?: string; description?: string }> = [];
  let pem = "";
  let originalLoad: ((id: string, parent: unknown, isMain: boolean) => unknown) | null = null;
  let originalFetch: typeof fetch | null = null;
  let originalError: typeof console.error | null = null;
  const savedEnv = new Map<string, string | undefined>();
  let api: {
    createSecurityTicket: (request: Request) => Promise<{ ticketId: string; resumeToken: string; address: string; memo: string; feeZec: string; pinnedCommit: string }>;
    securityTicketStatus: (ticketId: string, resumeToken: string) => Promise<Record<string, unknown>>;
    verifySecurityPayment: (request: Request, ticketId: string, resumeToken: string, hint?: string | null) => Promise<{ status: string }>;
    submitSecurityReport: (request: Request, ticketId: string, resumeToken: string, input: unknown) => Promise<Record<string, unknown>>;
    getSecurityConfig: () => ReturnType<typeof import("../lib/security/config").getSecurityConfig>;
    securityPageModel: (config: ReturnType<typeof import("../lib/security/config").getSecurityConfig>) => Record<string, unknown>;
    clearGitHubTokenCache: () => void;
    createPost: (request: Request) => Promise<Response>;
    statusPost: (request: Request) => Promise<Response>;
    verifyPost: (request: Request) => Promise<Response>;
    reportPost: (request: Request) => Promise<Response>;
  };

  function header(init: RequestInit | undefined, name: string): string {
    const headers = init?.headers;
    if (!headers) return "";
    if (headers instanceof Headers) return headers.get(name) ?? "";
    if (Array.isArray(headers)) return headers.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? "";
    const record = headers as Record<string, string>;
    return record[name] ?? "";
  }

  function pay(ticketId: string, amount = 1_000_000, paymentTxid = txid, memo?: string) {
    ledger.push(row({
      txid: paymentTxid,
      amount_zats: amount,
      memo: memo ?? `ZNS:SECURITY|ticket::${ticketId}`,
    }));
  }

  function requestFor(pathname: string, body?: unknown): Request {
    return new Request(`https://www.zcashnames.com${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? "{}" : JSON.stringify(body),
    });
  }

  test.beforeAll(() => {
    pem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    for (const key of [
      "SECURITY_COMP_START",
      "SECURITY_COMP_END",
      "SECURITY_COMP_PINNED_COMMIT",
      "SECURITY_COMP_FEE_ADDRESS",
      "SECURITY_COMP_FEE_ZEC",
      "SECURITY_COMP_TX_TABLE",
      "SECURITY_COMP_GITHUB_OWNER",
      "SECURITY_COMP_GITHUB_REPO",
      "SECURITY_COMP_GITHUB_APP_ID",
      "SECURITY_COMP_GITHUB_INSTALLATION_ID",
      "SECURITY_COMP_GITHUB_PRIVATE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "VERCEL",
    ]) savedEnv.set(key, process.env[key]);

    const nodeModule = require("node:module") as { _load: NonNullable<typeof originalLoad> };
    originalLoad = nodeModule._load;
    nodeModule._load = function (this: unknown, id: string, parent: unknown, isMain: boolean) {
      if (id === "server-only") return {};
      if (id === "@/lib/db") return { db: fakeDb };
      if (id.startsWith("@/")) {
        const base = path.join(process.cwd(), id.slice(2));
        for (const suffix of [".ts", ".tsx", ".js", ""]) {
          const candidate = `${base}${suffix}`;
          if (existsSync(candidate) && statSync(candidate).isFile()) return originalLoad?.call(this, candidate, parent, isMain);
        }
      }
      return originalLoad?.call(this, id, parent, isMain);
    };
    api = {
      ...require("../lib/security/tickets"),
      ...require("../lib/security/config"),
      ...require("../lib/security/github"),
      createPost: require("../app/api/security/tickets/route").POST,
      statusPost: require("../app/api/security/tickets/status/route").POST,
      verifyPost: require("../app/api/security/tickets/verify/route").POST,
      reportPost: require("../app/api/security/report/route").POST,
    };
    originalFetch = global.fetch;
    originalError = console.error;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("/access_tokens")) {
        if (mode === "auth-fail") return new Response("no", { status: 401 });
        return Response.json({ token: "ghs_test_token", expires_at: new Date(Date.now() + 3_600_000).toISOString() });
      }
      if (url.endsWith("/security-advisories/reports") && (init?.method ?? "GET") === "POST") {
        postCount += 1;
        const body = JSON.parse(String(init?.body ?? "{}")) as { summary?: string; description?: string };
        if (mode === "create-fail") return new Response("no", { status: 503 });
        if (mode === "validation-fail") return Response.json({ errors: [{ field: "summary" }] }, { status: 422 });
        if (mode === "rate") return new Response("slow", { status: 429 });
        reports.push(body);
        return Response.json({
          ghsa_id: "GHSA-test-test-test",
          html_url: "https://github.com/znsme/zns-mint/security/advisories/GHSA-test-test-test",
        });
      }
      if (url.includes("/security-advisories?")) {
        return Response.json(reports.map((body) => ({
          summary: body.summary,
          ghsa_id: "GHSA-test-test-test",
          html_url: "https://github.com/znsme/zns-mint/security/advisories/GHSA-test-test-test",
        })));
      }
      return new Response("missing", { status: 404 });
    }) as typeof fetch;
    console.error = (...args: unknown[]) => {
      logs.push(args.map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).join(" "));
    };
  });

  test.afterAll(() => {
    const nodeModule = require("node:module") as { _load: NonNullable<typeof originalLoad> };
    if (originalLoad) nodeModule._load = originalLoad;
    if (originalFetch) global.fetch = originalFetch;
    if (originalError) console.error = originalError;
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test.beforeEach(() => {
    tickets.length = 0;
    ledger.length = 0;
    calls.length = 0;
    logs.length = 0;
    reports.length = 0;
    seq = 41;
    limitsAllowed = true;
    finishFailures = 0;
    ledgerError = false;
    explode = null;
    mode = "ok";
    postCount = 0;
    process.env.SECURITY_COMP_START = "2026-01-01T00:00:00.000Z";
    process.env.SECURITY_COMP_END = "2027-01-01T00:00:00.000Z";
    process.env.SECURITY_COMP_PINNED_COMMIT = commit;
    process.env.SECURITY_COMP_FEE_ADDRESS = address;
    process.env.SECURITY_COMP_FEE_ZEC = "0.01";
    process.env.SECURITY_COMP_TX_TABLE = "zn_security_comp";
    process.env.SECURITY_COMP_GITHUB_OWNER = "znsme";
    process.env.SECURITY_COMP_GITHUB_REPO = "zns-mint";
    process.env.SECURITY_COMP_GITHUB_APP_ID = "12345";
    process.env.SECURITY_COMP_GITHUB_INSTALLATION_ID = "99";
    process.env.SECURITY_COMP_GITHUB_PRIVATE_KEY = pem;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "security-test-secret";
    delete process.env.VERCEL;
    api.clearGitHubTokenCache();
  });

  const fakeDb = {
    from(table: string) {
      const filters: Array<(row: Ticket & Ledger) => boolean> = [];
      let cap = Number.POSITIVE_INFINITY;
      let single = false;
      const builder = {
        select() { return builder; },
        eq(key: string, value: unknown) { filters.push((entry) => entry[key as keyof typeof entry] === value); return builder; },
        neq(key: string, value: unknown) { filters.push((entry) => entry[key as keyof typeof entry] !== value); return builder; },
        in(key: string, values: unknown[]) { filters.push((entry) => values.includes(entry[key as keyof typeof entry])); return builder; },
        ilike(key: string, pattern: string) {
          const needle = pattern.replaceAll("%", "").toLowerCase();
          filters.push((entry) => String(entry[key as keyof typeof entry] ?? "").toLowerCase().includes(needle));
          return builder;
        },
        order() { return builder; },
        limit(count: number) { cap = count; return builder; },
        maybeSingle() { single = true; return builder; },
        then(resolve: (value: { data: unknown; error: { code: string } | null }) => unknown, reject?: (reason: unknown) => unknown) {
          if (table !== "zn_security_comp_tickets" && ledgerError) {
            return Promise.resolve({ data: null, error: { code: "42P01" } }).then(resolve, reject);
          }
          const source = (table === "zn_security_comp_tickets" ? tickets : ledger) as Array<Ticket & Ledger>;
          const rows = source.filter((entry) => filters.every((filter) => filter(entry))).slice(0, cap).map((entry) => ({ ...entry }));
          return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
    async rpc(name: string, args: Record<string, unknown>) {
      if (explode) throw explode;
      if (name === "consume_security_comp_limits") {
        return { data: limitsAllowed ? { allowed: true, retry_after: 0 } : { allowed: false, retry_after: 12 }, error: null };
      }
      if (name === "create_zn_security_comp_ticket") {
        seq += 1;
        const id = `ZNS-26-${String(seq).padStart(3, "0")}`;
        tickets.push({
          ticket_id: id,
          resume_token_hash: String(args.p_resume_token_hash),
          status: "awaiting_payment",
          report_payload: null,
          payment_txid: null,
          payment_amount_zats: null,
          researcher_handle: null,
          github_username: null,
          payout_address: null,
          claimed_severity: null,
          affected_commit: null,
          affected_module: null,
          github_ghsa_id: null,
          github_html_url: null,
        });
        return { data: id, error: null };
      }
      const ticket = tickets.find((entry) => entry.ticket_id === args.p_ticket_id);
      if (name === "verify_zn_security_comp_payment") {
        if (!ticket) return { data: "missing", error: null };
        if (ticket.status !== "awaiting_payment") {
          return { data: ticket.payment_txid === args.p_txid ? "already_verified" : "not_awaiting", error: null };
        }
        if (tickets.some((entry) => entry.payment_txid === args.p_txid && entry.ticket_id !== ticket.ticket_id)) {
          return { data: "already_used", error: null };
        }
        const match = ledger.find((entry) => entry.txid === args.p_txid && entry.is_outgoing === false && entry.recipient_address === args.p_fee_address);
        if (!match) return { data: "not_found", error: null };
        if (Number(match.amount_zats) < Number(args.p_min_zats)) return { data: "wrong_amount", error: null };
        ticket.status = "payment_verified";
        ticket.payment_txid = String(args.p_txid);
        ticket.payment_amount_zats = Number(match.amount_zats);
        return { data: "verified", error: null };
      }
      if (!ticket) return { data: "missing", error: null };
      if (name === "begin_zn_security_comp_submit") {
        if (ticket.status === "submitted") return { data: "submitted", error: null };
        if (ticket.status === "awaiting_payment") return { data: "payment_required", error: null };
        ticket.status = "submitting";
        ticket.researcher_handle = String(args.p_researcher_handle);
        ticket.github_username = args.p_github_username ? String(args.p_github_username) : null;
        ticket.payout_address = String(args.p_payout_address);
        ticket.claimed_severity = String(args.p_claimed_severity);
        ticket.affected_commit = String(args.p_affected_commit);
        ticket.affected_module = String(args.p_affected_module);
        ticket.report_payload = args.p_report_payload;
        return { data: "started", error: null };
      }
      if (ticket.status !== "submitting") return { data: "ignored", error: null };
      if (finishFailures > 0) {
        finishFailures -= 1;
        return { data: "ignored", error: null };
      }
      if (args.p_ok) {
        ticket.status = "submitted";
        ticket.github_ghsa_id = String(args.p_ghsa_id);
        ticket.github_html_url = typeof args.p_html_url === "string" && args.p_html_url.startsWith("https://github.com/") ? args.p_html_url : null;
        ticket.report_payload = null;
      } else {
        ticket.status = "github_failed";
      }
      return { data: "saved", error: null };
    },
  };

  test("ticket creation is server-side, window-gated, and rate-limited", async () => {
    process.env.SECURITY_COMP_START = "2026-11-01T00:00:00.000Z";
    process.env.SECURITY_COMP_END = "2026-12-01T00:00:00.000Z";
    await expect(api.createSecurityTicket(requestFor("/api/security/tickets"))).rejects.toMatchObject({
      status: 403,
      code: "window_closed",
      message: "Submissions are not open yet.",
    });
    expect(securityPageClosed("before")).toBe("Submissions open when the competition starts.");

    process.env.SECURITY_COMP_START = "2026-01-01T00:00:00.000Z";
    process.env.SECURITY_COMP_END = "2026-02-01T00:00:00.000Z";
    await expect(api.createSecurityTicket(requestFor("/api/security/tickets"))).rejects.toMatchObject({
      message: "The competition is closed.",
    });
    expect(securityPageClosed("after")).toBe("The competition is closed. New reports are not being accepted.");

    delete process.env.SECURITY_COMP_FEE_ADDRESS;
    process.env.SECURITY_COMP_END = "2027-01-01T00:00:00.000Z";
    await expect(api.createSecurityTicket(requestFor("/api/security/tickets"))).rejects.toMatchObject({
      status: 503,
      message: "Submissions are not available right now.",
    });
    const hidden = api.securityPageModel(api.getSecurityConfig());
    expect(hidden).not.toHaveProperty("feeAddress");
    expect(JSON.stringify(hidden)).not.toContain(address);
    expect(JSON.stringify(hidden)).not.toContain(pem);
    expect(hidden.closedMessage).toBe("Submissions are not open yet.");

    process.env.SECURITY_COMP_FEE_ADDRESS = address;
    limitsAllowed = true;
    const created = await api.createSecurityTicket(requestFor("/api/security/tickets"));
    expect(created.ticketId).toBe("ZNS-26-042");
    expect(created.memo).toBe("ZNS:SECURITY|ticket::ZNS-26-042");
    expect(created.address).toBe(address);
    expect(created.feeZec).toBe("0.01");
    expect(created.pinnedCommit).toBe(commit);
    expect(tickets[0].resume_token_hash).toBe(hashResumeToken(created.resumeToken));
    expect(tickets[0].resume_token_hash).not.toBe(created.resumeToken);
    expect(JSON.stringify(created)).not.toContain(pem);

    limitsAllowed = false;
    await expect(api.createSecurityTicket(requestFor("/api/security/tickets"))).rejects.toMatchObject({
      status: 429,
      code: "rate_limited",
      retryAfter: 12,
      message: "Too many attempts. Try again in 12 seconds.",
    });
    expect(tickets).toHaveLength(1);

    const missing = await api.statusPost(requestFor("/api/security/tickets/status", {}));
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ ok: false, error: "Missing ticket.", code: "missing_ticket" });
    await expect(api.securityTicketStatus(created.ticketId, "wrong-token")).rejects.toMatchObject({
      status: 404,
      message: "This ticket could not be found.",
    });
    await expect(api.securityTicketStatus("ZNS-26-999", created.resumeToken)).rejects.toMatchObject({
      status: 404,
      message: "This ticket could not be found.",
    });
  });

  test("payment verification binds one txid and preserves it when GitHub fails", async () => {
    const created = await api.createSecurityTicket(requestFor("/api/security/tickets"));
    const status = await api.securityTicketStatus(created.ticketId, created.resumeToken);
    expect(status.payment).toMatchObject({ address, amountZec: "0.01" });
    expect(JSON.stringify(status)).not.toContain(sentinel);

    await expect(api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, null)).rejects.toMatchObject({
      code: "payment_not_found",
      message: "No matching payment has been detected yet.",
    });
    pay(created.ticketId, 999_999);
    await expect(api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, null)).rejects.toMatchObject({
      code: "wrong_amount",
      message: "The payment amount is below the 0.01 ZEC submission fee.",
    });
    expect(tickets[0].status).toBe("awaiting_payment");

    ledger.length = 0;
    pay(created.ticketId, 2_000_000);
    await expect(api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, "not-a-txid")).rejects.toMatchObject({
      code: "invalid_txid",
    });
    expect(tickets[0].status).toBe("awaiting_payment");
    expect(await api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, null)).toMatchObject({
      status: "payment_verified",
    });
    expect(tickets[0].payment_amount_zats).toBe(2_000_000);
    expect(tickets[0].payment_txid).toBe(txid);

    const second = await api.createSecurityTicket(requestFor("/api/security/tickets"));
    pay(second.ticketId, 1_000_000, txid);
    await expect(api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), second.ticketId, second.resumeToken, null)).rejects.toMatchObject({
      code: "already_used",
      message: "That payment was already used for another ticket.",
    });
    expect(tickets[1].status).toBe("awaiting_payment");

    ledgerError = true;
    await expect(api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), second.ticketId, second.resumeToken, null)).rejects.toMatchObject({
      code: "payment_unavailable",
      status: 503,
    });

    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, report({ proofOfConcept: "" }))).rejects.toMatchObject({
      code: "invalid_report",
      message: "A proof of concept is required for critical and high findings.",
    });
    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, report({ severity: "nope" as ValidatedReport["severity"] }))).rejects.toMatchObject({
      code: "invalid_report",
    });
    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, report({ cwe: "CWE-X" }))).rejects.toMatchObject({
      code: "invalid_report",
    });
    expect(tickets[0].status).toBe("payment_verified");
    expect(postCount).toBe(0);

    mode = "create-fail";
    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, { ...report(), affectedCommit: "deadbeef" })).rejects.toMatchObject({
      status: 502,
      code: "github_unavailable",
      message: "We could not file the report. Your payment is saved. Submit again.",
    });
    expect(tickets[0].status).toBe("github_failed");
    expect(tickets[0].payment_txid).toBe(txid);
    expect(JSON.stringify(tickets[0].report_payload)).toContain(sentinel);
    expect(logs.join("\n")).not.toContain(sentinel);
    expect(logs.join("\n")).not.toContain(pem);
    const failedStatus = await api.securityTicketStatus(created.ticketId, created.resumeToken);
    expect(failedStatus.hasStoredReport).toBe(true);
    expect(JSON.stringify(failedStatus)).not.toContain(sentinel);
    expect(failedStatus).not.toHaveProperty("github_html_url");

    mode = "ok";
    const filed = await api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, { retryStored: true, proofOfConcept: "different" });
    expect(filed).toEqual({ ok: true, ticketId: created.ticketId, status: "submitted" });
    expect(JSON.stringify(filed)).not.toContain(sentinel);
    expect(JSON.stringify(filed)).not.toContain("github.com");
    expect(postCount).toBe(2);
    expect(tickets[0].status).toBe("submitted");
    expect(tickets[0].report_payload).toBeNull();
    expect(tickets[0].github_ghsa_id).toBe("GHSA-test-test-test");
    expect(tickets[0].github_html_url?.startsWith("https://github.com/")).toBe(true);
    expect(tickets[0].affected_commit).toBe(commit);
    expect(tickets[0].github_username).toBe("alice-dev");
    expect(tickets[0].payment_txid).toBe(txid);
    expect(reports[0]?.description).toContain(sentinel);
    expect(reports[0]?.summary?.startsWith(`[${created.ticketId}] `)).toBe(true);

    const duplicate = await api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, report());
    expect(duplicate).toEqual(filed);
    expect(postCount).toBe(2);

    const tokenCall = calls.find((entry) => entry.url.includes("/access_tokens"));
    const jwt = header(tokenCall?.init, "Authorization").replace("Bearer ", "");
    expect(jwt.includes(pem)).toBe(false);
    const [encodedHeader, encodedPayload, signature] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as { iss: string; iat: number; exp: number };
    expect(payload.iss).toBe("12345");
    expect(payload.exp - payload.iat).toBe(570);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    expect(verifier.verify(pem, Buffer.from(signature, "base64url"))).toBe(true);
    const tokenBody = JSON.parse(String(tokenCall?.init?.body)) as { repositories: string[]; permissions: { security_advisories: string } };
    expect(tokenBody.repositories).toEqual(["zns-mint"]);
    expect(tokenBody.permissions.security_advisories).toBe("write");
    const reportCall = calls.find((entry) => entry.url.endsWith("/security-advisories/reports"));
    expect(reportCall?.url).toBe("https://api.github.com/repos/znsme/zns-mint/security-advisories/reports");
    expect(header(reportCall?.init, "Authorization")).toBe("Bearer ghs_test_token");
    expect(header(reportCall?.init, "X-GitHub-Api-Version")).toBe("2026-03-10");
    expect(reportCall?.init?.redirect).toBe("manual");
    expect(JSON.parse(String(reportCall?.init?.body)).credits).toBeUndefined();
  });

  test("a lost GitHub save is retried once and a later retry does not create a second report", async () => {
    const created = await api.createSecurityTicket(requestFor("/api/security/tickets"));
    pay(created.ticketId);
    await api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, null);
    finishFailures = 2;
    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, report())).rejects.toMatchObject({
      code: "persistence",
      message: "We could not save this step. Your payment is kept. Try again.",
    });
    expect(postCount).toBe(1);
    expect(tickets[0].status).toBe("submitting");
    expect(tickets[0].payment_txid).toBe(txid);
    expect(JSON.stringify(tickets[0].report_payload)).toContain(sentinel);

    const filed = await api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, { retryStored: true });
    expect(filed.status).toBe("submitted");
    expect(postCount).toBe(1);
    expect(tickets[0].github_ghsa_id).toBe("GHSA-test-test-test");
    expect(tickets[0].report_payload).toBeNull();
  });

  test("GitHub auth and validation failures keep the payment and hide provider errors", async () => {
    const created = await api.createSecurityTicket(requestFor("/api/security/tickets"));
    pay(created.ticketId);
    await api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, null);
    mode = "auth-fail";
    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, report())).rejects.toMatchObject({
      code: "github_auth",
      message: "We could not file the report. Your payment is saved. Submit again.",
    });
    expect(tickets[0].payment_txid).toBe(txid);
    expect(tickets[0].status).toBe("github_failed");

    mode = "validation-fail";
    await expect(api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, { retryStored: true })).rejects.toMatchObject({
      code: "github_validation",
      message: "We could not file the report. Your payment is saved. Submit again.",
    });
    expect(logs.join("\n")).not.toContain(sentinel);

    process.env.SECURITY_COMP_END = "2026-02-01T00:00:00.000Z";
    const waiting = await expect(api.createSecurityTicket(requestFor("/api/security/tickets"))).rejects.toMatchObject({
      message: "The competition is closed.",
    });
    expect(waiting).toBeUndefined();
    expect(await api.verifySecurityPayment(requestFor("/api/security/tickets/verify"), created.ticketId, created.resumeToken, null)).toMatchObject({
      status: "github_failed",
    });
    mode = "ok";
    expect((await api.submitSecurityReport(requestFor("/api/security/report"), created.ticketId, created.resumeToken, { retryStored: true })).status).toBe("submitted");
  });

  test("route responses omit report contents when persistence throws", async () => {
    const created = await api.createSecurityTicket(requestFor("/api/security/tickets"));
    pay(created.ticketId, 1_000_000, otherTxid);
    const verified = await api.verifyPost(requestFor("/api/security/tickets/verify", {
      ticketId: created.ticketId,
      resumeToken: created.resumeToken,
    }));
    expect(verified.status).toBe(200);
    expect(await verified.json()).toEqual({ ok: true, ticketId: created.ticketId, status: "payment_verified" });
    explode = new Error(`SECRET ${sentinel}`);
    const failed = await api.reportPost(requestFor("/api/security/report", {
      ticketId: created.ticketId,
      resumeToken: created.resumeToken,
      ...report(),
    }));
    const body = await failed.text();
    expect(failed.status).toBe(500);
    expect(body).toContain("Something went wrong. Try again.");
    expect(body).not.toContain(sentinel);
    expect(body).not.toContain("SECRET");
    expect(logs.join("\n")).not.toContain(sentinel);
    expect(logs.join("\n")).toContain("Error");
  });

  function securityPageClosed(phase: "before" | "after"): unknown {
    return api.securityPageModel(api.getSecurityConfig()).closedMessage && phase ? api.securityPageModel(api.getSecurityConfig()).closedMessage : null;
  }
});

test("PostgreSQL tickets allocate ids, verify payments once, and keep reports for a GitHub retry", async () => {
  test.setTimeout(120_000);
  const pg = new PGlite();
  const resumeHash = createHash("sha256").update("resume").digest("hex");
  const ipHash = createHmac("sha256", "security-test-secret").update("security-ip:unknown").digest("hex");
  try {
    await pg.exec("create role anon; create role authenticated; create role service_role;");
    await pg.exec(readFileSync("sql/2026-10-02-security-competition.sql", "utf8"));
    await pg.exec(readFileSync("sql/2026-10-02-security-competition.sql", "utf8"));
    await pg.exec(`create table public.zn_security_comp (
      recipient_address text, txid text, pool text, amount_zats bigint, is_outgoing boolean,
      status text, memo text, blockheight integer, detected_at timestamptz
    );`);
    const attempts = await Promise.all(Array.from({ length: 4 }, () => pg.query<{ result: { allowed: boolean; retry_after: number } }>(
      "select consume_security_comp_limits($1::jsonb) as result",
      [JSON.stringify([{ key: "ab".repeat(32), limit: 2, seconds: 3600 }])],
    )));
    expect(attempts.filter((entry) => entry.rows[0].result.allowed)).toHaveLength(2);
    expect(attempts[3].rows[0].result.retry_after).toBeGreaterThan(0);
    await expect(pg.query("select consume_security_comp_limits($1::jsonb)", [JSON.stringify([{ key: "nope", limit: 1, seconds: 60 }])])).rejects.toThrow("Invalid rate-limit bucket");

    expect((await pg.query<{ result: string | null }>("select zn_security_comp_memo_ticket($1) as result", ["ZNS:SECURITY|ticket::ZNS-26-042"])).rows[0].result).toBe("ZNS-26-042");
    expect((await pg.query<{ result: string | null }>("select zn_security_comp_memo_ticket($1) as result", ["ZNS:SECURITY|ticket::ZNS-26-0420"])).rows[0].result).toBe("ZNS-26-0420");
    expect((await pg.query<{ result: string | null }>("select zn_security_comp_memo_ticket('ZNS:SECURITY|ticket::ZNS-26-042') as result")).rows[0].result).toBe("ZNS-26-042");

    const first = await pg.query<{ result: string }>("select create_zn_security_comp_ticket($1,$2,$3) as result", [resumeHash, ipHash, 2026]);
    expect(first.rows[0].result).toBe("ZNS-26-001");
    await pg.exec("update public.zn_security_comp_counters set last_number = 999 where year = 2026");
    const wide = await pg.query<{ result: string }>("select create_zn_security_comp_ticket($1,$2,$3) as result", [randomBytes(32).toString("hex"), ipHash, 2026]);
    expect(wide.rows[0].result).toBe("ZNS-26-1000");
    const ticketId = first.rows[0].result;
    const secondId = wide.rows[0].result;

    await expect(pg.query("select verify_zn_security_comp_payment($1,$2,$3,$4,$5)", [ticketId, txid, 1_000_000, address, "missing_ledger"])).resolves.toBeTruthy();
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [ticketId, txid, 1_000_000, address, "missing_ledger"])).rows[0].result).toBe("unavailable");
    await pg.query(
      "insert into public.zn_security_comp values ($1,$2,'orchard',999999,false,'confirmed',$3,1,now())",
      [address, txid, `ZNS:SECURITY|ticket::${ticketId}`],
    );
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [ticketId, txid, 1_000_000, address, "zn_security_comp"])).rows[0].result).toBe("wrong_amount");
    await pg.query("update public.zn_security_comp set amount_zats = 2000000, is_outgoing = true");
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [ticketId, txid, 1_000_000, address, "zn_security_comp"])).rows[0].result).toBe("not_found");
    await pg.query("update public.zn_security_comp set is_outgoing = false, memo = $1", [`ZNS:SECURITY|ticket::${secondId}`]);
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [ticketId, txid, 1_000_000, address, "zn_security_comp"])).rows[0].result).toBe("not_found");
    await pg.query("update public.zn_security_comp set memo = $1", [`ZNS:SECURITY|ticket::${ticketId}`]);
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [ticketId, "zz", 1_000_000, address, "zn_security_comp"])).rows[0].result).toBe("invalid");
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [ticketId, txid, 1_000_000, address, "zn_security_comp"])).rows[0].result).toBe("verified");
    const paid = await pg.query<{ payment_amount_zats: string; status: string }>("select payment_amount_zats, status from public.zn_security_comp_tickets where ticket_id = $1", [ticketId]);
    expect(paid.rows[0].status).toBe("payment_verified");
    expect(Number(paid.rows[0].payment_amount_zats)).toBe(2_000_000);
    await pg.query(
      "insert into public.zn_security_comp values ($1,$2,'orchard',1000000,false,'confirmed',$3,2,now())",
      [address, txid, `ZNS:SECURITY|ticket::${secondId}`],
    );
    expect((await pg.query<{ result: string }>("select verify_zn_security_comp_payment($1,$2,$3,$4,$5) as result", [secondId, txid, 1_000_000, address, "zn_security_comp"])).rows[0].result).toBe("already_used");

    const payload = JSON.stringify({ report: report(), affectedCommit: commit });
    expect((await pg.query<{ result: string }>("select begin_zn_security_comp_submit($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [secondId, "alice", "alice-dev", address, "critical", commit, "src/capsule.rs", payload])).rows[0].result).toBe("payment_required");
    expect((await pg.query<{ result: string }>("select begin_zn_security_comp_submit($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [ticketId, "alice", "@alice", address, "critical", commit, "src/capsule.rs", payload])).rows[0].result).toBe("started");
    expect((await pg.query<{ result: string }>("select begin_zn_security_comp_submit($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [ticketId, "alice", "alice-dev", address, "critical", commit, "src/capsule.rs", payload])).rows[0].result).toBe("in_progress");
    await pg.exec("update public.zn_security_comp_tickets set github_attempt_started_at = now() - interval '46 seconds' where ticket_id = 'ZNS-26-001'");
    expect((await pg.query<{ result: string }>("select begin_zn_security_comp_submit($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [ticketId, "alice", "alice-dev", address, "critical", commit, "src/capsule.rs", payload])).rows[0].result).toBe("started");
    expect((await pg.query<{ result: string }>("select finish_zn_security_comp_submit($1,$2,$3,$4) as result", [ticketId, false, "", null])).rows[0].result).toBe("saved");
    const failed = await pg.query<{ status: string; report_payload: unknown; payment_txid: string }>("select status, report_payload, payment_txid from public.zn_security_comp_tickets where ticket_id = $1", [ticketId]);
    expect(failed.rows[0].status).toBe("github_failed");
    expect(JSON.stringify(failed.rows[0].report_payload)).toContain(sentinel);
    expect(failed.rows[0].payment_txid).toBe(txid);
    expect((await pg.query<{ result: string }>("select begin_zn_security_comp_submit($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [ticketId, "alice", "alice-dev", address, "critical", commit, "src/capsule.rs", payload])).rows[0].result).toBe("started");
    expect((await pg.query<{ result: string }>("select finish_zn_security_comp_submit($1,$2,$3,$4) as result", [ticketId, true, "bad id", "https://github.com/znsme/zns-mint/security/advisories/x"])).rows[0].result).toBe("invalid");
    expect((await pg.query<{ result: string }>("select finish_zn_security_comp_submit($1,$2,$3,$4) as result", [ticketId, true, "GHSA-test-test-test", "http://example.test/private"])).rows[0].result).toBe("saved");
    const saved = await pg.query<{ status: string; report_payload: unknown; github_ghsa_id: string; github_html_url: string | null }>("select status, report_payload, github_ghsa_id, github_html_url from public.zn_security_comp_tickets where ticket_id = $1", [ticketId]);
    expect(saved.rows[0]).toMatchObject({ status: "submitted", report_payload: null, github_ghsa_id: "GHSA-test-test-test", github_html_url: null });
    expect((await pg.query<{ result: string }>("select begin_zn_security_comp_submit($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [ticketId, "alice", "alice-dev", address, "critical", commit, "src/capsule.rs", payload])).rows[0].result).toBe("submitted");

    await pg.exec("set role anon");
    await expect(pg.query("select * from public.zn_security_comp_tickets")).rejects.toThrow("permission denied");
    await expect(pg.query("select create_zn_security_comp_ticket($1,$2,$3)", [resumeHash, ipHash, 2026])).rejects.toThrow("permission denied");
  } finally {
    await pg.close();
  }
});
