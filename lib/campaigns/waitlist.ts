import "server-only";

import { db } from "@/lib/db";
import type {
  CampaignAudienceScope,
  CampaignDedupeMode,
  CampaignRecipient,
  CampaignRecipientPersonalization,
  CampaignSourceKind,
} from "@/lib/campaigns/types";

interface WaitlistRow {
  id: string;
  name: string | null;
  email: string | null;
  referral_code: string | null;
  human_referral_code: string | null;
  email_verified: boolean | null;
  may_contact: boolean | null;
  created_at: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function preferredReferralCode(row: WaitlistRow): string | null {
  return row.human_referral_code || row.referral_code || null;
}

function compareRows(a: WaitlistRow, b: WaitlistRow): number {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

function buildPersonalization(rows: WaitlistRow[], baseUrl: string): CampaignRecipientPersonalization {
  const sorted = [...rows].sort(compareRows);
  const representative = sorted[0];
  const code = preferredReferralCode(representative);
  return {
    name: representative.name?.trim() || "there",
    referralCode: code,
    referralUrl: code ? `${baseUrl}/?ref=${encodeURIComponent(code)}` : null,
    dashboardUrl: code ? `${baseUrl}/leaders/ref/${encodeURIComponent(code)}` : null,
    relatedNames: sorted
      .map((row) => row.name?.trim())
      .filter((name): name is string => Boolean(name)),
  };
}

function rowToRecipient(row: WaitlistRow, baseUrl: string): CampaignRecipient | null {
  const email = row.email?.trim();
  if (!email) return null;
  const normalizedEmail = normalizeEmail(email);
  return {
    recipientKey: row.id,
    email,
    normalizedEmail,
    sourceKind: "zn_waitlist",
    sourceRowIds: [row.id],
    personalization: buildPersonalization([row], baseUrl),
  };
}

export async function listWaitlistRecipients(args?: {
  sourceKind?: CampaignSourceKind;
  audienceScope?: CampaignAudienceScope;
  dedupeMode?: CampaignDedupeMode;
  baseUrl?: string;
}): Promise<CampaignRecipient[]> {
  const audienceScope = args?.audienceScope ?? "verified_only";
  const dedupeMode = args?.dedupeMode ?? "one_per_email";
  const baseUrl = args?.baseUrl ?? "https://zcashnames.com";

  const { data, error } = await db
    .from("zn_waitlist")
    .select("id, name, email, referral_code, human_referral_code, email_verified, may_contact, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as WaitlistRow[]).filter((row) => {
    const email = row.email?.trim();
    if (!email) return false;
    if (audienceScope === "verified_only") return Boolean(row.email_verified);
    if (audienceScope === "contactable_only") {
      return Boolean(row.email_verified) && Boolean(row.may_contact);
    }
    return true;
  });

  if (dedupeMode === "one_per_row") {
    return rows
      .map((row) => rowToRecipient(row, baseUrl))
      .filter((recipient): recipient is CampaignRecipient => Boolean(recipient));
  }

  const grouped = new Map<string, WaitlistRow[]>();
  for (const row of rows) {
    const normalizedEmail = normalizeEmail(row.email!);
    const group = grouped.get(normalizedEmail);
    if (group) group.push(row);
    else grouped.set(normalizedEmail, [row]);
  }

  return Array.from(grouped.entries()).map(([normalizedEmail, group]) => ({
    recipientKey: normalizedEmail,
    email: group[0].email!.trim(),
    normalizedEmail,
    sourceKind: "zn_waitlist",
    sourceRowIds: group.map((row) => row.id),
    personalization: buildPersonalization(group, baseUrl),
  }));
}
