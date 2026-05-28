import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { create as createSvgCaptcha } from "svg-captcha";

const TTL_MS = 5 * 60 * 1000;

export type WaitlistCaptchaChallenge = {
  // data:image/svg+xml;base64,... — ready to drop into <img src=…>.
  image: string;
  // `${expiresMs}.${nonce}.${hmac}` — the HMAC binds the normalized answer
  // server-side; the answer itself is never sent to the client.
  token: string;
};

function getSecret(): string {
  const secret =
    process.env.WAITLIST_CAPTCHA_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.BETA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing waitlist captcha secret.");
  return secret;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

function computeMac(expires: number, nonce: string, answer: string): string {
  return createHmac("sha256", getSecret())
    .update(`${expires}:${nonce}:${normalizeAnswer(answer)}`)
    .digest("hex");
}

export function createWaitlistCaptcha(now = Date.now()): WaitlistCaptchaChallenge {
  const captcha = createSvgCaptcha({
    size: 5,
    ignoreChars: "0o1iIlL",
    noise: 2,
    color: true,
  });
  const expires = now + TTL_MS;
  const nonce = randomBytes(9).toString("base64url");
  const mac = computeMac(expires, nonce, captcha.text);
  const image = `data:image/svg+xml;base64,${Buffer.from(captcha.data, "utf8").toString("base64")}`;
  return {
    image,
    token: `${expires}.${nonce}.${mac}`,
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
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresStr, nonce, mac] = parts;
  if (!expiresStr || !nonce || !mac) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < now) return false;

  const expected = computeMac(expires, nonce, answer);
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
