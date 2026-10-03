import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createResumeToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResumeToken(token) };
}

export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resumeMatches(token: string, hash: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(hash)) return false;
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(actual, expected);
}
