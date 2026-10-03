export const SECURITY_MEMO_PREFIX = "ZNS:SECURITY|";

const TICKET_ID = /^ZNS-\d{2}-\d{3,}$/;

export function isSecurityTicketId(value: string): boolean {
  return TICKET_ID.test(value);
}

export function securityPaymentMemo(ticketId: string): string {
  return `${SECURITY_MEMO_PREFIX}ticket::${ticketId}`;
}

/** Exact `ticket::ZNS-YY-NNN` field. A longer id does not match a shorter one. */
export function memoTicketId(memo: string | null | undefined): string | null {
  const body = memo?.replace(/\0/g, "").trim() ?? "";
  if (!body) return null;
  const fields = body.startsWith(SECURITY_MEMO_PREFIX) ? body.slice(SECURITY_MEMO_PREFIX.length) : body;
  for (const field of fields.split("|")) {
    const trimmed = field.trim();
    const separator = trimmed.indexOf("::");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).toLowerCase();
    const value = trimmed.slice(separator + 2);
    if (key === "ticket" && TICKET_ID.test(value)) return value;
  }
  return null;
}
