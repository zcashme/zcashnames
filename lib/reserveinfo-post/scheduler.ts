import "server-only";

import { getReserveinfoPostScheduleState } from "@/lib/reserveinfo-post/store";
import type { ReserveinfoPostResult } from "@/lib/reserveinfo-post/types";
import { runReserveinfoPost } from "@/lib/reserveinfo-post/workflow";

export async function runReserveinfoPostScheduleHeartbeat(): Promise<ReserveinfoPostResult> {
  const schedule = await getReserveinfoPostScheduleState();
  if (!schedule.enabled) return { ok: true, mode: "run", destinationsRequested: schedule.destination, scheduled: true, skipped: true, skipReason: "Schedule is disabled.", plannedPosts: [], schedule };
  return runReserveinfoPost({ mode: "run", destination: schedule.destination, templateVariant: schedule.templateVariant, scheduled: true });
}
