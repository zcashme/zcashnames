"use server";

import { saveReserveinfoPostScheduleSettings } from "@/lib/reserveinfo-post/store";
import { isReserveinfoPostDestination, type ReserveinfoPostDestination, type ReserveinfoPostResult, type ReserveinfoPostScheduleState } from "@/lib/reserveinfo-post/types";
import { runReserveinfoPost } from "@/lib/reserveinfo-post/workflow";
import type { ReserveinfoPostTemplateVariant } from "@/lib/reserveinfo-post/template-variant";

export async function runReserveinfoPostAction(destination: ReserveinfoPostDestination, templateVariant: ReserveinfoPostTemplateVariant): Promise<ReserveinfoPostResult> { return runReserveinfoPost({ mode: "run", destination: isReserveinfoPostDestination(destination) ? destination : "both", templateVariant }); }
export async function dryRunReserveinfoPostAction(destination: ReserveinfoPostDestination, templateVariant: ReserveinfoPostTemplateVariant): Promise<ReserveinfoPostResult> { return runReserveinfoPost({ mode: "dry-run", destination: isReserveinfoPostDestination(destination) ? destination : "both", templateVariant }); }
export async function saveReserveinfoPostScheduleAction(input: Pick<ReserveinfoPostScheduleState, "enabled" | "destination" | "templateVariant" | "weeklyTimezone">): Promise<{ ok: true; schedule: ReserveinfoPostScheduleState } | { ok: false; error: string }> {
  try { return { ok: true, schedule: await saveReserveinfoPostScheduleSettings(input) }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}
