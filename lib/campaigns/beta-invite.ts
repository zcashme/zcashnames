import "server-only";

import { db } from "@/lib/db";
import { resolveSiteUrl } from "@/lib/site-url";

export interface CampaignBetaInviteData {
  betaDisplayName: string | null;
  betaInviteCode: string | null;
  betaInviteLink: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function escapeIlikeValue(value: string): string {
  return value.replace(/([,%_])/g, "\\$1");
}

function buildBetaInviteLink(inviteCode: string, baseUrl?: string | null): string {
  const resolvedBaseUrl = (baseUrl?.trim() || resolveSiteUrl()).replace(/\/$/, "");
  return `${resolvedBaseUrl}/beta/join?code=${encodeURIComponent(inviteCode)}&stage=mainnet`;
}

export async function getBetaInviteDataByEmail(args: {
  emails: string[];
  baseUrl?: string | null;
}): Promise<Map<string, CampaignBetaInviteData>> {
  const normalizedEmails = [...new Set(args.emails.map(normalizeEmail).filter(Boolean))];
  const result = new Map<string, CampaignBetaInviteData>();
  if (normalizedEmails.length === 0) return result;

  const CHUNK_SIZE = 100;
  for (let index = 0; index < normalizedEmails.length; index += CHUNK_SIZE) {
    const chunk = normalizedEmails.slice(index, index + CHUNK_SIZE);
    const orFilter = chunk
      .map((email) => `contact_email.ilike.${escapeIlikeValue(email)}`)
      .join(",");
    const { data, error } = await db
      .from("beta_testers_v2")
      .select("contact_email, display_name, invite_code")
      .or(orFilter);
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const contactEmail =
        typeof row.contact_email === "string" ? normalizeEmail(row.contact_email) : null;
      const displayName =
        typeof row.display_name === "string" && row.display_name.trim()
          ? row.display_name.trim()
          : null;
      const inviteCode =
        typeof row.invite_code === "string" && row.invite_code.trim()
          ? row.invite_code.trim()
          : null;
      if (!contactEmail) continue;
      result.set(contactEmail, {
        betaDisplayName: displayName,
        betaInviteCode: inviteCode,
        betaInviteLink: inviteCode
          ? buildBetaInviteLink(inviteCode, args.baseUrl)
          : null,
      });
    }
  }

  return result;
}

export function sampleBetaInviteData(baseUrl?: string | null): CampaignBetaInviteData {
  const betaInviteCode = "SAMPLECODE";
  return {
    betaDisplayName: "Sample Beta Tester",
    betaInviteCode,
    betaInviteLink: buildBetaInviteLink(betaInviteCode, baseUrl),
  };
}
