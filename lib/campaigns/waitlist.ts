import "server-only";

import { db } from "@/lib/db";
import type {
  CampaignAudienceScope,
  CampaignBlockedRecipient,
  CampaignDedupeMode,
  CampaignRecipient,
  CampaignRecipientEstimate,
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
  newsletter: boolean | null;
  created_at: string | null;
}

const WAITLIST_PAGE_SIZE = 1000;
const WAITLIST_ESTIMATE_CACHE_TTL_MS = 60 * 1000;

type CachedWaitlistEstimate = {
  estimate: CampaignRecipientEstimate;
  expiresAt: number;
};

interface WaitlistEstimateRpcSampleRow {
  recipient_key: string;
  email: string;
  normalized_email: string;
  source_row_ids: string[];
  name: string;
  related_names: string[];
  referral_code: string | null;
  human_referral_code: string | null;
}

interface WaitlistEstimateRpcBlockedRow {
  email: string;
  normalizedEmail: string;
  reason: CampaignBlockedRecipient["reason"];
}

interface WaitlistEstimateRpcPayload {
  count: number;
  sample: WaitlistEstimateRpcSampleRow[];
  blocked: WaitlistEstimateRpcBlockedRow[];
}

interface WaitlistRecipientRpcRow {
  recipient_key: string;
  email: string;
  normalized_email: string;
  source_row_ids: string[];
  name: string;
  related_names: string[];
  referral_code: string | null;
  human_referral_code: string | null;
}

const waitlistEstimateCache = new Map<string, CachedWaitlistEstimate>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function buildPersonalization(
  rows: WaitlistRow[],
  baseUrl: string,
): CampaignRecipientPersonalization {
  const sorted = [...rows].sort(compareRows);
  const representative = sorted[0];
  const canonicalCode = representative.referral_code?.trim() || null;
  const code = preferredReferralCode(representative);
  return {
    name: representative.name?.trim() || "there",
    referralCode: canonicalCode,
    referralUrl: canonicalCode ? `${baseUrl}/?ref=${encodeURIComponent(canonicalCode)}` : null,
    dashboardUrl: canonicalCode
      ? `${baseUrl}/leaders/ref/${encodeURIComponent(canonicalCode)}`
      : null,
    humanReferralCode: code,
    humanReferralUrl: code ? `${baseUrl}/?ref=${encodeURIComponent(code)}` : null,
    humanDashboardUrl: code ? `${baseUrl}/leaders/ref/${encodeURIComponent(code)}` : null,
    confirmResponseUrl: null,
    betaDisplayName: null,
    betaInviteCode: null,
    betaInviteLink: null,
    referralStats: null,
    relatedNames: sorted
      .map((row) => row.name?.trim())
      .filter((name): name is string => Boolean(name)),
  };
}

function waitlistSelectColumns(): string {
  return "id, name, email, referral_code, human_referral_code, email_verified, newsletter, created_at";
}

function waitlistEmailSelectColumns(): string {
  return "email";
}

function applyAudienceScope<T extends { eq: Function; not: Function }>(
  query: T,
  audienceScope: CampaignAudienceScope,
): T {
  let scoped = query.not("email", "is", null);
  if (audienceScope === "verified_only") {
    scoped = scoped.eq("email_verified", true);
  } else if (audienceScope === "verified_newsletter") {
    scoped = scoped.eq("email_verified", true).eq("newsletter", true);
  }
  return scoped as T;
}

function parseSelectedEmailsText(text: string | null | undefined): {
  normalizedEmails: string[];
  invalidEmails: string[];
} {
  const tokens = (text ?? "")
    .split(/[\s,;]+/g)
    .map((value) => value.trim())
    .filter(Boolean);

  const normalizedEmails: string[] = [];
  const invalidEmails: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeEmail(token);
    if (!isValidEmail(normalized)) {
      invalidEmails.push(token);
      continue;
    }
    if (!normalizedEmails.includes(normalized)) normalizedEmails.push(normalized);
  }

  return { normalizedEmails, invalidEmails };
}

function buildEstimateCacheKey(args: {
  audienceScope: CampaignAudienceScope;
  dedupeMode: CampaignDedupeMode;
  baseUrl: string;
  selectedEmailsText?: string | null;
}): string {
  return JSON.stringify({
    audienceScope: args.audienceScope,
    dedupeMode: args.dedupeMode,
    baseUrl: args.baseUrl,
    selectedEmailsText: args.selectedEmailsText?.trim() ?? null,
  });
}

