import { REFUND_CHECK_STEPS, type RefundCheck, type RefundCheckProgress } from "./reservation-refund-validation";

export class RefundResponseError extends Error {
  constructor(message: string, public retryAfter?: number) { super(message); }
}

export async function readRefundCheckResponse(response: Response, progress: RefundCheckProgress): Promise<RefundCheck> {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const data = await response.json();
    if (!response.ok || !data.ok) throw new RefundResponseError(data.error || "Could not check your payment.", data.retryAfter);
    return data as RefundCheck;
  }
  if (!response.body) throw new Error("The payment check returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: RefundCheck | null = null;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "progress" && Object.hasOwn(REFUND_CHECK_STEPS, event.step)) progress(event.step);
    if (event.type === "error") throw new RefundResponseError(event.error || "Could not check your payment.", event.retryAfter);
    if (event.type === "result" && event.ok) result = event as RefundCheck;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) consume(line);
      if (done) break;
    }
    consume(buffer);
    if (!result) throw new Error("The payment check was interrupted. Edit the transaction ID to check again.");
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
