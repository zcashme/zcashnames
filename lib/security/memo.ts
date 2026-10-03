export const SECURITY_MEMO_PREFIX = "ZNS:SECURITY:";

const TICKET_ID = /^ZNS-BB-\d{3,}$/;
const MEMO_FIELDS = /^ZNS:SECURITY:(\d{3,}):(.+)$/;

export function isSecurityTicketId(value: string): boolean {
  return TICKET_ID.test(value);
}

/** `ZNS:SECURITY:<ticket number>:<payout address>` */
export function securityPaymentMemo(ticketId: string, payoutAddress: string): string {
  return `${SECURITY_MEMO_PREFIX}${ticketId.slice("ZNS-BB-".length)}:${payoutAddress}`;
}

/** Postgres LIKE pattern matching ledger memos for one ticket number. */
export function securityMemoPattern(ticketId: string): string {
  return `${SECURITY_MEMO_PREFIX}${ticketId.slice("ZNS-BB-".length)}:%`;
}

export type MemoFields = { ticketId: string; payoutAddress: string };

/** Ticket number and payout address from a `ZNS:SECURITY:<number>:<address>` memo, or null. */
export function memoFields(memo: string | null | undefined): MemoFields | null {
  const body = memo?.replace(/\0/g, "").trim() ?? "";
  const match = MEMO_FIELDS.exec(body);
  if (!match) return null;
  const ticketId = `ZNS-BB-${match[1]}`;
  const payoutAddress = match[2];
  return TICKET_ID.test(ticketId) && payoutAddress ? { ticketId, payoutAddress } : null;
}
