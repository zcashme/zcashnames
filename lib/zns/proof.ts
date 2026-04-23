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

export function issueProof(kind: ProofKind, subject: string): string {
  const encodedSubject = encodeSubject(subject);
  const sig = computeHmac(kind, encodedSubject);
  return `${kind}:${encodedSubject}:${sig}`;
}

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
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

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