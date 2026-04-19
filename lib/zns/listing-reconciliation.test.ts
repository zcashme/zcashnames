import test from "node:test";
import assert from "node:assert/strict";
import { getListingMap, reconcileRegistrationListing } from "./listing-reconciliation.ts";
import type { ResolveResult, VerifiedListing } from "./client.ts";

function registration(overrides: Partial<ResolveResult> = {}): ResolveResult {
  return {
    name: "listedname",
    address: "u1test",
    txid: "regtx",
    height: 100,
    nonce: 1,
    signature: "sig",
    last_action: "CLAIM",
    pubkey: null,
    listing: null,
    verified: true,
    sovereign: false,
    ...overrides,
  };
}

function listing(overrides: Partial<VerifiedListing> = {}): VerifiedListing {
  return {
    name: "listedname",
    price: 123,
    nonce: 2,
    txid: "listtx",
    height: 110,
    signature: "listsig",
    verified: true,
    ...overrides,
  };
}

test("reconcileRegistrationListing restores active listing stripped from resolve result", () => {
  const result = reconcileRegistrationListing(registration(), getListingMap([listing()]));

  assert.equal(result.listing?.price, 123);
  assert.equal(result.listing?.txid, "listtx");
});

test("reconcileRegistrationListing keeps embedded listing when resolve already has it", () => {
  const embedded = listing({ price: 456, txid: "embeddedtx" });
  const result = reconcileRegistrationListing(
    registration({ listing: embedded }),
    getListingMap([listing({ price: 123, txid: "fallbacktx" })]),
  );

  assert.equal(result.listing?.price, 456);
  assert.equal(result.listing?.txid, "embeddedtx");
});
