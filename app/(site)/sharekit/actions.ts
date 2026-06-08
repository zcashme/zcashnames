"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sendWaitlistReferralRecoveryEmail } from "@/lib/email/waitlist";
import { extractReferralCode } from "@/lib/referral-code";
import { ensureHumanReferralCode, resolveReferralIdentity } from "@/lib/referrals";
import {
  SHAREKIT_RECOVERY_ACCEPTED_MESSAGE,
  SHAREKIT_RECOVERY_ERROR_MESSAGE,
  SHAREKIT_RECOVERY_INVALID_EMAIL_MESSAGE,
  SHAREKIT_RECOVERY_MIN_RESPONSE_MS,
  isValidShareKitRecoveryEmail,
  normalizeShareKitRecoveryEmail,
  resolveShareKitRecoveryInternalStatus,
  sleep,
  type ShareKitRecoveryInternalStatus,
  type ShareKitRecoveryResult,
} from "@/lib/sharekit-recovery";
import {
  hashShareKitRecoveryIp,
  normalizeShareKitRecoveryIp,
  recordShareKitRecoverySessionAttempt,
  shareKitRecoveryThrottleConfig,
  shareKitRecoveryWindowStart,
} from "@/lib/sharekit-recovery-throttle";
import { resolveSiteUrl } from "@/lib/site-url";

export type ShareKitReferralLookupResult =
  | { ok: true; referralCode: string; referralName: string | null }
  | { ok: false };

type ShareKitRecoveryRow = {
  id: string;
  name: string | null;
  email: string;
  referral_code: string | null;
  human_referral_code?: string | null;
  email_verified: boolean;
  referral_email_resent_at: string | null;
  created_at: string;
};

type ShareKitRecoveryThrottleRow = {
  count: number | null;
};

async function recordWindowedThrottleAttempt({
  scope,
  key,
  windowStartedAt,
}: {
  scope: "ip" | "global";
  key: string;
  windowStartedAt: string;
}): Promise<number> {
  const nowIso = new Date().toISOString();
  let existingCount = 0;
  let rowExists = false;
  const readCurrent = async (): Promise<void> => {
    const { data: current, error: currentError } = await db
      .from("sharekit_recovery_attempts")
      .select("count")
      .eq("scope", scope)
      .eq("key", key)
      .eq("window_started_at", windowStartedAt)
      .maybeSingle();

    if (currentError) throw currentError;
    rowExists = Boolean(current);
    existingCount = Math.max(0, Number((current as ShareKitRecoveryThrottleRow | null)?.count ?? 0));
  };

  await readCurrent();

  if (!rowExists) {
    const { error: insertError } = await db
      .from("sharekit_recovery_attempts")
      .insert({
        scope,
        key,
        window_started_at: windowStartedAt,
        count: 1,
        updated_at: nowIso,
      });

    if (!insertError) return 1;
    if (insertError.code !== "23505") throw insertError;
    await readCurrent();
  }

  const nextCount = existingCount + 1;
  const { error: updateError } = await db
    .from("sharekit_recovery_attempts")
    .update({ count: nextCount, updated_at: nowIso })
    .eq("scope", scope)
    .eq("key", key)
    .eq("window_started_at", windowStartedAt);

  if (updateError) {
    throw updateError;
  }

  return nextCount;
}

async function applyMinimumResponseDelay(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < SHAREKIT_RECOVERY_MIN_RESPONSE_MS) {
    await sleep(SHAREKIT_RECOVERY_MIN_RESPONSE_MS - elapsed);
  }
}

function acceptedRecoveryResult(): ShareKitRecoveryResult {
  return {
    status: "accepted",
    message: SHAREKIT_RECOVERY_ACCEPTED_MESSAGE,
  };
}

export async function lookupShareKitReferral(
  input: string,
): Promise<ShareKitReferralLookupResult> {
  const referralCode = extractReferralCode(input);
  if (!referralCode) return { ok: false };

  try {
    const resolved = await resolveReferralIdentity(referralCode, {
      select: "id, name, referral_code, human_referral_code",
    });
    if (!resolved) return { ok: false };

    const referralName = (resolved.row.name as string | null | undefined)?.trim() || null;
    return { ok: true, referralCode: resolved.preferredCode, referralName };
  } catch {
    return { ok: false };
  }
}

