import { BRAND } from "@/lib/zns/brand";
export {
  buildHumanReferralCodeCandidate,
  getPreferredReferralCode,
  isValidHumanReferralCode,
  MAX_HUMAN_REFERRAL_CODE_LENGTH,
  normalizeHumanReferralCode,
} from "./referral-code-core";

// Extracts a referral code from a URL (via `ref` query param) or raw string.
// Falls back to the raw trimmed value when no URL structure is detected.
export function extractReferralCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("ref")?.trim() ?? "";
  } catch {}

  const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed.split("?")[1];
  if (query !== undefined) {
    return new URLSearchParams(query).get("ref")?.trim() ?? "";
  }

  return trimmed;
}

// Builds the rewards landing page URL using BRAND.url as the base, appending the ref query param.
// Returns the bare BRAND.url when no valid referral code is provided.
export function buildReferralUrl(referralCode?: string | null): string {
  const normalized = extractReferralCode(referralCode ?? "");
  return normalized ? `${BRAND.url}/?ref=${encodeURIComponent(normalized)}` : BRAND.url;
}
