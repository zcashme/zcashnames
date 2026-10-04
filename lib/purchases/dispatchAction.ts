import type { Action, Network, ProtocolVerb } from "@/lib/types";
import {
  claimRequestAction,
  updateRequestAction,
  releaseRequestAction,
  otpRespondAction,
} from "@/lib/zns/actions";

export interface ActionData {
  address: string; // CLAIM/UPDATE target unified address
  term: string; // claim: "<N>y"|"forever" · update: "none"|"<N>y"|"forever"
}

export type ServerReply =
  | { ok: true; uri: string; memo: string; paymentAddress: string; amountZec: string }
  | { ok: false; error: string };

/**
 * Dispatch the first payment screen:
 *   CLAIM   → ZNS:claim:<term>:<name>:<ua>  + name price
 *   UPDATE  → ZNS:update:<term>:<name>:<ua> + $1 request fee
 *   RELEASE → ZNS:release:<name>:<ua>       + $1 request fee
 */
export async function dispatchRequest(
  action: Action,
  name: string,
  network: Network,
  data: ActionData,
): Promise<ServerReply> {
  switch (action) {
    case "CLAIM":
      return claimRequestAction(name, data.address, data.term, network);
    case "UPDATE":
      return updateRequestAction(name, data.address, data.term, network);
    case "RELEASE":
      return releaseRequestAction(name, network);
  }
}

/**
 * Build the Respond payment screen: ZNS:otp:<otp>:<name>:<verb>:<ua>.
 * The Respond carries the name payment for updates (extension/upgrade
 * price; zero for carry-forward and for releases).
 */
export async function dispatchRespond(
  verb: ProtocolVerb,
  name: string,
  network: Network,
  otp: string,
  ua: string,
  term: string,
): Promise<ServerReply> {
  return otpRespondAction(otp, name, verb, ua, term, network);
}
