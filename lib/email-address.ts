export const INVALID_EMAIL_ADDRESS_MESSAGE = "Enter a valid email address.";

export function normalizeEmailAddress(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmailAddress(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailAddress(input));
}

export function getEmailAddressValidationMessage(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return isValidEmailAddress(trimmed) ? null : INVALID_EMAIL_ADDRESS_MESSAGE;
}
