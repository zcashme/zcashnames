export const MAX_HUMAN_REFERRAL_CODE_LENGTH = 62;

export function normalizeHumanReferralCode(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_HUMAN_REFERRAL_CODE_LENGTH);

  return normalized.replace(/-+$/g, "");
}

export function isValidHumanReferralCode(value: string): boolean {
  return /^(?=.{1,62}$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function buildHumanReferralCodeCandidate(base: string, suffix: number): string {
  const normalizedBase = normalizeHumanReferralCode(base);
  if (!normalizedBase) return "";
  if (suffix <= 0) return normalizedBase;

  const suffixText = `-${suffix + 1}`;
  const maxBaseLength = MAX_HUMAN_REFERRAL_CODE_LENGTH - suffixText.length;
  if (maxBaseLength <= 0) return suffixText.slice(1, MAX_HUMAN_REFERRAL_CODE_LENGTH + 1);

  return `${normalizedBase.slice(0, maxBaseLength)}${suffixText}`;
}

export function getPreferredReferralCode(row: {
  referral_code?: string | null;
  human_referral_code?: string | null;
}): string {
  return row.human_referral_code?.trim() || row.referral_code?.trim() || "";
}
