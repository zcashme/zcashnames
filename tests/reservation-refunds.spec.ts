import { expect, test } from "@playwright/test";
import { bech32m } from "bech32";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { assessReservationPayment, buildReservationRefundPayment, normalizeRefundTxid, reservationMemoFailures, refundAmountZats, zatsToZec, memoReferencesRefund, type ReservationPayment } from "../lib/waitlist/reservation-refund-validation";
import { readRefundCheckResponse } from "../lib/waitlist/refund-check-response";
import { rebateUnifiedAddressError } from "../lib/waitlist/rebate-address";
import { getAnimatedEllipsis } from "../components/ui/AnimatedLoadingLabel";

const uuid = "12345678-1234-1234-1234-123456789abc";
const otherUuid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const txid = "ab".repeat(32);
const memo = `ZNS:RESERVE|Name::alice|UUID::${uuid}`;
const address = bech32m.encode("u", new Array(100).fill(1), 300);
const payment: ReservationPayment = { txid, recipient_address: address, amount_zats: 500000, memo, status: "confirmed", pool: "orchard", detected_at: "2026-09-07T00:00:00Z", blockheight: 1 };

test("loading ellipsis repeats one, two, and three dots", () => {
  expect([0, 400, 800, 1200].map(time => getAnimatedEllipsis(time))).toEqual([".", "..", "...", "."]);
});

test("amount threshold, unusable amounts and multiple failures", () => {
  for (const amount of [500000, 500001, 900000]) expect(assessReservationPayment({ ...payment, amount_zats: amount }, "alice", uuid).failures).toEqual([]);
  expect(assessReservationPayment({ ...payment, amount_zats: 499999, memo: null }, "alice", uuid).failures.map(f => f.code)).toEqual(["insufficient_amount", "missing_memo"]);
  for (const amount of [null, "", "1.5", -1, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(refundAmountZats(amount)).toBeNull();
  expect(refundAmountZats(0)).toBe(0);
  expect(zatsToZec(499999)).toBe("0.00499999");
});

test("missing, malformed, duplicate and mismatched memo fields", () => {
  for (const text of [null, "", "  ", "\0\0"]) expect(reservationMemoFailures(text, "alice", uuid)[0].code).toBe("missing_memo");
  for (const text of ["hello", "Name::alice", `Name::alice|UUID::bad`, `${memo}|Name::alice`, `${memo}|unexpected::x`]) expect(reservationMemoFailures(text, "alice", uuid)[0].code).toBe("invalid_memo");
  expect(reservationMemoFailures(`ZNS:RESERVE|Name::bob|UUID::${otherUuid}`, "alice", uuid).map(f => f.code)).toEqual(["name_mismatch", "uuid_mismatch"]);
  expect(reservationMemoFailures(memo + "\0", "alice", uuid)).toEqual([]);
  expect(reservationMemoFailures(memo.slice(12), "alice", uuid)).toEqual([]);
});

test("txid and Unified Address validation", () => {
  expect(normalizeRefundTxid(` ${txid.toUpperCase()} `)).toBe(txid);
  for (const value of ["ab", "z".repeat(64), null]) expect(normalizeRefundTxid(value)).toBeNull();
  expect(rebateUnifiedAddressError(address, address)).toBeNull();
  for (const value of ["", "t1invalid", address.slice(0, -1) + "x", "u1" + address.slice(2).toUpperCase(), bech32m.encode("utest", new Array(100).fill(1), 300)]) expect(rebateUnifiedAddressError(value, address)).not.toBeNull();
});

test("refund memo references require a complete ID and support historical text", () => {
  for (const value of [`refund ${txid}`, `Previously paid (TXID: ${txid.toUpperCase()}).`, `${txid}\0\0`]) expect(memoReferencesRefund(value, txid)).toBe(true);
  for (const value of [null, "", txid.slice(0, 63), `a${txid}`, `${txid}0`, "cd".repeat(32)]) expect(memoReferencesRefund(value, txid)).toBe(false);
});

test("stream parser handles split UTF-8 chunks, actual steps and interrupted checks", async () => {
  const events = [{ type: "progress", step: "reservation" }, { type: "progress", step: "payment" }, { type: "progress", step: "validation" }, { type: "progress", step: "refunds" }, { type: "result", ok: true, state: "already_refunded", message: "Refund sent…" }];
  const bytes = new TextEncoder().encode(events.map(e => JSON.stringify(e)).join("\n") + "\n");
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } });
  const steps: string[] = [];
  expect((await readRefundCheckResponse(new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } }), s => steps.push(s))).message).toBe("Refund sent…");
  expect(steps).toEqual(["reservation", "payment", "validation", "refunds"]);
  await expect(readRefundCheckResponse(new Response('{"type":"progress","step":"payment"}\n', { headers: { "Content-Type": "application/x-ndjson" } }), () => {})).rejects.toThrow("interrupted");
  await expect(readRefundCheckResponse(Response.json({ ok: false, error: "Slow down", retryAfter: 30 }, { status: 429 }), () => {})).rejects.toMatchObject({ retryAfter: 30 });
});