function readCachedEstimate(cacheKey: string): CampaignRecipientEstimate | null {
  const cached = waitlistEstimateCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    waitlistEstimateCache.delete(cacheKey);
    return null;
  }
  return cached.estimate;
}

function writeCachedEstimate(cacheKey: string, estimate: CampaignRecipientEstimate): CampaignRecipientEstimate {
  waitlistEstimateCache.set(cacheKey, {
    estimate,
    expiresAt: Date.now() + WAITLIST_ESTIMATE_CACHE_TTL_MS,
  });
  return estimate;
}

async function fetchWaitlistRowsPage(args: {
  audienceScope?: CampaignAudienceScope;
  offset: number;
  limit: number;
  emails?: string[];
}): Promise<WaitlistRow[]> {
  let query = db
    .from("zn_waitlist")
    .select(waitlistSelectColumns())
    .order("created_at", { ascending: true })
    .range(args.offset, args.offset + args.limit - 1);

  query = applyAudienceScope(query, args.audienceScope ?? "verified_only");

  if (args.emails && args.emails.length > 0) {
    query = query.in("email", args.emails);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as WaitlistRow[];
  return rows.filter((row) => Boolean(row.email?.trim()));
}

async function fetchWaitlistEmailPage(args: {
  audienceScope?: CampaignAudienceScope;
  offset: number;
  limit: number;
}): Promise<string[]> {
  let query = db
    .from("zn_waitlist")
    .select(waitlistEmailSelectColumns())
    .order("created_at", { ascending: true })
    .range(args.offset, args.offset + args.limit - 1);

  query = applyAudienceScope(query, args.audienceScope ?? "verified_only");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ email?: string | null }>)
    .map((row) => row.email?.trim())
    .filter((email): email is string => Boolean(email))
    .map(normalizeEmail);
}

export async function countWaitlistRows(
  audienceScope: CampaignAudienceScope = "verified_only",
): Promise<number> {
  let query = db.from("zn_waitlist").select("id", { count: "exact", head: true });
  query = applyAudienceScope(query, audienceScope);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
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

function sampleRowToRecipient(
  row: WaitlistEstimateRpcSampleRow,
  baseUrl: string,
): CampaignRecipient {
  const canonicalCode = row.referral_code?.trim() || null;
  const humanCode = row.human_referral_code?.trim() || canonicalCode;

  return {
    recipientKey: row.recipient_key,
    email: row.email,
    normalizedEmail: row.normalized_email,
    sourceKind: "zn_waitlist",
    sourceRowIds: Array.isArray(row.source_row_ids) ? row.source_row_ids : [],
    personalization: {
      name: row.name?.trim() || "there",
      referralCode: canonicalCode,
      referralUrl: canonicalCode ? `${baseUrl}/?ref=${encodeURIComponent(canonicalCode)}` : null,
      dashboardUrl: canonicalCode
        ? `${baseUrl}/leaders/ref/${encodeURIComponent(canonicalCode)}`
        : null,
      humanReferralCode: humanCode,
      humanReferralUrl: humanCode ? `${baseUrl}/?ref=${encodeURIComponent(humanCode)}` : null,
      humanDashboardUrl: humanCode
        ? `${baseUrl}/leaders/ref/${encodeURIComponent(humanCode)}`
        : null,
      confirmResponseUrl: null,
      betaDisplayName: null,
      betaInviteCode: null,
      betaInviteLink: null,
      referralStats: null,
      relatedNames: Array.isArray(row.related_names)
        ? row.related_names.filter((value): value is string => Boolean(value?.trim()))
        : [],
    },
  };
}

async function estimateWaitlistRecipientsViaRpc(args: {
  audienceScope: CampaignAudienceScope;
  dedupeMode: CampaignDedupeMode;
  baseUrl: string;
  normalizedEmails?: string[];
}): Promise<CampaignRecipientEstimate> {
  const { data, error } = await db.rpc("estimate_waitlist_recipients", {
    p_audience_scope: args.audienceScope,
    p_dedupe_mode: args.dedupeMode,
    p_selected_emails: args.normalizedEmails ?? [],
    p_sample_limit: 5,
  });

  if (error) throw new Error(error.message);

  const payload = (data ?? null) as WaitlistEstimateRpcPayload | null;
  if (!payload || typeof payload !== "object") {
    throw new Error("Waitlist estimate RPC returned an empty response.");
  }

  return {
    count: typeof payload.count === "number" ? payload.count : 0,
    sample: Array.isArray(payload.sample)
      ? payload.sample.map((row) => sampleRowToRecipient(row, args.baseUrl))
      : [],
    blocked: Array.isArray(payload.blocked)
      ? payload.blocked.map((row) => ({
          email: row.email,
          normalizedEmail: row.normalizedEmail,
          reason: row.reason,
        }))
      : [],
  };
}

async function listWaitlistRecipientsViaRpc(args: {
  audienceScope: CampaignAudienceScope;
  dedupeMode: CampaignDedupeMode;
  baseUrl: string;
  normalizedEmails?: string[];
}): Promise<CampaignRecipient[]> {
  const { data, error } = await db.rpc("list_waitlist_recipients", {
    p_audience_scope: args.audienceScope,
    p_dedupe_mode: args.dedupeMode,
    p_selected_emails: args.normalizedEmails ?? [],
  });

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown) as WaitlistRecipientRpcRow[];
  return rows.map((row) => sampleRowToRecipient(row, args.baseUrl));
}

