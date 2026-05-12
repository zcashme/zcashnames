"use server";

// Server action for the indexer launch alert signup form.
// Validates display name, contact methods, and preferred contact;
// hashes the client IP with SHA-256 before storing in Supabase.
// Returns typed result (ok/error) consumed by the form component.
import { createHash } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { CONTACT_KINDS, type ContactKind } from "@/lib/types";

const MAX_NAME = 60;
const MAX_CONTACT = 200;

export type IndexerLaunchAlertResult =
  | { ok: true }
  | { ok: false; error: string };

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const secret = process.env.BETA_GATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

async function readClientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ip: ip || null, userAgent: userAgent || null };
}

export async function submitIndexerLaunchAlert(
  formData: FormData,
): Promise<IndexerLaunchAlertResult> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const newsletter = String(formData.get("newsletter") ?? "") === "true";

  if (!displayName) return { ok: false, error: "Display name is required." };
  if (displayName.length > MAX_NAME) {
    return { ok: false, error: "Display name is too long." };
  }

  const contacts: Record<ContactKind, string> = {
    email: "",
    signal: "",
    discord: "",
    x: "",
    telegram: "",
    forum: "",
  };

  for (const kind of CONTACT_KINDS) {
    const value = String(formData.get(`contact_${kind}`) ?? "").trim();
    if (value.length > MAX_CONTACT) {
      return { ok: false, error: `${kind} contact is too long.` };
    }
    contacts[kind] = value;
  }

  if (contacts.email && !isValidEmail(contacts.email)) {
    return { ok: false, error: "Email address is not valid." };
  }

  const filledKinds = CONTACT_KINDS.filter((kind) => contacts[kind].length > 0);
  if (filledKinds.length === 0) {
    return { ok: false, error: "Add at least one contact method." };
  }

  let bestContactKind = String(formData.get("best_contact_kind") ?? "").trim() as ContactKind | "";
  if (filledKinds.length === 1) {
    bestContactKind = filledKinds[0];
  } else if (!filledKinds.includes(bestContactKind as ContactKind)) {
    return { ok: false, error: "Pick which contact you'd like us to use." };
  }

  if (!contacts[bestContactKind as ContactKind]) {
    return { ok: false, error: "Preferred contact must have a value." };
  }

  const { ip, userAgent } = await readClientMeta();

  const { error } = await db.from("indexer_launch_alert_signups").insert({
    display_name: displayName,
    contact_email: contacts.email || null,
    contact_signal: contacts.signal || null,
    contact_discord: contacts.discord || null,
    contact_x: contacts.x || null,
    contact_telegram: contacts.telegram || null,
    contact_forum: contacts.forum || null,
    best_contact_kind: bestContactKind,
    newsletter,
    source_page: "/indexerbb",
    ip_hash: hashIp(ip),
    user_agent: userAgent,
  });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { ok: false, error: "That email is already signed up for launch alerts." };
    }
    console.error("[indexer-launch-alert] insert failed:", error);
    return { ok: false, error: "Couldn't save your signup. Try again." };
  }

  return { ok: true };
}