test("refund PNG decodes to exactly the URI and plain-text payment components", async () => {
  const failures = assessReservationPayment({ ...payment, amount_zats: 499999, memo: `Name::bob|UUID::${otherUuid}` }, "alice", uuid).failures;
  const refund = buildReservationRefundPayment(address, 499999, txid, failures);
  expect(refund.memo).toBe(`Here is a refund for the reservation you attempted (txid: ${txid}). It failed because ${failures.map(f => f.message).join("; ")}. You are welcome to try again. Cheers! Zechariah`);
  expect(new TextEncoder().encode(refund.memo).length).toBeLessThanOrEqual(512);
  const png = PNG.sync.read(await QRCode.toBuffer(refund.uri, { width: 1000, margin: 4, errorCorrectionLevel: "M" }));
  expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(refund.uri);
  const parsed = new URL(refund.uri);
  expect(parsed.pathname).toBe(address);
  expect(parsed.searchParams.get("amount")).toBe(refund.amount);
  expect(Buffer.from(parsed.searchParams.get("memo")!, "base64url").toString("utf8")).toBe(refund.memo);
  expect(() => buildReservationRefundPayment(address, 1, txid, [{ code: "test", message: "x".repeat(600) }])).toThrow("512");
});

test("support email contains the actual scannable refund and escaped review details", async () => {
  const Module = require("node:module");
  const originalLoad = Module._load;
  let email: any;
  let options: any;
  Module._load = function (id: string, ...args: any[]) {
    if (id === "server-only") return {};
    if (id === "@/lib/email/client") return { sendEmail: async (params: any, opts: any) => { email = params; options = opts; return { data: { id: "test" }, error: null }; } };
    return originalLoad.call(this, id, ...args);
  };
  try {
    const { sendReservationRefundEmail } = require("../lib/email/reservation-refund");
    const failures = [{ code: "missing_memo", message: "the payment had no memo" }];
    await sendReservationRefundEmail({ id: "test-request", txid, waitlist_uuid: uuid, name: "alice<script>", email: "alice@example.com", refund_address: address, amount_zats: 500000, observed_memo: null, expected_memo: memo, failure_reasons: failures, transaction_status: "confirmed", payment_snapshot: payment }, 1);
    expect(email.to).toBe("support@zcashnames.com");
    expect(email.html).toContain("alice&lt;script&gt;");
    expect(email.html).toContain("other refund requests");
    expect(email.text).toContain("alice@example.com");
    expect(options.idempotencyKey).toBe("reservation-refund/test-request");
    expect(email.attachments[0].contentId).toBe("reservation-refund-qr");
    const png = PNG.sync.read(email.attachments[0].content);
    const expected = buildReservationRefundPayment(address, 500000, txid, failures);
    expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(expected.uri);
    expect(email.text).toContain(`Refund memo: ${expected.memo}`);
    expect(email.text).toContain(`ZIP 321 URI: ${expected.uri}`);
  } finally { Module._load = originalLoad; }
});

