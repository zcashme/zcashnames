import "server-only";

import { db } from "@/lib/db";

export type WaitlistVerifyRow = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string | null;
  referral_code: string | null;
  human_referral_code: string | null;
  campaign_email_confirm_response: boolean | null;
};

const WAITLIST_PAGE_SIZE = 1000;

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildWaitlistVerifyMemo(name: string | null | undefined, waitlistId: string): string {
  const normalizedName = name?.trim() ?? "";
  if (!normalizedName) {
    throw new Error(`Waitlist row ${waitlistId} is missing a usable name.`);
  }
  return `${normalizedName}|${waitlistId}`;
}

function compareWaitlistRows(a: WaitlistVerifyRow, b: WaitlistVerifyRow): number {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

export async function findWaitlistRowsByNormalizedEmail(
  normalizedEmail: string,
): Promise<WaitlistVerifyRow[]> {
  const rows: WaitlistVerifyRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select(
        "id, email, name, created_at, referral_code, human_referral_code, campaign_email_confirm_response",
      )
      .ilike("email", normalizedEmail)
      .range(offset, offset + WAITLIST_PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }

    const batch = ((data ?? []) as WaitlistVerifyRow[]).filter(
      (row) => row.email && normalizeWaitlistEmail(row.email) === normalizedEmail,
    );
    rows.push(...batch);

    if ((data ?? []).length < WAITLIST_PAGE_SIZE) {
      break;
    }
    offset += WAITLIST_PAGE_SIZE;
  }

  return rows.sort(compareWaitlistRows);
}

