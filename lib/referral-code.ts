import { BRAND } from "@/lib/zns/brand";

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

export function buildReferralUrl(referralCode?: string | null): string {
  const normalized = extractReferralCode(referralCode ?? "");
  return normalized ? `${BRAND.url}/?ref=${encodeURIComponent(normalized)}` : BRAND.url;
}