// Exercise server authorization, storage and retry behavior against a deterministic database.
test("server checks authorize first, select payments, revalidate and save idempotently", async () => {
  const Module = require("node:module");
  const originalLoad = Module._load;
  const records: Record<string, any[]> = { zn_waitlist_reserves_transactions: [{ ...payment, memo: null, is_outgoing: false }], zn_waitlist_reservation_refund_requests: [] };
  let failEmail = true;
  let emailCalls = 0;
  let databaseFailure = false;
  let refundAfterClaim = false;
  let rateError: Error | null = null;
  const rateCalls: any[] = [];
  const notices: any[] = [];
  const fakeDb = { from(table: string) {
    let action = "select"; let input: any; let head = false; let singular = false; let start = 0; let end = Infinity;
    const filters: ((row: any) => boolean)[] = [];
    const query: any = {
      select(_fields?: string, options?: any) { head = options?.head ?? false; return query; },
      eq(k: string, v: any) { filters.push(r => r[k] === v); return query; },
      neq(k: string, v: any) { filters.push(r => r[k] !== v); return query; },
      ilike(k: string, v: string) { filters.push(r => typeof r[k] === "string" && (v.startsWith("%") ? r[k].toLowerCase().includes(v.slice(1, -1).toLowerCase()) : r[k].toLowerCase() === v.toLowerCase())); return query; },
      in(k: string, v: any[]) { filters.push(r => v.includes(r[k])); return query; },
      gt(k: string, v: number) { filters.push(r => Number(r[k]) > v); return query; },
      order() { return query; },
      range(a: number, b: number) { start = a; end = b + 1; return query; },
      limit(n: number) { end = n; return query; },
      or(filter: string) {
        filters.push(filter.startsWith("status.in") ? r => ["approved", "refunded"].includes(r.status) || r.refund_txid != null || r.completed_at != null :
          r => ["pending", "failed"].includes(r.notification_status) && (!r.notification_attempted_at || Date.parse(r.notification_attempted_at) <= Date.now() - 60000));
        return query;
      },
      update(v: any) { action = "update"; input = v; return query; },
      insert(v: any) { action = "insert"; input = v; return query; },
      maybeSingle() { singular = true; return query; }, single() { singular = true; return query; },
      then(resolve: any, reject: any) {
        if (databaseFailure) return Promise.resolve({ data: null, error: { message: "offline" } }).then(resolve, reject);
        let rows = records[table].filter(r => filters.every(f => f(r))).slice(start, end);
        if (action === "insert") {
          if (records[table].some(r => r.txid === input.txid && r.waitlist_uuid === input.waitlist_uuid)) return Promise.resolve({ data: null, error: { code: "23505" } }).then(resolve, reject);
          const row = { ...input, id: "request-1", status: "pending", notification_status: "pending" };
          records[table].push(row); rows = [row];
        }
        if (action === "update") {
          rows.forEach(r => Object.assign(r, input));
          if (refundAfterClaim && input.notification_status === "sending") {
            refundAfterClaim = false;
            records.zn_waitlist_reserves_transactions.push({ ...payment, txid: "ff".repeat(32), memo: `Refund for ${txid}`, is_outgoing: true });
          }
        }
        const copies = rows.map(r => ({ ...r }));
        return Promise.resolve({ data: head ? null : singular ? copies[0] ?? null : copies, error: null, count: rows.length }).then(resolve, reject);
      },
    }; return query;
  } };
  Module._load = function (id: string, ...args: any[]) {
    if (id === "server-only") return {};
    if (id === "@/lib/db") return { db: fakeDb };
    if (id.endsWith("/refund-abuse")) return {
      enforceRefundRateLimits: async (rules: any) => { rateCalls.push(...rules); if (rateError) throw rateError; },
      refundClientIp: () => "127.0.0.1",
      consumeRefundCaptcha: async (_context: any, token: any) => { if (token !== "valid-captcha") throw new Error("Complete a human check"); },
      issueRefundCaptcha: async () => ({ token: "valid-captcha", image: "fixture" }),
    };
    if (id === "@/lib/campaigns/waitlist-confirm-response") return { parseWaitlistVerifyToken: (token: string) => token === "valid" ? { normalizedEmail: "alice@example.com" } : null, getWaitlistReservePaymentAddress: () => address };
    if (id === "@/lib/campaigns/waitlist-verify") return { findWaitlistRowsByNormalizedEmail: async () => [{ id: uuid, name: "alice", email: "alice@example.com" }], buildWaitlistVerifyMemo: () => memo };
    if (id === "@/lib/email/reservation-refund") return { sendReservationRefundEmail: async (notice: any, count: number) => { emailCalls++; notices.push({ notice, count }); if (failEmail) throw new Error("mail offline"); } };
    return originalLoad.call(this, id, ...args);
  };
  try {
    const { checkReservationRefund: check, submitReservationRefund: submit, findPreviousReservationRefund: previous } = require("../lib/waitlist/reservation-refunds");
    const payload = { token: "valid", rowId: uuid, txid, refundAddress: address, captcha_token: "valid-captcha", captcha_answer: "test" };
    await expect(check({ ...payload, token: "bad" })).rejects.toMatchObject({ status: 401 });
    await expect(check({ ...payload, rowId: otherUuid })).rejects.toMatchObject({ status: 403 });
    await expect(check({ ...payload, txid: "bad" })).rejects.toThrow("64 hexadecimal");
    expect((await check({ ...payload, txid: "cd".repeat(32) })).result.state).toBe("not_found");
    await expect(submit({ ...payload, txid: "cd".repeat(32) })).rejects.toThrow("not been detected");
    records.zn_waitlist_reserves_transactions.push({ ...payment, memo: null, amount_zats: 400000, is_outgoing: false });
    const selection = await check(payload);
    expect(selection.result.state).toBe("select_payment");
    await expect(submit(payload)).rejects.toThrow("not eligible");
    const selected = { ...payload, paymentKey: selection.result.payments[0].key };
    expect((await check(selected)).result.state).toBe("unsuccessful");
    await expect(submit({ ...selected, refundAddress: "bad" })).rejects.toThrow();
    records.zn_waitlist_reserves_transactions[0].memo = memo;
    await expect(submit(selected)).rejects.toThrow("selected payment changed");
    records.zn_waitlist_reserves_transactions[0].memo = null;
    databaseFailure = true;
    await expect(check(selected)).rejects.toThrow("look up");
    databaseFailure = false;
    const first = await submit(selected);
    expect(first.notified).toBe(false);
    expect(records.zn_waitlist_reservation_refund_requests).toHaveLength(1);
    failEmail = false;
    await expect(submit(selected)).rejects.toMatchObject({ status: 429 });
    records.zn_waitlist_reservation_refund_requests[0].notification_attempted_at = new Date(Date.now() - 61000).toISOString();
    const retry = await submit(selected);
    expect(retry.notified).toBe(true);
    expect(retry.requestId).toBe(first.requestId);
    expect((await submit(selected)).notified).toBe(true);
    expect(emailCalls).toBe(2);
    expect(notices[1].notice.amount_zats).toBe(500000);
    expect(notices[1].notice.email).toBe("alice@example.com");
    expect(records.zn_waitlist_reservation_refund_requests).toHaveLength(1);
    records.zn_waitlist_reserves_transactions = [{ ...payment, is_outgoing: false }];
    expect((await check(payload)).result.state).toBe("qualifying");
    records.zn_waitlist_reserves_transactions = [{ ...payment, amount_zats: 0, is_outgoing: false }];
    expect((await check(payload)).result.state).toBe("unavailable");
    records.zn_waitlist_reserves_transactions = [{ ...payment, memo: null, is_outgoing: true }];
    expect((await check(payload)).result.state).toBe("not_found");
    records.zn_waitlist_reserves_transactions = [{ ...payment, memo: null, is_outgoing: false, recipient_address: "another-address" }];
    expect((await check(payload)).result.state).toBe("not_found");
    records.zn_waitlist_reserves_transactions = [{ ...payment, memo: null, is_outgoing: false }];
    records.zn_waitlist_reservation_refund_requests = [{ id: "other-request", txid, waitlist_uuid: otherUuid }];
    const before = emailCalls;
    await Promise.allSettled([submit(payload), submit(payload)]);
    expect(records.zn_waitlist_reservation_refund_requests).toHaveLength(2);
    expect(emailCalls).toBe(before + 1);
    expect(notices[notices.length - 1].count).toBe(1);
    const { POST: checkRoute } = require("../app/api/waitlist/reservation-refund/check/route");
    const badRequest = await checkRoute(new Request("http://localhost/api/waitlist/reservation-refund/check", { method: "POST", body: "invalid JSON" }));
    expect(badRequest.status).toBe(400);
    const unauthorized = await checkRoute(new Request("http://localhost/api/waitlist/reservation-refund/check", { method: "POST", body: JSON.stringify({ ...payload, token: "bad" }) }));
    expect(unauthorized.status).toBe(401);
    const streamResponse = await checkRoute(new Request("http://localhost/check", { method: "POST", headers: { Accept: "application/x-ndjson" }, body: JSON.stringify(payload) }));
    const streamed = (await streamResponse.text()).trim().split("\n").map((line: string) => JSON.parse(line));
    expect(streamed.filter((e: any) => e.type === "progress").map((e: any) => e.step)).toEqual(["reservation", "payment", "validation", "refunds"]);
    expect(streamed.at(-1).type).toBe("result");
    expect(rateCalls).toContainEqual({ scope: "new:email", identity: "alice@example.com", seconds: 3600, limit: 3 });
    const { RefundInputError } = require("../lib/waitlist/refund-errors");
    rateError = new RefundInputError("Too many attempts", 429, 45);
    const limited = await checkRoute(new Request("http://localhost/check", { method: "POST", body: JSON.stringify(payload) }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("45");
    rateError = new RefundInputError("Protection unavailable", 503);
    expect((await checkRoute(new Request("http://localhost/check", { method: "POST", body: JSON.stringify(payload) }))).status).toBe(503);
    rateError = null;

    // More than one page of substring matches must not conceal an older real refund.
    records.zn_waitlist_reserves_transactions = Array.from({ length: 200 }, (_, i) => ({ ...payment, txid: i.toString(16).padStart(64, "0"), memo: `a${txid}a`, is_outgoing: true }));
    records.zn_waitlist_reserves_transactions.push({ ...payment, txid: "ff".repeat(32), recipient_address: "different-refund-recipient", memo: `Historical refund: ${txid.toUpperCase()}`, is_outgoing: true });
    expect((await previous(txid)).state).toBe("already_refunded");
    expect(records.zn_waitlist_reservation_refund_requests[0].detected_refund_txid).toBe("ff".repeat(32));
    expect((await submit(payload)).state).toBe("already_refunded");
    records.zn_waitlist_reserves_transactions = [{ ...payment, txid: "ff".repeat(32), memo: `Refund for ${txid}`, is_outgoing: true, status: "mempool" }];
    expect((await previous(txid)).message).toContain("Confirmation is pending");
    records.zn_waitlist_reserves_transactions[0].status = "failed";
    expect(await previous(txid)).toBeNull();
    records.zn_waitlist_reservation_refund_requests[0].status = "approved";
    expect((await previous(txid)).refundStatus).toBe("approved");

    records.zn_waitlist_reservation_refund_requests = [];
    records.zn_waitlist_reserves_transactions = [{ ...payment, memo: null, is_outgoing: false }];
    await expect(submit({ ...payload, captcha_token: undefined })).rejects.toThrow("human check");
    refundAfterClaim = true;
    const beforeRace = emailCalls;
    expect((await submit(payload)).state).toBe("already_refunded");
    expect(emailCalls).toBe(beforeRace);
  } finally { Module._load = originalLoad; }
});

test("PostgreSQL migrations enforce atomic limits, one-use CAPTCHA and original-transaction approval guards", async () => {
  test.setTimeout(120000);
  const pg = new PGlite();
  const Module = require("node:module");
  const originalLoad = Module._load;
  const oldSecret = process.env.WAITLIST_CAPTCHA_SECRET;
  const oldRateSecret = process.env.CAPTCHA_SECRET;
  process.env.WAITLIST_CAPTCHA_SECRET = "refund-test-secret";
  process.env.CAPTCHA_SECRET = "refund-test-secret";
  try {
    await pg.exec(`create role anon; create role authenticated; create role service_role;
      create table zn_waitlist (id uuid primary key, name text, email text);
      create table zn_waitlist_reserves_transactions (recipient_address text, txid text, pool text, amount_zats bigint, is_outgoing boolean, status text, memo text, blockheight integer, detected_at timestamptz);
      insert into zn_waitlist values ('${uuid}', 'alice', 'alice@example.com'), ('${otherUuid}', 'bob', 'bob@example.com');`);
    await pg.exec(readFileSync("sql/2026-09-07-reservation-refund-requests.sql", "utf8"));
    await pg.exec(readFileSync("sql/2026-09-07-reservation-refund-abuse-controls.sql", "utf8"));
    // Reapplying the abuse migration is safe.
    await pg.exec(readFileSync("sql/2026-09-07-reservation-refund-abuse-controls.sql", "utf8"));
    const policy = JSON.stringify([{ key: "a".repeat(64), limit: 3, seconds: 3600 }]);
    const attempts = await Promise.all(Array.from({ length: 8 }, () => pg.query<any>("select consume_reservation_refund_limits($1::jsonb) as result", [policy])));
    expect(attempts.filter(r => r.rows[0].result.allowed)).toHaveLength(3);
    expect(attempts[7].rows[0].result.retry_after).toBeGreaterThan(0);

    let nonce = 0;
    const fakeDb = {
      from(table: string) { return { async insert(row: any) {
        expect(table).toBe("zn_waitlist_refund_captcha_challenges");
        await pg.query("insert into zn_waitlist_refund_captcha_challenges(token_hash,context_hash,expires_at) values ($1,$2,$3)", [row.token_hash, row.context_hash, row.expires_at]);
        return { error: null };
      } }; },
      async rpc(name: string, args: any) {
        if (name === "consume_reservation_refund_captcha") {
          const data = await pg.query<any>("select consume_reservation_refund_captcha($1,$2) as result", [args.p_token_hash, args.p_context_hash]);
          return { data: data.rows[0].result, error: null };
        }
        const data = await pg.query<any>("select consume_reservation_refund_limits($1::jsonb) as result", [JSON.stringify(args.p_buckets)]);
        return { data: data.rows[0].result, error: null };
      },
    };
    Module._load = function (id: string, ...args: any[]) {
      if (id === "server-only") return {};
      if (id === "@/lib/db") return { db: fakeDb };
      if (id === "@/lib/captcha/svg-captcha") {
        const real = originalLoad.call(this, id, ...args);
        return { ...real, createSvgCaptchaChallenge: () => {
          const expires = Date.now() + 300000; const n = `nonce-${++nonce}`;
          const mac = createHmac("sha256", "refund-test-secret").update(`${expires}:${n}:answer`).digest("hex");
          return { token: `${expires}.${n}.${mac}`, image: "fixture" };
        } };
      }
      return originalLoad.call(this, id, ...args);
    };
    delete require.cache[require.resolve("../lib/waitlist/refund-abuse")];
    const abuse = require("../lib/waitlist/refund-abuse");
    const context = { rowId: uuid, txid, paymentKey: "selected-payment", refundAddress: address };
    const challenge = await abuse.issueRefundCaptcha(context);
    await expect(abuse.consumeRefundCaptcha(context, challenge.token, "wrong")).rejects.toThrow("human check");
    for (const changed of [{ rowId: otherUuid }, { txid: "cd".repeat(32) }, { refundAddress: address + "x" }, { paymentKey: "another-payment" }]) {
      await expect(abuse.consumeRefundCaptcha({ ...context, ...changed }, challenge.token, "answer")).rejects.toThrow("different refund details");
    }
    const consumes = await Promise.allSettled([abuse.consumeRefundCaptcha(context, challenge.token, "answer"), abuse.consumeRefundCaptcha(context, challenge.token, "answer")]);
    expect(consumes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const expired = await abuse.issueRefundCaptcha(context);
    await pg.exec("update zn_waitlist_refund_captcha_challenges set expires_at = now() - interval '1 second'");
    await expect(abuse.consumeRefundCaptcha(context, expired.token, "answer")).rejects.toThrow("expired");
    await abuse.enforceRefundRateLimits([{ scope: "test", identity: "person@example.com", seconds: 3600, limit: 1 }]);
    await expect(abuse.enforceRefundRateLimits([{ scope: "test", identity: "person@example.com", seconds: 3600, limit: 1 }])).rejects.toMatchObject({ status: 429 });
    const rows = await pg.query<any>("select bucket_key from zn_waitlist_refund_rate_limits");
    expect(rows.rows.every(r => /^[a-f0-9]{64}$/.test(r.bucket_key))).toBe(true);

    await pg.query("insert into zn_waitlist_reserves_transactions values ($1,$2,'orchard',500000,false,'mempool',null,1,now())", [address, txid]);
    const insertRequest = async (id: string, owner: string) => pg.query(`insert into zn_waitlist_reservation_refund_requests
      (id,txid,waitlist_uuid,payment_key,name,email,refund_address,amount_zats,observed_memo,expected_memo,failure_reasons,payment_snapshot)
      values ($1,$2,$3,$4,'alice','alice@example.com',$5,500000,null,$6,'[]',$7::jsonb)`, [id, txid, owner, owner, address, memo, JSON.stringify({ ...payment, memo: null })]);
    const firstId = "11111111-1111-1111-1111-111111111111";
    const secondId = "22222222-2222-2222-2222-222222222222";
    await insertRequest(firstId, uuid); await insertRequest(secondId, otherUuid);
    await expect(pg.query("update zn_waitlist_reservation_refund_requests set status='approved' where id=$1", [firstId])).rejects.toThrow("confirmed");
    await pg.exec("update zn_waitlist_reserves_transactions set status='confirmed'");
    const approvals = await Promise.allSettled([firstId, secondId].map(id => pg.query("update zn_waitlist_reservation_refund_requests set status='approved' where id=$1", [id])));
    expect(approvals.filter(r => r.status === "fulfilled")).toHaveLength(1);
    await pg.exec("update zn_waitlist_reservation_refund_requests set status='pending'");
    await pg.query("insert into zn_waitlist_reserves_transactions values ('another-recipient',$1,'orchard',500000,true,'mempool',$2,2,now())", ["ff".repeat(32), `Legacy refund for ${txid.toUpperCase()}`]);
    await expect(pg.query("update zn_waitlist_reservation_refund_requests set status='approved' where id=$1", [firstId])).rejects.toThrow("already been sent");
    await pg.exec("update zn_waitlist_reserves_transactions set status='failed' where is_outgoing");
    await pg.query("update zn_waitlist_reservation_refund_requests set status='approved' where id=$1", [firstId]);
    await pg.query("update zn_waitlist_reservation_refund_requests set status='refunded',refund_txid=$1,completed_at=now() where id=$2", ["ff".repeat(32), firstId]);
    await expect(pg.query("update zn_waitlist_reservation_refund_requests set status='approved' where id=$1", [secondId])).rejects.toThrow("duplicate key");
    await expect(pg.query("update zn_waitlist_reservation_refund_requests set status='pending',refund_txid=null,completed_at=null where id=$1", [firstId])).rejects.toThrow("cannot be reopened");
    await pg.exec("set role anon");
    await expect(pg.query("select consume_reservation_refund_limits($1::jsonb)", [policy])).rejects.toThrow("permission denied");
    await expect(pg.query("select * from zn_waitlist_refund_captcha_challenges")).rejects.toThrow("permission denied");
  } finally {
    Module._load = originalLoad;
    if (oldSecret === undefined) delete process.env.WAITLIST_CAPTCHA_SECRET; else process.env.WAITLIST_CAPTCHA_SECRET = oldSecret;
    if (oldRateSecret === undefined) delete process.env.CAPTCHA_SECRET; else process.env.CAPTCHA_SECRET = oldRateSecret;
    await pg.close();
  }
});
