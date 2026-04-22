import "server-only";

import crypto from "node:crypto";

const PROOF_TTL_SECONDS = 5 * 60;
const PROOF_SECRET_ENV = "ZNS_PROOF_SECRET";

function getProofSecret(): string {
  const secret = process.env[PROOF_SECRET_ENV];
  if (!secret) throw new Error(`${PROOF_SECRET_ENV} environment variable is required`);
  return secret;
}

export type ProofKind = "otp" | "sovereign" | "unlock";

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

function computeHmac(kind: ProofKind, encodedSubject: string, expiresAt: number): string {
  return crypto
    .createHmac("sha256", getProofSecret())
    .update(`${kind}:${encodedSubject}:${expiresAt}`)
    .digest("hex");
}

export function issueProof(kind: ProofKind, subject: string): string {
  const encodedSubject = encodeSubject(subject);
  const expiresAt = Math.floor(Date.now() / 1000) + PROOF_TTL_SECONDS;
  const sig = computeHmac(kind, encodedSubject, expiresAt);
  return `${kind}:${encodedSubject}:${expiresAt}:${sig}`;
}

export function verifyProof(token: string, kind: ProofKind, subject: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 4) return false;

  const [tokenKind, encodedSubject, expiresRaw, signature] = parts as [ProofKind, string, string, string];

  if (tokenKind !== kind) return false;

  const decodedSubject = decodeSubject(encodedSubject);
  if (decodedSubject !== subject) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = computeHmac(kind, encodedSubject, expiresAt);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyProofKind(token: string, kind: ProofKind): boolean {
  const lastColon = token.lastIndexOf(":");
  const secondLastColon = token.lastIndexOf(":", lastColon - 1);
  if (lastColon === -1 || secondLastColon === -1) return false;

  const tokenKind = token.slice(0, token.indexOf(":"));
  if (tokenKind !== kind) return false;

  const encodedSubject = token.slice(token.indexOf(":") + 1, secondLastColon);
  const expiresRaw = token.slice(secondLastColon + 1, lastColon);
  const signature = token.slice(lastColon + 1);

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = computeHmac(kind, encodedSubject, expiresAt);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function parseProofSubject(token: string): { kind: ProofKind; subject: string } | null {
  const firstColon = token.indexOf(":");
  const secondColon = token.indexOf(":", firstColon + 1);
  const thirdColon = token.indexOf(":", secondColon + 1);
  if (firstColon === -1 || secondColon === -1 || thirdColon === -1) return null;

  const kind = token.slice(0, firstColon) as ProofKind;
  const encodedSubject = token.slice(firstColon + 1, secondColon);
  const subject = decodeSubject(encodedSubject);
  if (!subject) return null;

  return { kind, subject };
}