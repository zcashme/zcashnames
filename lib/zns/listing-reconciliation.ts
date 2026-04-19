import type { ResolveResult, VerifiedListing } from "./client";

export function getListingMap(listings: VerifiedListing[]): Map<string, VerifiedListing> {
  return new Map(listings.map((listing) => [listing.name, listing]));
}

export function reconcileRegistrationListing(
  registration: ResolveResult,
  listingsByName: Map<string, VerifiedListing>,
): ResolveResult {
  if (registration.listing) return registration;
  const listing = listingsByName.get(registration.name);
  return listing ? { ...registration, listing } : registration;
}
