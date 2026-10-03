export class SecurityError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfter: number | null;

  constructor(code: string, status: number, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "SecurityError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export const SECURITY_MESSAGES = {
  notFound: "This ticket could not be found.",
  windowBefore: "Submissions are not open yet.",
  windowAfter: "The competition is closed.",
  unavailable: "Submissions are not available right now.",
  invalidTxid: "That transaction id is not valid.",
  paymentNotFound: "No confirmed payment with this ticket memo has reached the competition ledger yet.",
  alreadyUsed: "That payment was already used for another ticket.",
  paymentUnavailable: "Payment verification is temporarily unavailable. Try again.",
  persistence: "We could not save this step. Your payment is kept. Try again.",
  unexpected: "Something went wrong. Try again.",
  missingTicket: "Missing ticket.",
} as const;

export function wrongAmountMessage(feeZec: string): string {
  return `The payment amount is below the ${feeZec} ZEC submission fee.`;
}
