//
// Collection URL codec.
//
// The names in a collection ride in a single opaque ?c= token: the list is
// comma-joined, then base64url-encoded, so the delimiter never appears in the
// URL and the whole set is one clean value. Names are [a-z0-9] and addresses
// are bech32 (Latin1), so btoa/atob are safe without a UTF-8 step. btoa/atob
// are global in both the browser and the Node server runtime, so this module
// is isomorphic.
//

export function encodeNames(names: string[]): string {
  if (names.length === 0) return "";
  return btoa(names.join(","))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeNames(token: string | null | undefined): string[] {
  if (!token) return [];
  try {
    const raw = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  } catch {
    // Malformed token — treat as an empty collection rather than throwing.
    return [];
  }
}
