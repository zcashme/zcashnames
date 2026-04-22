"use server";

import { fetchClaimCost, getZns } from "@/lib/zns/client";
import {
  buildSignedClaimAction,
  buildSignedBuyAction,
  buildSignedListAction,
  buildSignedDelistAction,
  buildSignedReleaseAction,
  buildSignedUpdateAction,
} from "@/lib/zns/admin";
import { normalizeUsername, isValidUsername, validateAddress, type Network } from "@/lib/zns/name";
import { type Action, MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import { verifyOtp } from "@/lib/payment/otp";
import { getReservedName, verifyUnlockCode } from "@/lib/zns/reserved";
import { readCurrentStage } from "@/lib/beta/gate";

const NETWORK_PASSWORDS: Record<Network, string | undefined> = {
  testnet: process.env.TESTNET_PASSWORD,
  mainnet: process.env.MAINNET_PASSWORD,
};

function verifyNetworkPassword(network: Network, password: string | undefined): boolean {
  const expected = NETWORK_PASSWORDS[network];
  if (!expected) return false;
  return password === expected;
}

async function verifyNetworkAccess(network: Network, password: string | undefined): Promise<boolean> {
  if (verifyNetworkPassword(network, password)) return true;
  const cookieStage = await readCurrentStage();
  return cookieStage === network;
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

type TransactionResult =
  | { ok: true; uri: string }
  | { ok: false; error: string };

type AuthMode = "default" | "otp" | "sovereign";

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

  if (!(await verifyNetworkAccess(network, input.password))) {
    return { ok: false, error: "Invalid network password." };
  }

  const zns = getZns(network);

  const ownerAction =
    input.action === "update" || input.action === "list" || input.action === "delist" || input.action === "release";
  const authMode: AuthMode =
    input.authMode === "sovereign"
      ? "sovereign"
      : ownerAction
        ? "otp"
        : "default";

  const reg = ownerAction ? await zns.resolveName(name) : null;
  if (ownerAction) {
    if (!reg) return { ok: false, error: "Name is not registered." };
    if (authMode === "otp" && reg.pubkey) {
      return { ok: false, error: "This name is controlled by a keypair. Use sovereign signing." };
    }
    if (authMode === "sovereign" && !reg.pubkey) {
      return { ok: false, error: "This name is controlled by passcodes. Use passcode verification." };
    }
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

  const ownerNonce = (reg?.nonce ?? 0) + 1;
  const ownerPubkey = reg?.pubkey ?? input.sovereignPubkey?.trim();

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

        if (authMode === "sovereign") {
          const sig = input.sovereignSignature?.trim();
          const pub = input.sovereignPubkey?.trim();
          if (!sig) throw new Error("Signature is required for sovereign claim.");
          if (!pub) throw new Error("Public key is required for sovereign claim.");
          return { ok: true, uri: zns.prepareClaim(name, address, costZats).complete(sig, pub).uri };
        } else {
          return { ok: true, uri: (await buildSignedClaimAction(name, address, network)).uri };
        }
      }
      case "buy": {
        const address = input.address?.trim();
        if (!address) return { ok: false, error: "Address is required." };
        const addrCheck = validateAddress(address);
        if (!addrCheck.valid) return { ok: false, error: addrCheck.warning || "Invalid address format." };
        const buyReg = await zns.resolveName(name);
        if (!buyReg?.listing) return { ok: false, error: "Name is not listed for sale." };

        if (authMode === "sovereign") {
          const sig = input.sovereignSignature?.trim();
          const pub = input.sovereignPubkey?.trim();
          if (!sig) throw new Error("Signature is required for sovereign buy.");
          if (!pub) throw new Error("Public key is required for sovereign buy.");
          return { ok: true, uri: zns.prepareBuy(name, address).complete(sig, pub).uri };
        } else {
          return { ok: true, uri: (await buildSignedBuyAction(name, address, network)).uri };
        }
      }
      case "update": {
        const address = input.address?.trim();
        if (!address) return { ok: false, error: "Address is required for update." };
        const addrCheck = validateAddress(address);
        if (!addrCheck.valid) return { ok: false, error: addrCheck.warning || "Invalid address format." };

        if (authMode === "sovereign") {
          const sig = input.sovereignSignature!.trim();
          return { ok: true, uri: zns.prepareUpdate(name, address, ownerNonce).complete(sig, ownerPubkey).uri };
        } else {
          return { ok: true, uri: (await buildSignedUpdateAction(name, address, network)).action.uri };
        }
      }
      case "list": {
        const maxZats = MAX_LIST_FOR_SALE_AMOUNT * 100_000_000;
        if (input.priceZats === undefined || input.priceZats < 0 || input.priceZats > maxZats) {
          return { ok: false, error: "Price must be between 0 and 21,000,000 ZEC." };
        }

        if (authMode === "sovereign") {
          const sig = input.sovereignSignature!.trim();
          return { ok: true, uri: zns.prepareList(name, input.priceZats, ownerNonce).complete(sig, ownerPubkey).uri };
        } else {
          return { ok: true, uri: (await buildSignedListAction(name, input.priceZats, network)).action.uri };
        }
      }
      case "delist": {
        if (authMode === "sovereign") {
          const sig = input.sovereignSignature!.trim();
          return { ok: true, uri: zns.prepareDelist(name, ownerNonce).complete(sig, ownerPubkey).uri };
        } else {
          return { ok: true, uri: (await buildSignedDelistAction(name, network)).action.uri };
        }
      }
      case "release": {
        if (authMode === "sovereign") {
          const sig = input.sovereignSignature!.trim();
          return { ok: true, uri: zns.prepareRelease(name, ownerNonce).complete(sig, ownerPubkey).uri };
        } else {
          return { ok: true, uri: (await buildSignedReleaseAction(name, network)).action.uri };
        }
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Transaction failed.",
    };
  }
}
