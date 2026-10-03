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
  paymentNotFound: "No matching payment has been detected yet.",
  alreadyUsed: "That payment was already used for another ticket.",
  paymentUnavailable: "Payment verification is temporarily unavailable. Try again.",
  githubFailed: "We could not file the report. Your payment is saved. Submit again.",
  inProgress: "A submission is already in progress. Wait a moment and try again.",
  paymentRequired: "Pay the submission fee before filing a report.",
  persistence: "We could not save this step. Your payment is kept. Try again.",
  unexpected: "Something went wrong. Try again.",
  missingTicket: "Missing ticket.",
} as const;

export function wrongAmountMessage(feeZec: string): string {
  return `The payment amount is below the ${feeZec} ZEC submission fee.`;
}

export function rateLimitMessage(seconds: number): string {
  return `Too many attempts. Try again in ${seconds} seconds.`;
}