async function listTargetedWaitlistRows(
  normalizedEmails: string[],
): Promise<Map<string, WaitlistRow[]>> {
  const grouped = new Map<string, WaitlistRow[]>();
  for (let index = 0; index < normalizedEmails.length; index += WAITLIST_PAGE_SIZE) {
    const batch = normalizedEmails.slice(index, index + WAITLIST_PAGE_SIZE);
    let offset = 0;

    for (;;) {
      const rows = await fetchWaitlistRowsPage({
        audienceScope: "all_rows",
        offset,
        limit: WAITLIST_PAGE_SIZE,
        emails: batch,
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        const normalizedEmail = normalizeEmail(row.email!);
        const group = grouped.get(normalizedEmail);
        if (group) group.push(row);
        else grouped.set(normalizedEmail, [row]);
      }

      if (rows.length < WAITLIST_PAGE_SIZE) break;
      offset += WAITLIST_PAGE_SIZE;
    }
  }
  return grouped;
}

function buildTargetedWaitlistBlocked(
  normalizedEmails: string[],
  rowsByEmail: Map<string, WaitlistRow[]>,
): CampaignBlockedRecipient[] {
  return normalizedEmails
    .filter((email) => !rowsByEmail.has(email))
    .map((email) => ({
      email,
      normalizedEmail: email,
      reason: "not_on_waitlist",
    }));
}

function buildTargetedWaitlistRecipients(args: {
  normalizedEmails: string[];
  rowsByEmail: Map<string, WaitlistRow[]>;
  dedupeMode: CampaignDedupeMode;
  baseUrl: string;
}): CampaignRecipient[] {
  if (args.dedupeMode === "one_per_row") {
    return args.normalizedEmails.flatMap((email) =>
      (args.rowsByEmail.get(email) ?? [])
        .map((row) => rowToRecipient(row, args.baseUrl))
        .filter((recipient): recipient is CampaignRecipient => Boolean(recipient)),
    );
  }

  const recipients: CampaignRecipient[] = [];
  for (const email of args.normalizedEmails) {
    const group = args.rowsByEmail.get(email);
    if (!group || group.length === 0) continue;

    recipients.push({
      recipientKey: email,
      email: group[0].email!.trim(),
      normalizedEmail: email,
      sourceKind: "zn_waitlist",
      sourceRowIds: group.map((row) => row.id),
      personalization: buildPersonalization(group, args.baseUrl),
    });
  }

  return recipients;
}

export async function estimateWaitlistRecipients(args?: {
  audienceScope?: CampaignAudienceScope;
  dedupeMode?: CampaignDedupeMode;
  baseUrl?: string;
  selectedEmailsText?: string | null;
}): Promise<CampaignRecipientEstimate> {
  const audienceScope = args?.audienceScope ?? "verified_only";
  const dedupeMode = args?.dedupeMode ?? "one_per_email";
  const baseUrl = args?.baseUrl ?? "https://zcashnames.com";
  const cacheKey = buildEstimateCacheKey({
    audienceScope,
    dedupeMode,
    baseUrl,
    selectedEmailsText: args?.selectedEmailsText,
  });
  const cached = readCachedEstimate(cacheKey);
  if (cached) return cached;

  if (audienceScope === "selected_emails") {
    const { normalizedEmails, invalidEmails } = parseSelectedEmailsText(args?.selectedEmailsText);
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email address: ${invalidEmails.slice(0, 5).join(", ")}`);
    }
    if (normalizedEmails.length === 0) {
      throw new Error("Enter at least one valid waitlist email address.");
    }
    return writeCachedEstimate(
      cacheKey,
      await estimateWaitlistRecipientsViaRpc({
        audienceScope,
        dedupeMode,
        baseUrl,
        normalizedEmails,
      }),
    );
  }

  return writeCachedEstimate(
    cacheKey,
    await estimateWaitlistRecipientsViaRpc({
      audienceScope,
      dedupeMode,
      baseUrl,
    }),
  );
}

export async function getWaitlistRecipientSample(args?: {
  audienceScope?: CampaignAudienceScope;
  dedupeMode?: CampaignDedupeMode;
  baseUrl?: string;
  selectedEmailsText?: string | null;
}): Promise<CampaignRecipient | null> {
  const audienceScope = args?.audienceScope ?? "verified_only";
  const dedupeMode = args?.dedupeMode ?? "one_per_email";
  const baseUrl = args?.baseUrl ?? "https://zcashnames.com";

  if (audienceScope === "selected_emails") {
    const { normalizedEmails, invalidEmails } = parseSelectedEmailsText(args?.selectedEmailsText);
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email address: ${invalidEmails.slice(0, 5).join(", ")}`);
    }
    if (normalizedEmails.length === 0) {
      throw new Error("Enter at least one valid waitlist email address.");
    }
    const recipients = await listWaitlistRecipientsViaRpc({
      audienceScope,
      dedupeMode,
      baseUrl,
      normalizedEmails,
    });
    return recipients[0] ?? null;
  }

  const rows = await fetchWaitlistRowsPage({ audienceScope, offset: 0, limit: 1 });
  const firstRow = rows[0];
  if (!firstRow) return null;

  if (dedupeMode === "one_per_row") {
    return rowToRecipient(firstRow, baseUrl);
  }

  return {
    recipientKey: normalizeEmail(firstRow.email!),
    email: firstRow.email!.trim(),
    normalizedEmail: normalizeEmail(firstRow.email!),
    sourceKind: "zn_waitlist",
    sourceRowIds: [firstRow.id],
    personalization: buildPersonalization([firstRow], baseUrl),
  };
}

