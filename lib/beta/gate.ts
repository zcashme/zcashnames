// Beta gate: two-cookie pattern for beta access control.
//   zn_beta       → authenticated tester identity (HMAC-signed, 30-day TTL)
//   zn_beta_stage → user's chosen network stage: testnet | mainnet (30-day TTL)
// Cookie → parseSignedCookie → testers.ts (findTesterById) → BetaTester or null.
// Called by actions.ts server actions and middleware for guarded route checks.
import "server-only";

import { signHmac, safeEqual, resolveSecret } from "@/lib/hmac";
import { cookieOptions, parseSignedCookie, setCookie, getCookie } from "@/lib/cookie";
import { findTesterById, type BetaTester } from "./testers";

export const BETA_COOKIE_NAME = "zn_beta";
export const BETA_STAGE_COOKIE_NAME = "zn_beta_stage";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;
const STAGE_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  return resolveSecret(
    process.env.BETA_GATE_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET,
  );
}

function parseTesterPayload(payload: string): { testerId: string; expiresAt: number } | null {
  const lastDot = payload.lastIndexOf(".");
  if (lastDot === -1) return null;

  const expiresRaw = payload.slice(lastDot + 1);
  const testerId = payload.slice(0, lastDot);
  if (!testerId || !expiresRaw) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  if (expiresAt < Math.floor(Date.now() / 1000)) return null;

  return { testerId, expiresAt };
}

function buildStagePayload(stage: "testnet" | "mainnet", expiresAt: number): string {
  return `${stage}.${expiresAt}`;
}

function parseStagePayload(payload: string): { stage: "testnet" | "mainnet"; expiresAt: number } | null {
  const lastDot = payload.lastIndexOf(".");
  if (lastDot === -1) return null;

  const expiresRaw = payload.slice(lastDot + 1);
  const stage = payload.slice(0, lastDot) as "testnet" | "mainnet";
  if (stage !== "testnet" && stage !== "mainnet") return null;
  if (!expiresRaw) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  if (expiresAt < Math.floor(Date.now() / 1000)) return null;

  return { stage, expiresAt };
}

export function buildStageCookieValue(stage: "testnet" | "mainnet"): { value: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + STAGE_TTL_SECONDS;
  const secret = getSecret();
  const payload = buildStagePayload(stage, expiresAt);
  const signature = signHmac(secret, payload);
  return { value: `${payload}.${signature}`, expiresAt };
}

export function parseStageCookieValue(value: string): { stage: "testnet" | "mainnet"; expiresAt: number } | null {
  const secret = getSecret();
  return parseSignedCookie(value, secret, parseStagePayload);
}

export type BetaAccessSession =
  | { kind: "tester"; tester: BetaTester }
  | { kind: "shared"; testerId: "shared_mainnet" | "shared_testnet" };

export async function readCurrentBetaAccessSession(): Promise<BetaAccessSession | null> {
  const value = await getCookie(BETA_COOKIE_NAME);
  if (!value) return null;

  const parsed = parseSignedCookie(value, getSecret(), parseTesterPayload);
  if (!parsed) return null;

  if (parsed.testerId === "shared_mainnet" || parsed.testerId === "shared_testnet") {
    return { kind: "shared", testerId: parsed.testerId };
  }

  const tester = await findTesterById(parsed.testerId);
  return tester ? { kind: "tester", tester } : null;
}

export async function readCurrentTester(): Promise<BetaTester | null> {
  const session = await readCurrentBetaAccessSession();
  return session?.kind === "tester" ? session.tester : null;
}

export async function readCurrentStage(): Promise<"testnet" | "mainnet" | null> {
  const value = await getCookie(BETA_STAGE_COOKIE_NAME);
  if (!value) return null;
  return parseStageCookieValue(value)?.stage ?? null;
}

export async function setStageCookie(stage: "testnet" | "mainnet") {
  const { value } = buildStageCookieValue(stage);
  await setCookie(BETA_STAGE_COOKIE_NAME, value, STAGE_TTL_SECONDS);
}

export async function setTesterCookie(testerId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const secret = getSecret();
  const payload = `${testerId}.${expiresAt}`;
  const signature = signHmac(secret, payload);
  await setCookie(BETA_COOKIE_NAME, `${payload}.${signature}`, COOKIE_TTL_SECONDS);
}
