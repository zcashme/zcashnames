import "server-only";
import { NextResponse } from "next/server";
import { parseWaitlistVerifyToken } from "@/lib/campaigns/waitlist-confirm-response";
import { enforceRefundRateLimits, refundClientIp } from "./refund-abuse";
import { RefundInputError } from "./refund-errors";
import type { RefundPayload } from "./reservation-refunds";
import type { RefundCheckProgress } from "./reservation-refund-validation";

export async function refundRoute(request: Request, action: "check" | "submit" | "captcha", run: (payload: RefundPayload, progress?: RefundCheckProgress) => Promise<object>) {
  try {
    await enforceRefundRateLimits([{ scope: `${action}:ip`, identity: refundClientIp(request), seconds: 60, limit: action === "check" ? 60 : action === "captcha" ? 20 : 30 }]);
    if (Number(request.headers.get("content-length")) > 8192) throw new RefundInputError("Request is too large.", 413);
    const text = await request.text();
    if (text.length > 8192) throw new RefundInputError("Request is too large.", 413);
    let payload: RefundPayload;
    try { payload = JSON.parse(text); } catch { throw new RefundInputError("Invalid request."); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new RefundInputError("Invalid request.");
    const parsed = typeof payload.token === "string" && parseWaitlistVerifyToken(payload.token.trim());
    if (!parsed) throw new RefundInputError("Invalid or expired reservation link.", 401);
    await enforceRefundRateLimits([{ scope: `${action}:email`, identity: parsed.normalizedEmail.trim().toLowerCase(), seconds: 60, limit: action === "captcha" ? 5 : 10 }]);
    if (action === "check" && request.headers.get("accept")?.includes("application/x-ndjson")) {
      let cancelled = false;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (event: object) => { if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
          try {
            const result = await run(payload, step => emit({ type: "progress", step }));
            emit({ type: "result", ok: true, ...result });
          } catch (error) {
            const status = error instanceof RefundInputError ? error.status : 500;
            if (status === 500) console.error("[reservation-refund-check] stream failed", error);
            emit({ type: "error", ok: false, status, error: status === 500 ? "Could not complete the payment check. Please try again." : (error as Error).message,
              retryAfter: error instanceof RefundInputError ? error.retryAfter : undefined });
          } finally { if (!cancelled) controller.close(); }
        },
        cancel() { cancelled = true; },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
    }
    return NextResponse.json({ ok: true, ...await run(payload) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RefundInputError ? error.status : 500;
    if (status === 500) console.error(`[reservation-refund-${action}] failed`, error);
    const retryAfter = error instanceof RefundInputError ? error.retryAfter : undefined;
    return NextResponse.json({ ok: false, error: status === 500 ? "Could not complete the request. Please try again." : (error as Error).message, ...(retryAfter ? { retryAfter } : {}) }, {
      status, headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
    });
  }
}
