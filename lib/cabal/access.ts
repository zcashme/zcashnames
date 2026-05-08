import "server-only";

import { signHmac, resolveSecret } from "@/lib/hmac";
import { parseSignedCookie, setCookie, getCookie } from "@/lib/cookie";
import { db } from "@/lib/db";

type CabalInvite = {
  id: string;
  displayName: string;
};

export const CABAL_COOKIE_NAME = "zn_cabal";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  return resolveSecret(process.env.CABAL_GATE_SECRET);
}

function encodePayload(payload: { id: string; expiresAt: number }): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): { id: string; expiresAt: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      id?: unknown;
      expiresAt?: unknown;
    };

    if (typeof parsed.id !== "string" || !parsed.id) return null;
    if (typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt)) return null;
    return { id: parsed.id, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function parseInvitePayload(payload: string): { id: string; expiresAt: number } | null {
  const parsed = decodePayload(payload);
  if (!parsed) return null;
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

function buildCookieValue(inviteId: string): { value: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = encodePayload({ id: inviteId, expiresAt });
  const secret = getSecret();
  const signature = signHmac(secret, payload);
  return { value: `${payload}.${signature}`, expiresAt };
}

async function findInviteById(id: string): Promise<CabalInvite | null> {
  const { data, error } = await db
    .from("cabal_invites")
    .select("id, display_name")
    .eq("id", id)
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("[cabal] invite lookup failed:", error);
    return null;
  }

  if (!data) return null;
  return { id: data.id as string, displayName: data.display_name as string };
}

export async function verifyCabalPassword(password: string): Promise<CabalInvite | null> {
  const trimmed = password.trim();
  if (!trimmed) return null;

  const { data, error } = await db.rpc("verify_cabal_invite", {
    input_password: trimmed,
  });

  if (error) {
    console.error("[cabal] password verification failed:", error);
    return null;
  }

  const match = Array.isArray(data) ? data[0] : data;
  if (!match?.id || !match?.display_name) return null;

  const { error: updateError } = await db
    .from("cabal_invites")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", match.id);

  if (updateError) {
    console.error("[cabal] failed to update invite last_used_at:", updateError);
  }

  return { id: match.id as string, displayName: match.display_name as string };
}

export async function setCabalAccessCookie(inviteId: string): Promise<void> {
  const { value, expiresAt } = buildCookieValue(inviteId);
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);
  await setCookie(CABAL_COOKIE_NAME, value, maxAge);
}

export async function readCurrentCabalInvite(): Promise<CabalInvite | null> {
  const value = await getCookie(CABAL_COOKIE_NAME);
  if (!value) return null;

  const parsed = parseSignedCookie(value, getSecret(), parseInvitePayload);
  if (!parsed) return null;

  return findInviteById(parsed.id);
}
