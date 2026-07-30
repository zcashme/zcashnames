import "server-only";

import { db } from "@/lib/db";

type WaitlistVerifyRowPreferenceRow = {
  normalized_email: string;
  waitlist_row_id: string;
  collapsed: boolean | null;
  updated_at: string | null;
};

export async function getWaitlistVerifyRowPreferences(args: {
  normalizedEmail: string;
  rowIds: string[];
}): Promise<Map<string, boolean>> {
  const preferences = new Map<string, boolean>();
  if (args.rowIds.length === 0) {
    return preferences;
  }

  const { data, error } = await db
    .from("waitlist_verify_row_preferences")
    .select("normalized_email, waitlist_row_id, collapsed, updated_at")
    .eq("normalized_email", args.normalizedEmail)
    .in("waitlist_row_id", args.rowIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as WaitlistVerifyRowPreferenceRow[]) {
    preferences.set(row.waitlist_row_id, row.collapsed === true);
  }

  return preferences;
}

export async function upsertWaitlistVerifyRowPreference(args: {
  normalizedEmail: string;
  rowId: string;
  collapsed: boolean;
}): Promise<void> {
  const { error } = await db.from("waitlist_verify_row_preferences").upsert(
    {
      normalized_email: args.normalizedEmail,
      waitlist_row_id: args.rowId,
      collapsed: args.collapsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "normalized_email,waitlist_row_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteWaitlistVerifyRowPreference(args: {
  normalizedEmail: string;
  rowId: string;
}): Promise<void> {
  const { error } = await db
    .from("waitlist_verify_row_preferences")
    .delete()
    .eq("normalized_email", args.normalizedEmail)
    .eq("waitlist_row_id", args.rowId);

  if (error) {
    throw new Error(error.message);
  }
}
