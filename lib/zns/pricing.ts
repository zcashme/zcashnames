//
// Server-side live quotes on top of the pure pricing mirror
// (lib/zns/pricing-static.ts). These fetch the current ZEC/USD rate and
// hand the actions exact payment amounts.
//

import "server-only";

import { getExchangeRate } from "@/lib/exchange-rate";
import type { ClaimTerm, UpdateTerm } from "@/lib/zns/request-memo";
import {
  claimUsd,
  updateRespondUsd,
  usdToZats,
  REQUEST_FEE_USD,
} from "@/lib/zns/pricing-static";

async function usdToZatsLive(usd: number): Promise<number> {
  const rate = await getExchangeRate();
  if (!rate) throw new Error("Exchange rate unavailable — try again shortly.");
  return usdToZats(usd, rate);
}

/** Live zats quote for a claim payment (the name price on the claim Request). */
export async function quoteClaimZats(name: string, term: ClaimTerm): Promise<number> {
  return usdToZatsLive(claimUsd(name, term));
}

/** Live zats quote for the $1 Request fee (update/release Requests). */
export async function quoteRequestFeeZats(): Promise<number> {
  return usdToZatsLive(REQUEST_FEE_USD);
}

/** Live zats quote for an update Respond's name payment (0 for carry-forward). */
export async function quoteUpdateRespondZats(
  name: string,
  term: UpdateTerm,
): Promise<number> {
  return usdToZatsLive(updateRespondUsd(name, term));
}
