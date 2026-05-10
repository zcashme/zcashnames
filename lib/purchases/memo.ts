/**
 * ZVS memo helpers — session generation, memo building, and parsing.
 *
 * ZVS memos use the format:
 *   DO NOT MODIFY:{zvs/<SESSION_ID>,<USER_ADDRESS>}
 *
 * where <SESSION_ID> is a 16-digit cryptographically-random number
 * generated client-side, and <USER_ADDRESS> is the buyer's Zcash t-address.
 * The "DO NOT MODIFY:" prefix is a convention to prevent wallet software
 * from altering the memo body.
 */

/** Generate a cryptographically secure 16-digit session ID. */
export function generateSessionId(): string {
  const digits = "0123456789";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += digits[array[i] % 10];
  }
  return id;
}

/** Build the ZVS verification memo. */
export function buildZvsMemo(sessionId: string, userAddress: string): string {
  return `DO NOT MODIFY:{zvs/${sessionId},${userAddress}}`;
}

/** Parse a ZVS memo, returning sessionId + userAddress or null. */
export function parseZvsMemo(
  memo: string
): { sessionId: string; userAddress: string } | null {
  const match = memo.match(/\{zvs\/(\d{16}),(.+)\}$/);
  return match ? { sessionId: match[1], userAddress: match[2] } : null;
}
