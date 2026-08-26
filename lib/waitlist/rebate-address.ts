import { validateAddress } from "@/lib/zns/address-validation";

export function rebateUnifiedAddressError(
  address: string,
  reservePaymentAddress: string,
): string | null {
  const trimmed = address.trim();
  if (!trimmed) return "Enter a shielded Unified Address.";

  const result = validateAddress(trimmed);
  if (result.status !== "unified") {
    return result.warning || "Enter a valid Unified Address (u1…).";
  }

  const reserve = reservePaymentAddress.trim().toLowerCase();
  const value = trimmed.toLowerCase();
  const reserveIsTestnet = reserve.startsWith("utest1");
  const valueIsTestnet = value.startsWith("utest1");
  if (reserve.startsWith("u1") || reserve.startsWith("utest1")) {
    if (reserveIsTestnet !== valueIsTestnet) {
      return reserveIsTestnet
        ? "Use a testnet Unified Address (utest1…)."
        : "Use a mainnet Unified Address (u1…).";
    }
  }

  return null;
}

export function truncateUnifiedAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}
