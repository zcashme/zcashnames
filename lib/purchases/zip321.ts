/**
 * ZIP-321 payment URI builder - browser-safe, no Node.js dependencies.
 */

export function buildZcashUri(
  address: string,
  amount: string = "0",
  memo: string = "",
): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

/* ── base64url encoding ──────────────────────────────────────────────── */

function toBase64Url(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text);
    const bin = String.fromCharCode(...bytes);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}
