import { BRAND } from "@/lib/zns/brand";
export {
  buildHumanReferralCodeCandidate,
  getPreferredReferralCode,
  isValidHumanReferralCode,
  MAX_HUMAN_REFERRAL_CODE_LENGTH,
  normalizeHumanReferralCode,
} from "./referral-code-core";

function extractLeadersRefCode(pathname: string): string {
  const match = pathname.trim().match(/(?:^|\/)leaders\/ref\/([^/?#]+)/i);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return match[1].trim();
  }
}

function extractQueryReferralCode(query: string): string {
  return new URLSearchParams(query).get("ref")?.trim() ?? "";
}

// Extracts a referral code from a reflink (`?ref=` or `/leaders/ref/...`) or raw string.
// Falls back to the raw trimmed value when no URL structure is detected.
export function extractReferralCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("ref")?.trim();
    if (fromQuery) return fromQuery;
    const fromPath = extractLeadersRefCode(url.pathname);
    if (fromPath) return fromPath;
    return "";
  } catch {}

  const queryIndex = trimmed.indexOf("?");
  if (queryIndex >= 0) {
    const fromQuery = extractQueryReferralCode(trimmed.slice(queryIndex + 1));
    if (fromQuery) return fromQuery;
    const fromPath = extractLeadersRefCode(trimmed.slice(0, queryIndex));
    if (fromPath) return fromPath;
  }

  const fromPath = extractLeadersRefCode(trimmed);
  if (fromPath) return fromPath;

  return trimmed;
}

// Builds the rewards landing page URL using BRAND.url as the base, appending the ref query param.
// Returns the bare BRAND.url when no valid referral code is provided.
export function buildReferralUrl(referralCode?: string | null): string {
  const normalized = extractReferralCode(referralCode ?? "");
  return normalized ? `${BRAND.url}/?ref=${encodeURIComponent(normalized)}` : BRAND.url;
}
