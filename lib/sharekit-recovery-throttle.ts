import "server-only";

import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SHAREKIT_RECOVERY_COOKIE_NAME = "zn_sharekit_recovery";
const SESSION_WINDOW_MS = 10 * 60 * 1000;
const SESSION_LIMIT = 3;
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_LIMIT = 5;
const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_LIMIT = 30;

type SessionPayload = {
  attempts: number[];
  expiresAt: number;
};

function getSecret(): string {
  const secret =
    process.env.BETA_GATE_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing recovery throttle secret.");
  }
  return secret;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  let parsed: { attempts?: unknown; expiresAt?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      attempts?: unknown;
      expiresAt?: unknown;
    };
  } catch {
    return null;
  }

  if (!Array.isArray(parsed.attempts) || typeof parsed.expiresAt !== "number") return null;
  if (parsed.expiresAt < Date.now()) return null;

  const attempts = parsed.attempts.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return { attempts, expiresAt: parsed.expiresAt };
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function recordShareKitRecoverySessionAttempt(now = Date.now()): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(SHAREKIT_RECOVERY_COOKIE_NAME)?.value;
  const parsed = raw ? decodePayload(raw) : null;
  const attempts = (parsed?.attempts ?? []).filter((value) => now - value < SESSION_WINDOW_MS);
  const throttled = attempts.length >= SESSION_LIMIT;
  const nextAttempts = [...attempts, now];
  const expiresAt = now + SESSION_WINDOW_MS;
  const payload = encodePayload({ attempts: nextAttempts, expiresAt });
  const value = `${payload}.${sign(payload)}`;
  const maxAge = Math.max(1, Math.ceil((expiresAt - now) / 1000));

  store.set(SHAREKIT_RECOVERY_COOKIE_NAME, value, cookieOptions(maxAge));
  return throttled;
}

export function hashShareKitRecoveryIp(value: string): string {
  return createHash("sha256").update(`${getSecret()}:${value}`).digest("hex");
}

export function normalizeShareKitRecoveryIp(xForwardedFor: string | null): string {
  const raw = xForwardedFor?.split(",")[0]?.trim();
  return raw && raw.length > 0 ? raw : "unknown";
}

export function shareKitRecoveryWindowStart(now: number, windowMs: number): string {
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

export function shareKitRecoveryThrottleConfig() {
  return {
    session: { windowMs: SESSION_WINDOW_MS, limit: SESSION_LIMIT },
    ip: { windowMs: IP_WINDOW_MS, limit: IP_LIMIT },
    global: { windowMs: GLOBAL_WINDOW_MS, limit: GLOBAL_LIMIT },
  };
}
