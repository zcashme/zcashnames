import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

const CAPTCHA_TTL_MS = 10 * 60 * 1000;

type CaptchaPayload = {
  answer: number;
  expiresAt: number;
  nonce: string;
};

export type WaitlistCaptchaChallenge = {
  prompt: string;
  token: string;
};

function getSecret(): string {
  const secret =
    process.env.WAITLIST_CAPTCHA_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.BETA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing waitlist captcha secret.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function encodePayload(payload: CaptchaPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): CaptchaPayload | null {
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  let parsed: { answer?: unknown; expiresAt?: unknown; nonce?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      answer?: unknown;
      expiresAt?: unknown;
      nonce?: unknown;
    };
  } catch {
    return null;
  }

  if (
    typeof parsed.answer !== "number" ||
    typeof parsed.expiresAt !== "number" ||
    typeof parsed.nonce !== "string"
  ) {
    return null;
  }

  return {
    answer: parsed.answer,
    expiresAt: parsed.expiresAt,
    nonce: parsed.nonce,
  };
}

export function createWaitlistCaptchaChallenge(now = Date.now()): WaitlistCaptchaChallenge {
  const kind = randomInt(0, 3);
  let left: number;
  let right: number;
  let answer: number;
  let operator: string;

  if (kind === 0) {
    left = randomInt(2, 13);
    right = randomInt(2, 13);
    answer = left + right;
    operator = "+";
  } else if (kind === 1) {
    left = randomInt(6, 21);
    right = randomInt(1, left);
    answer = left - right;
    operator = "-";
  } else {
    left = randomInt(2, 10);
    right = randomInt(2, 10);
    answer = left * right;
    operator = "x";
  }

  const payload = encodePayload({
    answer,
    expiresAt: now + CAPTCHA_TTL_MS,
    nonce: randomBytes(9).toString("base64url"),
  });

  return {
    prompt: `Human check: what is ${left} ${operator} ${right}?`,
    token: `${payload}.${sign(payload)}`,
  };
}

export function verifyWaitlistCaptcha({
  token,
  answer,
  now = Date.now(),
}: {
  token: string;
  answer: string;
  now?: number;
}): boolean {
  const parsed = decodePayload(token);
  if (!parsed || parsed.expiresAt < now) return false;

  const normalizedAnswer = Number(answer.trim());
  if (!Number.isInteger(normalizedAnswer)) return false;
  return normalizedAnswer === parsed.answer;
}
