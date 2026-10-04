import {
  getWalletVariant,
  getWalletPlatformDownloadsForBrand,
  getWalletBrand,
  isWalletVariantId,
  type WalletVariantId,
} from "@/lib/wallets/catalog";

export function readPreferredWalletVariantId(
  plannedWallet: unknown,
  plannedWalletsDetail: unknown,
): WalletVariantId | null {
  if (typeof plannedWallet === "string" && isWalletVariantId(plannedWallet)) {
    return plannedWallet;
  }

  if (!Array.isArray(plannedWalletsDetail)) return null;
  const primaryRows = plannedWalletsDetail.filter(
    (row) =>
      typeof row === "object" &&
      row !== null &&
      (row as Record<string, unknown>).is_primary === true,
  );
  const candidateRows = primaryRows.length > 0 ? primaryRows : plannedWalletsDetail;

  for (const row of candidateRows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    const candidate =
      typeof record.variant_id === "string"
        ? record.variant_id
        : typeof record.variantId === "string"
          ? record.variantId
          : typeof record.value === "string"
            ? record.value
            : "";
    if (isWalletVariantId(candidate)) return candidate;
  }

  return null;
}

export function resolveWalletDownloadHref(variantId: WalletVariantId | null): string | null {
  if (!variantId) return null;
  const variant = getWalletVariant(variantId);
  if (!variant) return null;

  const platformMatch = getWalletPlatformDownloadsForBrand(variant.brandSlug).find(
    (download) =>
      download.device === variant.device && download.subcategory === variant.subcategory,
  );
  if (platformMatch?.href) return platformMatch.href;

  return getWalletBrand(variant.brandSlug)?.websiteUrl ?? null;
}
