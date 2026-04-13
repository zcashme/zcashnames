import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type CabalInvite = {
  id: string;
  displayName: string;
};

export const CABAL_COOKIE_NAME = "zn_cabal";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const secret = process.env.CABAL_GATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing CABAL_GATE_SECRET or SUPABASE_SERVICE_ROLE_KEY.");
  return secret;
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

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function cabalCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function buildCookieValue(inviteId: string): { value: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = encodePayload({ id: inviteId, expiresAt });
  return { value: `${payload}.${sign(payload)}`, expiresAt };
}

function parseCookieValue(value: string): { id: string; expiresAt: number } | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature || value.split(".").length !== 2) return null;
  if (!safeEqual(sign(payload), signature)) return null;

  const parsed = decodePayload(payload);
  if (!parsed) return null;
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return parsed;
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

  return { id: match.id as string, displayName: match.display_name as string };
}

export async function setCabalAccessCookie(inviteId: string): Promise<void> {
  const { value, expiresAt } = buildCookieValue(inviteId);
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);
  const store = await cookies();
  store.set(CABAL_COOKIE_NAME, value, cabalCookieOptions(maxAge));
}

export async function readCurrentCabalInvite(): Promise<CabalInvite | null> {
  const store = await cookies();
  const cookie = store.get(CABAL_COOKIE_NAME);
  if (!cookie?.value) return null;

  const parsed = parseCookieValue(cookie.value);
  if (!parsed) return null;
  return findInviteById(parsed.id);
}
