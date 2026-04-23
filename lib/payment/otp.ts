import "server-only";

import crypto from "node:crypto";
import { parseZvsMemo } from "./memo";
import { issueProof } from "@/lib/zns/proof";

function getSecretSeedBytes(): Uint8Array {
  const seed = process.env.ZVS_SECRET_SEED;
  if (!seed) {
    throw new Error("ZVS_SECRET_SEED environment variable is required");
  }
  return new Uint8Array(Buffer.from(seed, "hex"));
}

async function generateOtp(memo: string): Promise<string> {
  const parsed = parseZvsMemo(memo);
  if (!parsed) throw new Error("Invalid memo format");

  const keyData = getSecretSeedBytes().slice();
  const messageData = new TextEncoder().encode(
    parsed.sessionId + parsed.userAddress
  );

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, messageData);
  const h = new Uint8Array(sig);
  const code = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
  return (code % 1_000_000).toString().padStart(6, "0");
}

export async function verifyOtp(
  memo: string,
  providedOtp: string,
  expectedAddress: string
): Promise<{ ok: true; proof: string } | { ok: false; error: string }> {
  const parsed = parseZvsMemo(memo);
  if (!parsed) return { ok: false, error: "Invalid memo format." };
  if (parsed.userAddress !== expectedAddress) return { ok: false, error: "Invalid code." };

  const expected = await generateOtp(memo);
  const provided = providedOtp.trim();

  if (expected.length !== provided.length) return { ok: false, error: "Invalid code." };
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    return { ok: false, error: "Invalid code." };
  }

  const subject = `${parsed.sessionId}:${parsed.userAddress}`;
  return { ok: true, proof: issueProof("otp", subject) };
}