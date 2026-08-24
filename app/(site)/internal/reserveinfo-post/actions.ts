"use server";

import { saveReserveinfoPostScheduleSettings } from "@/lib/reserveinfo-post/store";
import { isReserveinfoPostDestination, type ReserveinfoPostDestination, type ReserveinfoPostResult, type ReserveinfoPostScheduleState } from "@/lib/reserveinfo-post/types";
import { runReserveinfoPost } from "@/lib/reserveinfo-post/workflow";

export async function runReserveinfoPostAction(destination: ReserveinfoPostDestination): Promise<ReserveinfoPostResult> { return runReserveinfoPost({ mode: "run", destination: isReserveinfoPostDestination(destination) ? destination : "both" }); }
export async function dryRunReserveinfoPostAction(destination: ReserveinfoPostDestination): Promise<ReserveinfoPostResult> { return runReserveinfoPost({ mode: "dry-run", destination: isReserveinfoPostDestination(destination) ? destination : "both" }); }
export async function saveReserveinfoPostScheduleAction(input: Pick<ReserveinfoPostScheduleState, "enabled" | "destination" | "weeklyTimezone">): Promise<{ ok: true; schedule: ReserveinfoPostScheduleState } | { ok: false; error: string }> {
  try { return { ok: true, schedule: await saveReserveinfoPostScheduleSettings(input) }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}
