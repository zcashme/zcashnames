type HeaderStoreLike = {
  get(name: string): string | null;
};

function normalizeConfiguredSiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed === "undefined" || trimmed === "null") return null;
  return trimmed.replace(/\/$/, "");
}

function isLocalHost(host: string): boolean {
  const hostname = host.replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0] ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolveSiteUrl(headerStore?: HeaderStoreLike): string {
  const forwardedHost = headerStore
    ? normalizeConfiguredSiteUrl(
        headerStore.get("x-forwarded-host") || headerStore.get("host") || undefined,
      )
    : null;
  const fromHeaders = forwardedHost
    ? `${
        isLocalHost(forwardedHost)
          ? "http"
          : headerStore?.get("x-forwarded-proto") || "https"
      }://${forwardedHost.replace(/^https?:\/\//, "")}`
    : null;

  // Dev emails must use the host that will verify the token. Env site URLs
  // often point at production, which rejects tokens signed locally.
  if (process.env.NODE_ENV === "development" && fromHeaders) {
    return fromHeaders;
  }

  const fromEnv = normalizeConfiguredSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
  );
  if (fromEnv) return fromEnv;
  if (fromHeaders) return fromHeaders;

  return "https://www.zcashnames.com";
}
