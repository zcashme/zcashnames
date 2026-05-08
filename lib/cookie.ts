import "server-only";

import { cookies } from "next/headers";
import { signHmac, safeEqual } from "@/lib/hmac";

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function buildSignedCookie(
  payload: string,
  secret: string,
): string {
  return `${payload}.${signHmac(secret, payload)}`;
}

export function parseSignedCookie<T>(
  value: string,
  secret: string,
  parse: (payload: string) => T | null,
): T | null {
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  if (!payload || !signature) return null;
  if (!safeEqual(signHmac(secret, payload), signature)) return null;

  return parse(payload);
}

export async function setCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): Promise<void> {
  const store = await cookies();
  store.set(name, value, cookieOptions(maxAgeSeconds));
}

export async function clearCookie(name: string): Promise<void> {
  const store = await cookies();
  store.set(name, "", cookieOptions(0));
}

export async function getCookie(name: string): Promise<string | null> {
  const store = await cookies();
  return store.get(name)?.value ?? null;
}
