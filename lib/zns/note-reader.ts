//
// Note Reader — a small typed client for the Name Note resolver's JSON-RPC.
//
// The current zcashname-sdk (0.10) already speaks the new resolver's wire
// protocol for reads, but its response types predate the Name Note record
// shape — they have no `expires_at`, `action_index`, or `viewing_key`. This
// module fetches the same RPC endpoints directly and types the fields the
// explorer UI needs.
//
// It is deliberately temporary: when the codebase switches to a
// single SDK version that understands Name Notes, this file is deleted.
//
// Endpoint: process.env.ZNS_TESTNET_RPC_URL — the same variable the existing
// testnet SDK instance already uses in production.
//
import "server-only";

const ENDPOINT = process.env.ZNS_TESTNET_RPC_URL ?? "";

/** Lifecycle verbs as recorded by the resolver (lowercase). */
export type NoteVerb = "claim" | "update" | "release";

export interface NoteStatus {
  syncedHeight: number;
  synced: boolean;
  viewingKey: string;
  registered: number;
}

export interface NoteRegistration {
  name: string;
  address: string;
  txid: string;
  height: number;
  lastAction: NoteVerb;
  /** "none" for registrations without fixed expiration, else a Unix timestamp string. */
  expiresAt: string;
}

export interface NoteEvent {
  id: number;
  name: string;
  action: NoteVerb;
  txid: string;
  height: number;
  actionIndex: number;
  address: string;
  expiresAt: string;
}

export interface NoteEventsFilter {
  name?: string;
  action?: NoteVerb;
  sinceHeight?: number;
  limit?: number;
  offset?: number;
}

export interface NoteEventsPage {
  events: NoteEvent[];
  total: number;
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!ENDPOINT) throw new Error("Testnet resolver URL is not configured.");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resolver HTTP ${res.status}`);
  const payload = (await res.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? "Resolver RPC error");
  return payload.result as T;
}

/** Resolver operational status, including the viewing key used to observe Name Notes. */
export async function noteStatus(): Promise<NoteStatus | null> {
  try {
    const raw = await rpc<Record<string, unknown>>("status");
    return {
      syncedHeight: Number(raw.synced_height ?? 0),
      synced: Boolean(raw.synced),
      viewingKey: String(raw.viewing_key ?? ""),
      registered: Number(raw.registered ?? 0),
    };
  } catch {
    return null;
  }
}

async function mapRegistration(raw: Record<string, unknown>): Promise<NoteRegistration> {
  return {
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    txid: String(raw.txid ?? ""),
    height: Number(raw.height ?? 0),
    lastAction: (raw.last_action === "update" || raw.last_action === "release"
      ? raw.last_action
      : "claim") as NoteVerb,
    expiresAt: String(raw.expires_at ?? "none"),
  };
}

/** Resolve one name, or null when it is not registered. */
export async function noteResolve(name: string): Promise<NoteRegistration | null> {
  try {
    const raw = await rpc<Record<string, unknown> | null>("resolve", { query: name });
    return raw ? await mapRegistration(raw) : null;
  } catch {
    return null;
  }
}

/** All live registrations, oldest-cursor pagination per the resolver's limits. */
export async function noteRegistrations(limit?: number, offset?: number): Promise<NoteRegistration[]> {
  try {
    const raw = await rpc<Record<string, unknown>[]>("resolve", { query: "", limit, offset });
    return Promise.all(raw.map(mapRegistration));
  } catch {
    return [];
  }
}

/** Event log entries for names, optionally filtered. */
export async function noteEvents(
  filter: NoteEventsFilter = {},
): Promise<NoteEventsPage> {
  const params: Record<string, unknown> = {};
  if (filter.name) params.name = filter.name;
  if (filter.action) params.action = filter.action;
  if (filter.limit !== undefined) params.limit = filter.limit;
  if (filter.offset !== undefined) params.offset = filter.offset;
  try {
    const raw = await rpc<{ events?: Record<string, unknown>[]; total?: number }>(
      "events",
      params,
    );
    return {
      events: (raw.events ?? []).map((ev) => ({
        id: Number(ev.id ?? 0),
        name: String(ev.name ?? ""),
        action: (ev.action === "update" || ev.action === "release" ? ev.action : "claim") as NoteVerb,
        txid: String(ev.txid ?? ""),
        height: Number(ev.height ?? 0),
        actionIndex: Number(ev.action_index ?? 0),
        address: String(ev.address ?? ""),
        expiresAt: String(ev.expires_at ?? "none"),
      })),
      total: Number(raw.total ?? 0),
    };
  } catch {
    return { events: [], total: 0 };
  }
}
