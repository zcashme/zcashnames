import "server-only";

import { db } from "@/lib/db";

export const CAMPAIGN_SUPPRESSION_REASONS = [
  "manual_block",
  "hard_bounce",
  "complaint",
  "provider_suppressed",
] as const;

export type CampaignSuppressionReason =
  (typeof CAMPAIGN_SUPPRESSION_REASONS)[number];

export interface CampaignSuppressionRecord {
  id: string;
  email: string;
  normalized_email: string;
  reason: CampaignSuppressionReason;
  source: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const CAMPAIGN_SUPPRESSION_MIGRATION_PATH =
  "sql/2026-07-06-campaign-suppression-and-health.sql";

export function normalizeSuppressionEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      typeof record.message === "string" ? record.message : null,
      typeof record.details === "string" ? record.details : null,
      typeof record.hint === "string" ? record.hint : null,
      typeof record.code === "string" ? `code: ${record.code}` : null,
    ].filter((value): value is string => Boolean(value && value.trim()));
    if (parts.length > 0) return parts.join(" ");
  }
  return String(error);
}

export function campaignSuppressionMigrationMessage(): string {
  return `Campaign suppression schema is not installed. Run ${CAMPAIGN_SUPPRESSION_MIGRATION_PATH} and refresh.`;
}

export function isCampaignSuppressionMigrationError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("campaign_suppressions") &&
    (message.includes("schema cache") ||
      message.includes("could not find the table") ||
      message.includes("does not exist"))
  );
}

function normalizeSuppressionError(error: unknown): Error {
  if (isCampaignSuppressionMigrationError(error)) {
    return new Error(campaignSuppressionMigrationMessage());
  }
  return error instanceof Error ? error : new Error(extractErrorMessage(error));
}

function mapSuppressionRecord(
  row: Record<string, unknown>,
): CampaignSuppressionRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    normalized_email: String(row.normalized_email),
    reason: row.reason as CampaignSuppressionReason,
    source: String(row.source),
    notes: row.notes ? String(row.notes) : null,
    active: Boolean(row.active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listActiveSuppressions(
  limit = 25,
): Promise<CampaignSuppressionRecord[]> {
  try {
    const { data, error } = await db
      .from("campaign_suppressions")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map(
      mapSuppressionRecord,
    );
  } catch (error) {
    if (isCampaignSuppressionMigrationError(error)) return [];
    throw normalizeSuppressionError(error);
  }
}

export async function listActiveSuppressedEmailSet(
  emails: string[],
): Promise<Set<string>> {
  const normalizedEmails = [...new Set(emails.map(normalizeSuppressionEmail).filter(Boolean))];
  if (normalizedEmails.length === 0) return new Set<string>();

  try {
    const { data, error } = await db
      .from("campaign_suppressions")
      .select("normalized_email")
      .eq("active", true)
      .in("normalized_email", normalizedEmails);
    if (error) throw error;

    return new Set(
      ((data ?? []) as Array<{ normalized_email?: string | null }>)
        .map((row) => row.normalized_email?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    );
  } catch (error) {
    if (isCampaignSuppressionMigrationError(error)) return new Set<string>();
    throw normalizeSuppressionError(error);
  }
}

export async function suppressCampaignEmail(args: {
  email: string;
  reason: CampaignSuppressionReason;
  source: string;
  notes?: string | null;
}): Promise<void> {
  const normalizedEmail = normalizeSuppressionEmail(args.email);
  if (!normalizedEmail) throw new Error("Email is required.");
  if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email address.");

  const nowIso = new Date().toISOString();
  const { data: existing, error: existingError } = await db
    .from("campaign_suppressions")
    .select("id")
    .eq("normalized_email", normalizedEmail)
    .eq("reason", args.reason)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (existingError) throw normalizeSuppressionError(existingError);

  if (existing?.id) {
    const { error: updateError } = await db
      .from("campaign_suppressions")
      .update({
        email: normalizedEmail,
        source: args.source,
        notes: args.notes?.trim() || null,
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (updateError) throw normalizeSuppressionError(updateError);
    return;
  }

  const { error } = await db.from("campaign_suppressions").insert({
    email: normalizedEmail,
    normalized_email: normalizedEmail,
    reason: args.reason,
    source: args.source,
    notes: args.notes?.trim() || null,
    active: true,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (error) throw normalizeSuppressionError(error);
}

export async function clearCampaignSuppression(id: string): Promise<void> {
  const { error } = await db
    .from("campaign_suppressions")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw normalizeSuppressionError(error);
}
