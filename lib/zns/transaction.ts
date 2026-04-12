"use server";

import {
  resolve,
  fetchClaimCost,
  buildClaimMemo,
  buildBuyMemo,
  buildListMemo,
  buildDelistMemo,
  buildReleaseMemo,
  buildUpdateMemo,
} from "@/lib/zns/client";
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

export async function checkUnlockCode(
  name: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizeUsername(name);
  const reserved = await getReservedName(normalized);
  if (!reserved || reserved.redeemed) return { ok: false, error: "This name is not reserved." };
  if (reserved.category === "offensive") return { ok: false, error: "This name is not available." };
  if (!verifyUnlockCode(normalized, code)) return { ok: false, error: "Invalid unlock code." };
  return { ok: true };
}

export type TransactionResult =
  | { ok: true; memo: string; amount: number; amountZec: number }
  | { ok: false; error: string };

export type AuthMode = "default" | "otp" | "sovereign";

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
  authMode?: AuthMode;
  sovereignSignature?: string;
  sovereignPubkey?: string;
  sovereignPayload?: string;
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

  const ownerAction =
    input.action === "update" || input.action === "list" || input.action === "delist" || input.action === "release";
  const authMode: AuthMode =
    input.authMode === "sovereign"
      ? "sovereign"
      : ownerAction
        ? "otp"
        : "default";

  const reg = ownerAction ? await resolve(name, network) : null;
  if (ownerAction) {
    if (!reg) return { ok: false, error: "Name is not registered." };
    if (authMode === "otp") {
      if (!input.memo || !input.otp) return { ok: false, error: "Verification required." };
      const valid = await verifyOtp(input.memo, input.otp, reg.address);
      if (!valid) return { ok: false, error: "Invalid code. Check your wallet and try again." };
    } else {
      if (!input.sovereignSignature?.trim()) {
        return { ok: false, error: "Signature is required for sovereign verification." };
      }
      if (!reg.pubkey && !input.sovereignPubkey?.trim()) {
        return { ok: false, error: "Owner public key unavailable. Refresh and try again." };
      }
    }
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
        if (costZats == null) return { ok: false, error: "Pricing unavailable - indexer may be down." };
        const memo =
          authMode === "sovereign"
            ? (() => {
                const sig = input.sovereignSignature?.trim();
                const pub = input.sovereignPubkey?.trim();
                if (!sig) throw new Error("Signature is required for sovereign claim.");
                if (!pub) throw new Error("Public key is required for sovereign claim.");
                return `${buildClaimMemo(name, address, sig)}:${pub}`;
              })()
            : await buildSignedClaimMemo(name, address, network);
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
        const memo =
          authMode === "sovereign"
            ? (() => {
                const sig = input.sovereignSignature?.trim();
                const pub = input.sovereignPubkey?.trim();
                if (!sig) throw new Error("Signature is required for sovereign buy.");
                if (!pub) throw new Error("Public key is required for sovereign buy.");
                return `${buildBuyMemo(name, address, sig)}:${pub}`;
              })()
            : await buildSignedBuyMemo(name, address, network);
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
        const memo =
          authMode === "sovereign"
            ? (() => {
                const sig = input.sovereignSignature?.trim();
                if (!sig) throw new Error("Signature is required for sovereign update.");
                const nonce = (reg?.nonce ?? 0) + 1;
                return buildUpdateMemo(name, address, nonce, sig);
              })()
            : (await buildSignedUpdateMemo(name, address, network)).memo;
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
        const memo =
          authMode === "sovereign"
            ? (() => {
                const sig = input.sovereignSignature?.trim();
                if (!sig) throw new Error("Signature is required for sovereign list.");
                const nonce = (reg?.nonce ?? 0) + 1;
                return buildListMemo(name, input.priceZats!, nonce, sig);
              })()
            : (await buildSignedListMemo(name, input.priceZats, network)).memo;
        return {
          ok: true,
          memo,
          amount: 100_000,
          amountZec: 0.001,
        };
      }
      case "delist": {
        const memo =
          authMode === "sovereign"
            ? (() => {
                const sig = input.sovereignSignature?.trim();
                if (!sig) throw new Error("Signature is required for sovereign delist.");
                const nonce = (reg?.nonce ?? 0) + 1;
                return buildDelistMemo(name, nonce, sig);
              })()
            : (await buildSignedDelistMemo(name, network)).memo;
        return {
          ok: true,
          memo,
          amount: 100_000,
          amountZec: 0.001,
        };
      }
      case "release": {
        const memo =
          authMode === "sovereign"
            ? (() => {
                const sig = input.sovereignSignature?.trim();
                if (!sig) throw new Error("Signature is required for sovereign release.");
                const nonce = (reg?.nonce ?? 0) + 1;
                return buildReleaseMemo(name, nonce, sig);
              })()
            : (await buildSignedReleaseMemo(name, network)).memo;
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
