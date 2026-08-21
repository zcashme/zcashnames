import "server-only";

import { createHash } from "crypto";
import { db } from "@/lib/db";

export const PREFERENCES_LINK_RATE_LIMIT_MESSAGE = "Too many requests, try later.";

const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_LIMIT = 5;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_LIMIT = 3;

type ThrottleRow = {
  count: number | null;
};

function throttleSecret(): string {
  const secret =
    process.env.WAITLIST_CAPTCHA_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.BETA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing preferences-link throttle secret.");
  return secret;
}

function hashKey(value: string): string {
  return createHash("sha256").update(`${throttleSecret()}:prefs-link:${value}`).digest("hex");
}

function normalizeIp(value: string | null): string {
  const raw = value?.split(",")[0]?.trim();
  return raw && raw.length > 0 ? raw : "unknown";
}

function windowStart(now: number, windowMs: number): string {
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

async function recordAttempt({
  scope,
  key,
  windowStartedAt,
}: {
  scope: "ip" | "email";
  key: string;
  windowStartedAt: string;
}): Promise<number> {
  const nowIso = new Date().toISOString();
  let existingCount = 0;
  let rowExists = false;

  const readCurrent = async (): Promise<void> => {
    const { data: current, error: currentError } = await db
      .from("waitlist_captcha_attempts")
      .select("count")
      .eq("scope", scope)
      .eq("key", key)
      .eq("window_started_at", windowStartedAt)
      .maybeSingle();
    if (currentError) throw currentError;
    rowExists = Boolean(current);
    existingCount = Math.max(0, Number((current as ThrottleRow | null)?.count ?? 0));
  };

  await readCurrent();

  if (!rowExists) {
    const { error: insertError } = await db.from("waitlist_captcha_attempts").insert({
      scope,
      key,
      window_started_at: windowStartedAt,
      count: 1,
      updated_at: nowIso,
    });
    if (!insertError) return 1;
    if (insertError.code !== "23505") throw insertError;
    await readCurrent();
  }

  const nextCount = existingCount + 1;
  const { error: updateError } = await db
    .from("waitlist_captcha_attempts")
    .update({ count: nextCount, updated_at: nowIso })
    .eq("scope", scope)
    .eq("key", key)
    .eq("window_started_at", windowStartedAt);
  if (updateError) throw updateError;
  return nextCount;
}

export async function isPreferencesLinkRateLimited(args: {
  email: string;
  remoteIp: string | null;
  now?: number;
}): Promise<boolean> {
  const now = args.now ?? Date.now();
  const [ipCount, emailCount] = await Promise.all([
    recordAttempt({
      scope: "ip",
      key: hashKey(normalizeIp(args.remoteIp)),
      windowStartedAt: windowStart(now, IP_WINDOW_MS),
    }),
    recordAttempt({
      scope: "email",
      key: hashKey(args.email.trim().toLowerCase()),
      windowStartedAt: windowStart(now, EMAIL_WINDOW_MS),
    }),
  ]);
  return ipCount > IP_LIMIT || emailCount > EMAIL_LIMIT;
}
