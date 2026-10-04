//
// Display-side mirror of the Mint's published pricing schedule
// (zns-mint src/mint/pricing.rs). The Mint is the pricing authority —
// an underpaid request is rejected on-chain — but the site needs the
// same numbers to show claim prices for testnet names.
//
//   - Annual USD price by name length: $10,000 / $2,500 / $800 / $400 / $100
//     for 1–5 character names; longer names pay the $20 minimum.
//   - `<N>y` term  = N × annual price.
//   - `forever`    = 3 × annual price.
//   - USD converts to zats at the live ZEC/USD rate, rounded UP to the next
//     100,000-zatoshi step so a quote never lands below the USD tariff.
//

import { getExchangeRate } from "@/lib/exchange-rate";

/** Annual USD price by name length: the five tiers cover 1–5 character names. */
export const ANNUAL_USD = [10_000, 2_500, 800, 400, 100] as const;
export const MINIMUM_USD = 20;
/** Forever registrations cost three annual prices. */
export const FOREVER_MULTIPLE = 3;
/** Zatoshi quantization step — amounts round up to a multiple of this. */
export const ZAT_STEP = 100_000;

export type ClaimTerm = "forever" | `${number}y`;

function annualUsd(nameLen: number): number {
  return nameLen <= ANNUAL_USD.length ? ANNUAL_USD[nameLen - 1] : MINIMUM_USD;
}

/** USD price of a claim for `name` under `term`. */
export function claimUsd(name: string, term: ClaimTerm): number {
  const annual = annualUsd(name.length);
  return term === "forever"
    ? annual * FOREVER_MULTIPLE
    : annual * Number(term.slice(0, -1));
}

/** Convert a USD amount to zats at `usdPerZec`, rounded up to the 100k-zat step. */
export function usdToZats(usd: number, usdPerZec: number): number {
  const zats = Math.ceil((usd * 100_000_000) / usdPerZec);
  return Math.ceil(zats / ZAT_STEP) * ZAT_STEP;
}

/**
 * Live zats quote for a 1-year claim of `name` — the default term the UI
 * quotes. Throws when the exchange rate is temporarily unavailable.
 */
export async function quoteClaimZats(name: string, term: ClaimTerm): Promise<number> {
  const usdPerZec = await getExchangeRate();
  if (!usdPerZec) throw new Error("Exchange rate unavailable — try again shortly.");
  return usdToZats(claimUsd(name, term), usdPerZec);
}
