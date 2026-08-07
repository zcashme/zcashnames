import type { Action, ActionAuth, Network } from "@/lib/types";
import {
  claimAction,
  buyAction,
  updateAction,
  listAction,
  delistAction,
  releaseAction,
} from "@/lib/zns/actions";

export interface ActionData {
  address: string; // CLAIM/BUY/UPDATE
  priceZats: number; // LIST
  payTaddr: string; // LIST
}

export type ServerReply =
  | { ok: true; uri: string; memo: string; paymentAddress: string; amountZec: string }
  | { ok: false; error: string };

export async function dispatchAction(
  action: Action,
  name: string,
  network: Network,
  data: ActionData,
  auth: ActionAuth,
): Promise<ServerReply> {
  const sig = auth.owner.kind === "sign" ? auth.owner.signature : undefined;
  const pub = auth.owner.kind === "sign" ? auth.owner.pubkey : undefined;
  const otp = auth.owner.kind === "otp" ? auth.owner.token : undefined;
  switch (action) {
    case "CLAIM":
      return claimAction(name, data.address, network, auth.protectedUnlock, sig, pub);
    case "BUY":
      return buyAction(name, data.address, network, undefined, sig, pub);
    case "UPDATE":
      return updateAction(name, data.address, network, otp, sig, pub);
    case "LIST":
      return listAction(name, data.priceZats, data.payTaddr, network, otp, sig, pub);
    case "DELIST":
      return delistAction(name, network, otp, sig, pub);
    case "RELEASE":
      return releaseAction(name, network, otp, sig, pub);
  }
}