export async function listWaitlistPersonalizationsByEmail(args: {
  emails: string[];
  baseUrl?: string;
}): Promise<Map<string, CampaignRecipientPersonalization>> {
  const normalizedEmails = [...new Set(args.emails.map(normalizeEmail).filter(Boolean))];
  const personalizations = new Map<string, CampaignRecipientPersonalization>();
  if (normalizedEmails.length === 0) return personalizations;

  const grouped = new Map<string, WaitlistRow[]>();
  for (let index = 0; index < normalizedEmails.length; index += WAITLIST_PAGE_SIZE) {
    const batch = normalizedEmails.slice(index, index + WAITLIST_PAGE_SIZE);
    let offset = 0;

    for (;;) {
      const rows = await fetchWaitlistRowsPage({
        audienceScope: "all_rows",
        offset,
        limit: WAITLIST_PAGE_SIZE,
        emails: batch,
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        const normalizedEmail = normalizeEmail(row.email!);
        const group = grouped.get(normalizedEmail);
        if (group) group.push(row);
        else grouped.set(normalizedEmail, [row]);
      }

      if (rows.length < WAITLIST_PAGE_SIZE) break;
      offset += WAITLIST_PAGE_SIZE;
    }
  }

  const resolvedBaseUrl = args.baseUrl ?? "https://zcashnames.com";
  for (const [normalizedEmail, group] of grouped.entries()) {
    personalizations.set(normalizedEmail, buildPersonalization(group, resolvedBaseUrl));
  }

  return personalizations;
}

export async function listWaitlistRecipients(args?: {
  sourceKind?: CampaignSourceKind;
  audienceScope?: CampaignAudienceScope;
  dedupeMode?: CampaignDedupeMode;
  baseUrl?: string;
  selectedEmailsText?: string | null;
}): Promise<CampaignRecipient[]> {
  const audienceScope = args?.audienceScope ?? "verified_only";
  const dedupeMode = args?.dedupeMode ?? "one_per_email";
  const baseUrl = args?.baseUrl ?? "https://zcashnames.com";

  if (audienceScope === "selected_emails") {
    const { normalizedEmails, invalidEmails } = parseSelectedEmailsText(args?.selectedEmailsText);
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email address: ${invalidEmails.slice(0, 5).join(", ")}`);
    }
    if (normalizedEmails.length === 0) {
      throw new Error("Enter at least one valid waitlist email address.");
    }
    return listWaitlistRecipientsViaRpc({
      audienceScope,
      dedupeMode,
      baseUrl,
      normalizedEmails,
    });
  }
  return listWaitlistRecipientsViaRpc({
    audienceScope,
    dedupeMode,
    baseUrl,
  });
}
