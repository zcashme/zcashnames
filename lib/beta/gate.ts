import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { findTesterById, type BetaTester } from "./testers";

// ---------------------------------------------------------------------------
// Beta gate cookie — HMAC-signed `<testerId>.<expiresAt>.<signature>`.
// Mirrors lib/waitlist/confirm-token.ts. Cookie is httpOnly, lax, secure in
// production. The plaintext invite code is never persisted client-side.
// ---------------------------------------------------------------------------

export const BETA_COOKIE_NAME = "zn_beta";
export const BETA_STAGE_COOKIE_NAME = "zn_beta_stage";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STAGE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret =
    process.env.BETA_GATE_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing BETA_GATE_SECRET (or fallback secret).");
  }
  return secret;
}

function sign(testerId: string, expiresAt: number): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(`${testerId}:${expiresAt}`);
  return hmac.digest("hex");
}

function signStage(stage: "testnet" | "mainnet", expiresAt: number): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(`stage:${stage}:${expiresAt}`);
  return hmac.digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function buildBetaCookieValue(testerId: string): { value: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const signature = sign(testerId, expiresAt);
  return { value: `${testerId}.${expiresAt}.${signature}`, expiresAt };
}

export function parseBetaCookieValue(value: string): { testerId: string; expiresAt: number } | null {
  const parts = value.split(".");
  if (parts.length < 3) return null;
  const signature = parts.pop()!;
  const expiresRaw = parts.pop()!;
  const testerId = parts.join(".");
  if (!testerId || !signature || !expiresRaw) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;

  if (expiresAt < Math.floor(Date.now() / 1000)) return null;

  const expected = sign(testerId, expiresAt);
  if (!safeEqual(expected, signature)) return null;

  return { testerId, expiresAt };
}

export function buildStageCookieValue(stage: "testnet" | "mainnet"): { value: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + STAGE_TTL_SECONDS;
  const signature = signStage(stage, expiresAt);
  return { value: `${stage}.${expiresAt}.${signature}`, expiresAt };
}

export function parseStageCookieValue(value: string): { stage: "testnet" | "mainnet"; expiresAt: number } | null {
  const [stageRaw, expiresRaw, signature, ...extra] = value.split(".");
  if (extra.length > 0) return null;
  if (stageRaw !== "testnet" && stageRaw !== "mainnet") return null;
  if (!signature || !expiresRaw) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  if (expiresAt < Math.floor(Date.now() / 1000)) return null;

  const expected = signStage(stageRaw, expiresAt);
  if (!safeEqual(expected, signature)) return null;

  return { stage: stageRaw, expiresAt };
}

/** Read the current beta tester from the request cookie, if any. */
export async function readCurrentTester(): Promise<BetaTester | null> {
  const store = await cookies();
  const cookie = store.get(BETA_COOKIE_NAME);
  if (!cookie?.value) return null;
  const parsed = parseBetaCookieValue(cookie.value);
  if (!parsed) return null;
  return findTesterById(parsed.testerId);
}

/** Cookie attributes used by both set and clear. */
export function betaCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Read the current beta stage from the cookie, if any. */
export async function readCurrentStage(): Promise<"testnet" | "mainnet" | null> {
  const store = await cookies();
  const value = store.get(BETA_STAGE_COOKIE_NAME)?.value;
  if (!value) return null;
  return parseStageCookieValue(value)?.stage ?? null;
}

/** Write the stage cookie. Called from verifyNetworkAccess on success. */
export async function setStageCookie(stage: "testnet" | "mainnet") {
  const { value } = buildStageCookieValue(stage);
  const store = await cookies();
  store.set(BETA_STAGE_COOKIE_NAME, value, betaCookieOptions(STAGE_TTL_SECONDS));
}