export async function recoverShareKitReferralByEmail(input: string): Promise<ShareKitRecoveryResult> {
  const startedAt = Date.now();
  const email = normalizeShareKitRecoveryEmail(input);
  if (!isValidShareKitRecoveryEmail(email)) {
    return {
      status: "invalid_email",
      message: SHAREKIT_RECOVERY_INVALID_EMAIL_MESSAGE,
    };
  }

  try {
    const headerStore = await headers();
    const throttleConfig = shareKitRecoveryThrottleConfig();
    const sessionThrottled = await recordShareKitRecoverySessionAttempt(startedAt);
    const ipKey = hashShareKitRecoveryIp(normalizeShareKitRecoveryIp(headerStore.get("x-forwarded-for")));
    const ipCount = await recordWindowedThrottleAttempt({
      scope: "ip",
      key: ipKey,
      windowStartedAt: shareKitRecoveryWindowStart(startedAt, throttleConfig.ip.windowMs),
    });
    const globalCount = await recordWindowedThrottleAttempt({
      scope: "global",
      key: "global",
      windowStartedAt: shareKitRecoveryWindowStart(startedAt, throttleConfig.global.windowMs),
    });
    const throttled =
      sessionThrottled ||
      ipCount > throttleConfig.ip.limit ||
      globalCount > throttleConfig.global.limit;

    if (throttled) {
      await applyMinimumResponseDelay(startedAt);
      return acceptedRecoveryResult();
    }

    const { data, error } = await db
      .from("zn_waitlist")
      .select("id, name, email, referral_code, human_referral_code, email_verified, referral_email_resent_at, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[sharekit-recovery] waitlist lookup failed:", error);
      return { status: "error", message: SHAREKIT_RECOVERY_ERROR_MESSAGE };
    }

    const rows = (data as ShareKitRecoveryRow[] | null) ?? [];
    const status = resolveShareKitRecoveryInternalStatus(
      rows.map((row) => ({
        email_verified: Boolean(row.email_verified),
        referral_email_resent_at: row.referral_email_resent_at,
      })),
    );

    if (status === "not_found" || status === "unconfirmed" || status === "confirmed_rate_limited") {
      console.info("[sharekit-recovery] classified request:", status);
      await applyMinimumResponseDelay(startedAt);
      return acceptedRecoveryResult();
    }

    const verifiedRows = rows.filter(
      (row): row is ShareKitRecoveryRow & { referral_code: string } =>
        Boolean(row.email_verified) && Boolean(row.referral_code),
    );

    if (verifiedRows.length === 0) {
      console.error("[sharekit-recovery] verified rows missing referral codes");
      return { status: "error", message: SHAREKIT_RECOVERY_ERROR_MESSAGE };
    }

    const cutoffIso = new Date(startedAt - 24 * 60 * 60 * 1000).toISOString();
    const resendAt = new Date(startedAt).toISOString();
    const { data: updatedRows, error: updateError } = await db
      .from("zn_waitlist")
      .update({ referral_email_resent_at: resendAt })
      .eq("email", email)
      .eq("email_verified", true)
      .or(`referral_email_resent_at.is.null,referral_email_resent_at.lt."${cutoffIso}"`)
      .select("id");

    if (updateError) {
      console.error("[sharekit-recovery] atomic resend update failed:", updateError);
      return { status: "error", message: SHAREKIT_RECOVERY_ERROR_MESSAGE };
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.info("[sharekit-recovery] classified request:", "confirmed_rate_limited" satisfies ShareKitRecoveryInternalStatus);
      await applyMinimumResponseDelay(startedAt);
      return acceptedRecoveryResult();
    }

    const ensuredEntries = await Promise.all(
      verifiedRows.map(async (row) => {
        const ensured = await ensureHumanReferralCode({
          id: row.id,
          name: row.name,
          referral_code: row.referral_code,
          human_referral_code: row.human_referral_code ?? null,
        });

        return {
          name: row.name?.trim() || ensured.preferredCode,
          canonicalReferralCode: ensured.canonicalCode,
          preferredReferralCode: ensured.preferredCode,
          createdAt: row.created_at,
        };
      }),
    );

    ensuredEntries.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    await sendWaitlistReferralRecoveryEmail({
      email,
      baseUrl: resolveSiteUrl(headerStore),
      entries: ensuredEntries.map(({ createdAt: _createdAt, ...entry }) => entry),
    });

    console.info("[sharekit-recovery] classified request:", "confirmed_resent" satisfies ShareKitRecoveryInternalStatus);
    await applyMinimumResponseDelay(startedAt);
    return acceptedRecoveryResult();
  } catch (error) {
    console.error("[sharekit-recovery] request failed:", error);
    return { status: "error", message: SHAREKIT_RECOVERY_ERROR_MESSAGE };
  }
}
