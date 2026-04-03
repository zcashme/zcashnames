"use server";

import { resolve, fetchClaimCost } from "@/lib/zns/client";
import {
  buildSignedClaimMemo,
  buildSignedBuyMemo,
  buildSignedListMemo,
  buildSignedDelistMemo,
  buildSignedReleaseMemo,
  buildSignedUpdateMemo,
} from "@/lib/zns/admin";
import { normalizeUsername, isValidUsername, validateAddress, zatsToZec, type Network } from "@/lib/zns/name";
import { type Action, MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import { verifyOtp } from "@/lib/payment/otp";
import { getReservedName, verifyUnlockCode } from "@/lib/zns/reserved";

const NETWORK_PASSWORDS: Record<Network, string | undefined> = {
  testnet: process.env.TESTNET_PASSWORD,
  mainnet: process.env.MAINNET_PASSWORD,
};

function verifyNetworkPassword(network: Network, password: string | undefined): boolean {
  const expected = NETWORK_PASSWORDS[network];
  if (!expected) return false;
  return password === expected;
}

export async function checkNetworkPassword(
  network: Network,
  password: string
): Promise<{ ok: boolean }> {
  return { ok: verifyNetworkPassword(network, password) };
}

export type TransactionResult =
  | { ok: true; memo: string; amount: number; amountZec: number }
  | { ok: false; error: string };

interface TransactionInput {
  name: string;
  action: Action;
  address?: string;
  priceZats?: number;
  network?: Network;
  password?: string;
  memo?: string;
  otp?: string;
  unlockCode?: string;
}

export async function buildTransaction(input: TransactionInput): Promise<TransactionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) {
    return { ok: false, error: "Invalid name." };
  }

  const network: Network = input.network === "mainnet" ? "mainnet" : "testnet";

  if (!verifyNetworkPassword(network, input.password)) {
    return { ok: false, error: "Invalid network password." };
  }
  const needsOtp = input.action === "update" || input.action === "list" || input.action === "delist" || input.action === "release";

  let reg = needsOtp ? await resolve(name, network) : null;
  if (needsOtp) {
    if (!reg) return { ok: false, error: "Name is not registered." };
    if (!input.memo || !input.otp) return { ok: false, error: "Verification required." };
    const valid = await verifyOtp(input.memo, input.otp, reg.address);
    if (!valid) return { ok: false, error: "Invalid code. Check your wallet and try again." };
  }

  try {
    switch (input.action) {
      case "claim": {
        const address = input.address?.trim();
        if (!address) return { ok: false, error: "Address is required." };
        const addrCheck = validateAddress(address);
        if (!addrCheck.valid) return { ok: false, error: addrCheck.warning || "Invalid address format." };

        const reserved = await getReservedName(name);
        if (reserved && !reserved.redeemed) {
          if (reserved.category === "offensive") {
            return { ok: false, error: "This name is not available." };
          }
          if (!input.unlockCode) {
            return { ok: false, error: "Unlock code is required for this name." };
          }
          if (!verifyUnlockCode(name, input.unlockCode)) {
            return { ok: false, error: "Invalid unlock code." };
          }
        }

        const costZats = await fetchClaimCost(name, network);
        if (costZats == null) return { ok: false, error: "Pricing unavailable — indexer may be down." };
        const memo = await buildSignedClaimMemo(name, address, network);
        return {
          ok: true,
          memo,
          amount: costZats,
          amountZec: zatsToZec(costZats),
        };
      }
      case "buy": {
        const address = input.address?.trim();
        if (!address) return { ok: false, error: "Address is required." };
        const addrCheck = validateAddress(address);
        if (!addrCheck.valid) return { ok: false, error: addrCheck.warning || "Invalid address format." };
        const buyReg = await resolve(name, network);
        if (!buyReg?.listing) return { ok: false, error: "Name is not listed for sale." };
        const memo = await buildSignedBuyMemo(name, address, network);
        return {
          ok: true,
          memo,
          amount: buyReg.listing.price,
          amountZec: zatsToZec(buyReg.listing.price),
        };
      }
      case "update": {
        const address = input.address?.trim();
        if (!address) return { ok: false, error: "Address is required for update." };
        const addrCheck = validateAddress(address);
        if (!addrCheck.valid) return { ok: false, error: addrCheck.warning || "Invalid address format." };
        const { memo } = await buildSignedUpdateMemo(name, address, network);
        return {
          ok: true,
          memo,
          amount: 100_000,
          amountZec: 0.001,
        };
      }
      case "list": {
        const maxZats = MAX_LIST_FOR_SALE_AMOUNT * 100_000_000;
        if (!input.priceZats || input.priceZats < 100_000 || input.priceZats > maxZats) {
          return { ok: false, error: "Price must be between 0.001 and 21,000,000 ZEC." };
        }
        const { memo } = await buildSignedListMemo(name, input.priceZats, network);
        return {
          ok: true,
          memo,
          amount: 100_000,
          amountZec: 0.001,
        };
      }
      case "delist": {
        const { memo } = await buildSignedDelistMemo(name, network);
        return {
          ok: true,
          memo,
          amount: 100_000,
          amountZec: 0.001,
        };
      }
      case "release": {
        const { memo } = await buildSignedReleaseMemo(name, network);
        return {
          ok: true,
          memo,
          amount: 100_000,
          amountZec: 0.001,
        };
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Transaction failed.",
    };
  }
}
