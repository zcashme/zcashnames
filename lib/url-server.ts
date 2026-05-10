import "server-only";

import { headers } from "next/headers";

// Resolves the canonical base URL for the current request, cascading through:
// 1. NEXT_PUBLIC_SITE_URL / SITE_URL env var (explicit config)
// 2. x-forwarded-host header (reverse proxy / Vercel preview deployments)
// 3. Production fallback
// Guarded by "server-only" to prevent leaking this logic to the client bundle.
export async function resolveBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (host) return `${proto}://${host}`;
  return "https://zcashnames.com";
}
