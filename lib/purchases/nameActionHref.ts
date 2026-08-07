import type { Action, Network, ResolveName } from "@/lib/types";

/** Lowercase path segment → Action */
const ACTION_FROM_SLUG: Record<string, Action> = {
  claim: "CLAIM",
  buy: "BUY",
  update: "UPDATE",
  list: "LIST",
  delist: "DELIST",
  release: "RELEASE",
};

const SLUG_FROM_ACTION: Record<Action, string> = {
  CLAIM: "claim",
  BUY: "buy",
  UPDATE: "update",
  LIST: "list",
  DELIST: "delist",
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
    case "protected":
      return ["CLAIM"];
    case "registered":
      return ["UPDATE", "LIST", "RELEASE"];
    case "listed":
      return ["BUY", "DELIST", "RELEASE"];
    case "blocked":
      return [];
  }
}

export type ActionDenial = {
  ok: false;
  reason: string;
  /** Optional inline link rendered after `reason` (e.g. BUY on available → claim). */
  link?: { href: string; label: string; suffix?: string };
};

export type ActionGateResult = { ok: true } | ActionDenial;

function denialForAction(
  action: Action,
  resolve: ResolveName,
  network: Network = "mainnet",
): ActionDenial {
  const status = resolve.status;

  if (action === "DELIST" && status === "listed" && resolve.pendingBuy) {
    return { ok: false, reason: "Cannot delist while a purchase is pending." };
  }

  if (action === "LIST" && (status === "available" || status === "protected" || status === "blocked")) {
    return { ok: false, reason: "You cannot list a name that is not yet claimed." };
  }
  if (action === "LIST" && status === "listed") {
    return { ok: false, reason: "This name is already listed for sale." };
  }

  if (action === "DELIST" && (status === "available" || status === "protected" || status === "blocked" || status === "registered")) {
    return { ok: false, reason: "You cannot delist a name that is not listed in the marketplace." };
  }

  if (action === "RELEASE" && (status === "available" || status === "protected" || status === "blocked")) {
    return { ok: false, reason: "You cannot release a name that is not yet claimed." };
  }

  if (action === "UPDATE" && (status === "available" || status === "protected" || status === "blocked")) {
    return { ok: false, reason: "You cannot update a name that is not yet claimed." };
  }

  if (action === "BUY" && (status === "available" || status === "protected")) {
    return {
      ok: false,
      reason: "You cannot buy a name that is not listed in the marketplace. However, this name can be ",
      link: {
        href: nameActionHref("CLAIM", resolve.query, network),
        label: "claimed",
        suffix: "!",
      },
    };
  }
  if (action === "BUY" && (status === "registered" || status === "blocked")) {
    return { ok: false, reason: "You cannot buy a name that is not listed in the marketplace." };
  }

  if (action === "CLAIM" && (status === "registered" || status === "listed")) {
    return { ok: false, reason: "This name has already been claimed." };
  }
  if (action === "CLAIM" && status === "blocked") {
    return { ok: false, reason: "This name cannot be registered." };
  }

  return {
    ok: false,
    reason: `This action is not available for a name with status “${status}”.`,
  };
}

export function isActionAllowed(
  action: Action,
  resolve: ResolveName,
  network: Network = "mainnet",
): ActionGateResult {
  const allowed = actionsForResolve(resolve);
  if (!allowed.includes(action)) {
    return denialForAction(action, resolve, network);
  }
  if (action === "DELIST" && resolve.status === "listed" && resolve.pendingBuy) {
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

