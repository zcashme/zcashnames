import "server-only";

import { getReferinfoPostScheduleState, isReferinfoPostDue } from "@/lib/referinfo-post/store";
import type { ReferinfoPostResult } from "@/lib/referinfo-post/types";
import { runReferinfoPost } from "@/lib/referinfo-post/workflow";

function emptyResult(schedule: Awaited<ReturnType<typeof getReferinfoPostScheduleState>>, skipReason: string): ReferinfoPostResult {
  return {
    ok: true,
    mode: "run",
    renderMode: schedule.renderMode,
    destinationsRequested: schedule.destination,
    scheduled: true,
    skipped: true,
    skipReason,
    thread: {
      rootKind: "summary_top10",
      xThreadMode: "linear",
      telegramDeliveryMode: "sequential",
    },
    schedule,
    plannedPosts: [],
  };
}

export async function runReferinfoPostScheduleHeartbeat(): Promise<ReferinfoPostResult> {
  const schedule = await getReferinfoPostScheduleState();

  if (!schedule.enabled) {
    return emptyResult(schedule, "Schedule is disabled.");
  }

  if (!isReferinfoPostDue(schedule)) {
    return emptyResult(schedule, "No scheduled post is due yet.");
  }

  return runReferinfoPost({
    mode: "run",
    destination: schedule.destination,
    renderMode: schedule.renderMode,
    templateVariant: schedule.templateVariant,
    scheduled: true,
  });
}
