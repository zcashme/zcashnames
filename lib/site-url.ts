type HeaderStoreLike = {
  get(name: string): string | null;
};

function normalizeConfiguredSiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed === "undefined" || trimmed === "null") return null;
  return trimmed.replace(/\/$/, "");
}

export function resolveSiteUrl(headerStore?: HeaderStoreLike): string {
  const fromEnv = normalizeConfiguredSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
  );
  if (fromEnv) return fromEnv;

  if (headerStore) {
    const proto = headerStore.get("x-forwarded-proto") || "https";
    const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
    const normalizedHost = normalizeConfiguredSiteUrl(host ?? undefined);
    if (normalizedHost) return `${proto}://${normalizedHost}`;
  }

  return "https://www.zcashnames.com";
}
