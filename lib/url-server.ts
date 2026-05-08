import "server-only";

import { headers } from "next/headers";

export async function resolveBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (host) return `${proto}://${host}`;
  return "https://zcashnames.com";
}
