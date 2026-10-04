import type { Action, Network, ResolveName } from "@/lib/types";
import { isMintNetworkEnabled, getMintConfig } from "@/lib/zns/mint-config";

/** Lowercase path segment → Action */
const ACTION_FROM_SLUG: Record<string, Action> = {
  claim: "CLAIM",
  update: "UPDATE",
  release: "RELEASE",
};

const SLUG_FROM_ACTION: Record<Action, string> = {
  CLAIM: "claim",
  UPDATE: "update",
  RELEASE: "release",
};

export function actionToSlug(action: Action): string {
  return SLUG_FROM_ACTION[action];
}

export function slugToAction(slug: string): Action | null {
  return ACTION_FROM_SLUG[slug.toLowerCase()] ?? null;
}

export function isActionSlug(slug: string): boolean {
  return slugToAction(slug) !== null;
}

/** Actions that NameStatusButtons expose for a resolve status. */
export function actionsForResolve(resolve: ResolveName): Action[] {
  switch (resolve.status) {
    case "available":
      return ["CLAIM"];
    case "registered":
      return ["UPDATE", "RELEASE"];
    case "blocked":
      return [];
  }
}

export type ActionDenial = {
  ok: false;
  reason: string;
  /** Optional link rendered on its own line after `reason` (e.g. UPDATE on available → claim). */
  link?: { href: string; label: string; prefix?: string; suffix?: string };
};

export type ActionGateResult = { ok: true } | ActionDenial;

function denialForAction(
  action: Action,
  resolve: ResolveName,
  network: Network,
): ActionDenial {
  const status = resolve.status;

  if (action === "RELEASE" && status !== "registered") {
    return { ok: false, reason: "You cannot release a name that is not claimed." };
  }

  if (action === "UPDATE" && status !== "registered") {
    return {
      ok: false,
      reason: "You cannot update a name that is not claimed.",
      link: status === "available"
        ? {
            href: nameActionHref("CLAIM", resolve.query, network),
            label: "claimed",
            prefix: "However, this name can be ",
            suffix: "!",
          }
        : undefined,
    };
  }

  if (action === "CLAIM") {
    if (status === "registered") {
      return { ok: false, reason: "This name has already been claimed." };
    }
    if (status === "blocked") {
      return { ok: false, reason: "This name cannot be registered." };
    }
    if (!getMintConfig(network).allowOpenClaims) {
      return {
        ok: false,
        reason: "Open claims are not enabled on this network yet.",
      };
    }
  }

  return {
    ok: false,
    reason: `This action is not available for a name with status “${status}”.`,
  };
}

export function isActionAllowed(
  action: Action,
  resolve: ResolveName,
  network: Network = "testnet",
): ActionGateResult {
  // The whole network can be offline (mainnet for now): every action is denied.
  if (!isMintNetworkEnabled(network)) {
    return {
      ok: false,
      reason: "The mint for this network is not online yet. Testnet is live.",
    };
  }
  const allowed = actionsForResolve(resolve);
  if (!allowed.includes(action)) {
    return denialForAction(action, resolve, network);
  }
  return { ok: true };
}

/**
 * Form-page URL: `/{action}/{name}?network=testnet`
 * Network is omitted when mainnet (optional query).
 */
export function nameActionHref(
  action: Action,
  name: string,
  network: Network = "mainnet",
): string {
  const slug = actionToSlug(action);
  const path = `/${slug}/${encodeURIComponent(name)}`;
  if (network === "testnet") {
    return `${path}?network=testnet`;
  }
  return path;
}

export function explorerNameHref(name: string, network: Network = "mainnet"): string {
  const params = new URLSearchParams();
  if (network === "testnet") params.set("env", "testnet");
  params.set("name", name);
  return `/explorer?${params.toString()}`;
}

export function parseNetworkParam(raw: string | null | undefined): Network {
  if (raw === "testnet") return "testnet";
  return "mainnet";
}
