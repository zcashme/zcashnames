//
// Request / Respond memo builders — the user-to-Mint side of the protocol.
//
// Spec: sections "User requests" and "User Authorization" of the ZNS
// whitepaper. Memos are colon-separated ASCII fields starting with ZNS:
//
//   ZNS:claim:<term>:<name>:<ua>
//   ZNS:claim:<code>:<term>:<name>:<ua>     (protected-name claim)
//   ZNS:update:<term>:<name>:<ua>
//   ZNS:release:<name>:<ua>
//   ZNS:otp:<otp>:<name>:<verb>:<ua>        (Relay / Respond)
//
// These are pure functions — no server imports — so both server actions and
// client components can use them.
//

export type ClaimTerm = "forever" | `${number}y`;
export type UpdateTerm = "none" | "forever" | `${number}y`;
export type OtpVerb = "update" | "release";

const NAME_RE = /^[a-z0-9]{1,63}$/;
const CODE_RE = /^\d{6}$/;
const TERM_YEARS_RE = /^(?:[1-9]\d?)y$/;

/** Canonical term spelling: `forever` or `<N>y`, N a decimal 1..99, no leading zeroes. */
export function isValidTerm(term: string): term is ClaimTerm | Exclude<UpdateTerm, "none"> {
  return term === "forever" || TERM_YEARS_RE.test(term);
}

/** Update terms additionally allow `none` (carry the current expiration forward). */
export function isValidUpdateTerm(term: string): term is UpdateTerm {
  return term === "none" || isValidTerm(term);
}

export function isValidName(name: string): boolean {
  return NAME_RE.test(name);
}

/** Six ASCII decimal digits, leading zeroes allowed — access code or OTP. */
export function isValidSixDigitCode(code: string): boolean {
  return CODE_RE.test(code);
}

function assertName(name: string): void {
  if (!isValidName(name)) throw new Error("Invalid name.");
}

function assertUa(ua: string): void {
  if (!ua || !/^(u1|utest1)/.test(ua)) {
    throw new Error("Unified address required.");
  }
}

function assertTerm(term: string): void {
  if (!isValidTerm(term)) throw new Error("Invalid term.");
}

/** `ZNS:claim:<term>:<name>:<ua>` — open-name claim. */
export function buildClaimRequest(name: string, term: ClaimTerm, ua: string): string {
  assertName(name);
  assertTerm(term);
  assertUa(ua);
  return `ZNS:claim:${term}:${name}:${ua}`;
}

/** `ZNS:claim:<code>:<term>:<name>:<ua>` — protected-name claim with access code. */
export function buildCodedClaimRequest(
  code: string,
  name: string,
  term: ClaimTerm,
  ua: string,
): string {
  if (!isValidSixDigitCode(code)) throw new Error("Access code must be six digits.");
  assertName(name);
  assertTerm(term);
  assertUa(ua);
  return `ZNS:claim:${code}:${term}:${name}:${ua}`;
}

/** `ZNS:update:<term>:<name>:<ua>` — term is none (carry forward), Ny, or forever. */
export function buildUpdateRequest(name: string, term: UpdateTerm, ua: string): string {
  assertName(name);
  if (!isValidUpdateTerm(term)) throw new Error("Invalid term.");
  assertUa(ua);
  return `ZNS:update:${term}:${name}:${ua}`;
}

/** `ZNS:release:<name>:<ua>` — controller-requested release. */
export function buildReleaseRequest(name: string, ua: string): string {
  assertName(name);
  assertUa(ua);
  return `ZNS:release:${name}:${ua}`;
}

/**
 * `ZNS:otp:<otp>:<name>:<verb>:<ua>` — the Respond. The controller copies the
 * Relay memo it received from the Mint, so the encoding must match exactly:
 * six decimal digits (leading zeroes preserved), the requested verb, and the
 * target Unified Address from the Request.
 */
export function buildOtpRespond(
  otp: string,
  name: string,
  verb: OtpVerb,
  ua: string,
): string {
  if (!isValidSixDigitCode(otp)) throw new Error("Passcode must be six digits.");
  if (verb !== "update" && verb !== "release") throw new Error("Invalid verb.");
  assertName(name);
  assertUa(ua);
  return `ZNS:otp:${otp}:${name}:${verb}:${ua}`;
}

/**
 * Parse a Request-shaped memo (accepts the otp form too, as the Mint parser
 * does). Returns a discriminated result instead of throwing, for form inputs.
 */
export type ParsedRequestMemo =
  | { kind: "claim"; code: null; term: ClaimTerm; name: string; ua: string }
  | { kind: "claim"; code: string; term: ClaimTerm; name: string; ua: string }
  | { kind: "update"; term: UpdateTerm; name: string; ua: string }
  | { kind: "release"; name: string; ua: string }
  | { kind: "otp"; otp: string; name: string; verb: OtpVerb; ua: string }
  | { kind: "invalid" };

export function parseRequestMemo(memo: string): ParsedRequestMemo {
  const trimmed = memo.replace(/[\0]+$/, "").trim();
  const fields = trimmed.split(":");
  if (fields[0] !== "ZNS" || fields.length < 2) return { kind: "invalid" };

  switch (fields[1]) {
    case "claim": {
      // Three-field form: term, name, ua. Four-field form: code, term, name, ua.
      if (fields.length === 5) {
        const [term, name, ua] = fields.slice(2);
        if (!isValidTerm(term)) return { kind: "invalid" };
        if (!isValidName(name) || !ua) return { kind: "invalid" };
        return { kind: "claim", code: null, term: term as ClaimTerm, name, ua };
      }
      if (fields.length === 6) {
        const [code, term, name, ua] = fields.slice(2);
        if (!isValidSixDigitCode(code)) return { kind: "invalid" };
        if (!isValidTerm(term)) return { kind: "invalid" };
        if (!isValidName(name) || !ua) return { kind: "invalid" };
        return { kind: "claim", code, term: term as ClaimTerm, name, ua };
      }
      return { kind: "invalid" };
    }
    case "update": {
      if (fields.length !== 5) return { kind: "invalid" };
      const [term, name, ua] = fields.slice(2);
      if (!isValidUpdateTerm(term)) return { kind: "invalid" };
      if (!isValidName(name) || !ua) return { kind: "invalid" };
      return { kind: "update", term: term as UpdateTerm, name, ua };
    }
    case "release": {
      if (fields.length !== 4) return { kind: "invalid" };
      const [name, ua] = fields.slice(2);
      if (!isValidName(name) || !ua) return { kind: "invalid" };
      return { kind: "release", name, ua };
    }
    case "otp": {
      if (fields.length !== 6) return { kind: "invalid" };
      const [otp, name, verb, ua] = fields.slice(2);
      if (!isValidSixDigitCode(otp)) return { kind: "invalid" };
      if (!isValidName(name)) return { kind: "invalid" };
      if (verb !== "update" && verb !== "release") return { kind: "invalid" };
      if (!ua) return { kind: "invalid" };
      return { kind: "otp", otp, name, verb, ua };
    }
    default:
      return { kind: "invalid" };
  }
}
