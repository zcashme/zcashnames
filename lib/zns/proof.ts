/**
 * Proof token system — server-issued capability tokens for gating write actions.
 *
 * Shape: `kind:base64url(subject):hex(HMAC-SHA256(secret, "kind:base64url(subject)"))`
 *
 * The server holds ZNS_PROOF_SECRET and is the only party that can produce a valid
 * signature. The client receives a token after passing a verification step and presents
 * it back when calling a mutating action in lib/zns/actions.ts. The server re-derives
 * the HMAC and accepts the action iff it matches — no per-challenge DB row needed.
 *
 * Two kinds:
 *  - "otp"      Subject passed OTP / social verification (subject is usually an email).
 *  - "unlock"   Subject (a reserved name) was unlocked with the correct unlock code.
 *
 * Properties this design gives us:
 *  - Stateless:    the secret + HMAC is the source of truth; nothing to store.
 *  - Unforgeable:  secret never leaves the server, signatures are non-malleable.
 *  - Subject-bound: an OTP for alice@x.com can't be replayed to act on bob@x.com.
 *  - Kind-bound:   an "unlock" token can't be swapped in where "otp" is required.
 *
 * Non-goals (intentionally out of scope here):
 *  - No expiry / TTL. Tokens are valid until ZNS_PROOF_SECRET rotates. If TTL or
 *    single-use is needed for a given flow, encode a timestamp into the subject or
 *    track consumed tokens at the call site.
 *
 * Verification uses crypto.timingSafeEqual so signature comparison doesn't leak via
 * timing side-channels.
 */
import "server-only";

import crypto from "node:crypto";

const PROOF_SECRET_ENV = "ZNS_PROOF_SECRET";

function getProofSecret(): string {
  const secret = process.env[PROOF_SECRET_ENV];
  if (!secret) throw new Error(`${PROOF_SECRET_ENV} environment variable is required`);
  return secret;
}

export type ProofKind = "otp" | "unlock";

function encodeSubject(subject: string): string {
  return Buffer.from(subject, "utf-8").toString("base64url");
}

function decodeSubject(encoded: string): string | null {
  try {
    return Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

function computeHmac(kind: ProofKind, encodedSubject: string): string {
  return crypto
    .createHmac("sha256", getProofSecret())
    .update(`${kind}:${encodedSubject}`)
    .digest("hex");
}

// Mint a token. Call this only after the server has actually verified `subject`
// (e.g. confirmed the OTP code or the unlock code). The returned string is safe to
// hand to the client; it carries no secret material, only a signature over public data.
export function issueProof(kind: ProofKind, subject: string): string {
  const encodedSubject = encodeSubject(subject);
  const sig = computeHmac(kind, encodedSubject);
  return `${kind}:${encodedSubject}:${sig}`;
}

// Full verification: confirms the token was issued by us, for this kind, AND that its
// subject matches the one the caller expects. Use this on the write path when you know
// exactly which subject the action targets (e.g. registering name X requires an "unlock"
// proof whose subject is X).
//
// Split on the first and last ":" — the middle field is base64url so it can't contain
// ":", which makes this parse unambiguous.
export function verifyProof(token: string, kind: ProofKind, subject: string): boolean {
  const firstColon = token.indexOf(":");
  const lastColon = token.lastIndexOf(":");
  if (firstColon === -1 || lastColon === -1 || firstColon === lastColon) return false;

  const tokenKind = token.slice(0, firstColon) as ProofKind;
  if (tokenKind !== kind) return false;

  const encodedSubject = token.slice(firstColon + 1, lastColon);
  const decodedSubject = decodeSubject(encodedSubject);
  if (decodedSubject !== subject) return false;

  const signature = token.slice(lastColon + 1);
  const expected = computeHmac(kind, encodedSubject);
  // Length check first: timingSafeEqual throws on mismatched lengths, and an
  // attacker-controlled signature could otherwise trigger that as an oracle.
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Weaker check: confirms the token is a valid proof of this kind, without pinning the
// subject. Use this only when the caller derives the subject FROM the token itself
// (via parseProofSubject) rather than comparing against an externally-known value —
// otherwise you've created a confused-deputy hole where any valid token of this kind
// authorizes any subject.
export function verifyProofKind(token: string, kind: ProofKind): boolean {
  const firstColon = token.indexOf(":");
  const lastColon = token.lastIndexOf(":");
  if (firstColon === -1 || lastColon === -1 || firstColon === lastColon) return false;

  const tokenKind = token.slice(0, firstColon) as ProofKind;
  if (tokenKind !== kind) return false;

  const encodedSubject = token.slice(firstColon + 1, lastColon);
  const signature = token.slice(lastColon + 1);

  const expected = computeHmac(kind, encodedSubject);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Parse-only: decodes the kind and subject without checking the signature. Useful for
// logging, UX hints, or as the "extract subject" half of a verifyProofKind flow. Never
// trust the returned subject for authorization on its own — pair with verifyProofKind.
export function parseProofSubject(token: string): { kind: ProofKind; subject: string } | null {
  const firstColon = token.indexOf(":");
  const lastColon = token.lastIndexOf(":");
  if (firstColon === -1 || lastColon === -1 || firstColon === lastColon) return null;

  const kind = token.slice(0, firstColon) as ProofKind;
  const encodedSubject = token.slice(firstColon + 1, lastColon);
  const subject = decodeSubject(encodedSubject);
  if (!subject) return null;

  return { kind, subject };
}