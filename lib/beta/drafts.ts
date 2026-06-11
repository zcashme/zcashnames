import "server-only";

import { db } from "@/lib/db";
import { defaultInviteBody, defaultInviteSubject } from "@/lib/beta/invite-template";

export interface BetaDraftTesterRow {
  id: string;
  display_name: string;
  focus_areas: string[];
  why: string | null;
  experience: string | null;
  best_contact_kind: string | null;
  contact_email: string | null;
  contact_signal: string | null;
  contact_discord: string | null;
  contact_x: string | null;
  contact_telegram: string | null;
  contact_forum: string | null;
  invite_code: string | null;
  code_sent_at: string | null;
  submitted_at: string;
  notice_status: string | null;
}

export interface BetaInviteDraftRow {
  tester_id: string;
  subject: string;
  body_text: string;
  updated_at?: string;
}

const CONTACT_FIELDS: Record<string, keyof BetaDraftTesterRow> = {
  email: "contact_email",
  signal: "contact_signal",
  discord: "contact_discord",
  x: "contact_x",
  telegram: "contact_telegram",
  forum: "contact_forum",
};

function normalizeTesterRow(row: Record<string, unknown>): BetaDraftTesterRow {
  return {
    id: String(row.id ?? ""),
    display_name: String(row.display_name ?? ""),
    focus_areas: Array.isArray(row.focus_areas)
      ? row.focus_areas.filter((value): value is string => typeof value === "string")
      : [],
    why: typeof row.why === "string" ? row.why : null,
    experience: typeof row.experience === "string" ? row.experience : null,
    best_contact_kind: typeof row.best_contact_kind === "string" ? row.best_contact_kind : null,
    contact_email: typeof row.contact_email === "string" ? row.contact_email : null,
    contact_signal: typeof row.contact_signal === "string" ? row.contact_signal : null,
    contact_discord: typeof row.contact_discord === "string" ? row.contact_discord : null,
    contact_x: typeof row.contact_x === "string" ? row.contact_x : null,
    contact_telegram: typeof row.contact_telegram === "string" ? row.contact_telegram : null,
    contact_forum: typeof row.contact_forum === "string" ? row.contact_forum : null,
    invite_code: typeof row.invite_code === "string" ? row.invite_code : null,
    code_sent_at: typeof row.code_sent_at === "string" ? row.code_sent_at : null,
    submitted_at: String(row.submitted_at ?? ""),
    notice_status: typeof row.notice_status === "string" ? row.notice_status : null,
  };
}

export function contactValueFor(tester: BetaDraftTesterRow): string | null {
  const field = tester.best_contact_kind ? CONTACT_FIELDS[tester.best_contact_kind] : null;
  if (!field) return null;
  const value = tester[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function listDraftTesters(): Promise<BetaDraftTesterRow[]> {
  const { data, error } = await db
    .from("beta_testers")
    .select(
      "id, display_name, focus_areas, why, experience, best_contact_kind, contact_email, contact_signal, contact_discord, contact_x, contact_telegram, contact_forum, invite_code, code_sent_at, submitted_at, notice_status",
    )
    .is("revoked_at", null)
    .is("code_sent_at", null)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeTesterRow(row as Record<string, unknown>));
}

export async function listSentTesters(): Promise<BetaDraftTesterRow[]> {
  const { data, error } = await db
    .from("beta_testers")
    .select(
      "id, display_name, focus_areas, why, experience, best_contact_kind, contact_email, contact_signal, contact_discord, contact_x, contact_telegram, contact_forum, invite_code, code_sent_at, submitted_at, notice_status",
    )
    .is("revoked_at", null)
    .not("code_sent_at", "is", null)
    .order("code_sent_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeTesterRow(row as Record<string, unknown>));
}

export async function getDraft(testerId: string): Promise<BetaInviteDraftRow | null> {
  const { data, error } = await db
    .from("beta_invite_drafts")
    .select("tester_id, subject, body_text, updated_at")
    .eq("tester_id", testerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    tester_id: String(data.tester_id),
    subject: String(data.subject ?? ""),
    body_text: String(data.body_text ?? ""),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : undefined,
  };
}

export async function getOrCreateDraft(
  testerId: string,
  displayName: string,
): Promise<BetaInviteDraftRow> {
  const existing = await getDraft(testerId);
  if (existing) return existing;

  const row = {
    tester_id: testerId,
    subject: defaultInviteSubject(),
    body_text: defaultInviteBody({ displayName }),
  };

  const { error } = await db.from("beta_invite_drafts").insert(row);
  if (error) throw new Error(error.message);

  return row;
}

export async function updateDraft(
  testerId: string,
  patch: { subject: string; body_text: string },
): Promise<void> {
  const { error } = await db
    .from("beta_invite_drafts")
    .upsert(
      {
        tester_id: testerId,
        subject: patch.subject,
        body_text: patch.body_text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tester_id" },
    );

  if (error) throw new Error(error.message);
}
