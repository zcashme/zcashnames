/**
 * ZIP-321 payment URI builder and parser — browser-safe, no Node.js dependencies.
 *
 * ZIP-321 is the Zcash Payment Request URI standard. It encodes a payment
 * target as a standardised URI:
 *
 *   zcash:<ADDRESS>?amount=<ZEC>&memo=<BASE64URL>
 *
 * The memo parameter is base64url-encoded (no padding) per the spec.
 * Wallets that understand ZIP-321 will pre-fill the amount and memo
 * fields from the URI, reducing user error.
 *
 * Usage:
 *   const result = zip321Uri(address, amount, memo);
 *   // result.uri          → "zcash:u1...?amount=1.0&memo=..."
 *   // result.address     → "u1..."
 *   // result.amount      → "1.0"
 *   // result.memo        → "plain text memo"
 *   // result.memoEncoded → "base64url-encoded"
 */

function toBase64Url(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text);
    const bin = String.fromCharCode(...bytes);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

function fromBase64Url(encoded: string): string {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
    const bin = atob(padded);
    return new TextDecoder().decode(
      Uint8Array.from(bin, (c) => c.charCodeAt(0)),
    );
  } catch {
    return encoded;
  }
}

export function zip321Uri(
  address: string,
  amount: string = "0",
  memo: string = "",
) {
  const memoEncoded = memo ? toBase64Url(memo) : "";
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memoEncoded) params.push(`memo=${memoEncoded}`);
  const uri = params.length
    ? `zcash:${address}?${params.join("&")}`
    : `zcash:${address}`;

  return { uri, address, amount, memo, memoEncoded };
}
