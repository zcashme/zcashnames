import "server-only";

import { headers } from "next/headers";

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function resolveBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (host) return `${proto}://${host}`;
  return "https://zcashnames.com";
}
