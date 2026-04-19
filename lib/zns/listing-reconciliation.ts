import type { Registration, Listing } from "./client";

export function getListingMap(listings: Listing[]): Map<string, Listing> {
  return new Map(listings.map((listing) => [listing.name, listing]));
}

export function reconcileRegistrationListing(
  registration: Registration,
  listingsByName: Map<string, Listing>,
): Registration {
  if (registration.listing) return registration;
  const listing = listingsByName.get(registration.name);
  return listing ? { ...registration, listing } : registration;
}
