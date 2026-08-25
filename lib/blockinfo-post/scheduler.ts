import "server-only";

import { getBlockinfoPostScheduleState, isBlockinfoPostDue } from "@/lib/blockinfo-post/store";
import type { BlockinfoPostResult } from "@/lib/blockinfo-post/types";
import { runBlockinfoPost } from "@/lib/blockinfo-post/workflow";

function emptyDelivery(): NonNullable<BlockinfoPostResult["delivery"]> {
  return {
    telegram: { attempted: false, ok: false, error: null, telegramMessageId: null },
    x: { attempted: false, ok: false, error: null, xPostId: null },
  };
}

export async function runBlockinfoPostScheduleHeartbeat(): Promise<BlockinfoPostResult> {
  const schedule = await getBlockinfoPostScheduleState();

  if (!schedule.enabled) {
    return {
      ok: true,
      mode: "run",
      renderMode: schedule.renderMode,
      destinationsRequested: schedule.destination,
      scheduled: true,
      skipped: true,
      skipReason: "Schedule is disabled.",
      schedule,
      delivery: emptyDelivery(),
    };
  }

  if (!isBlockinfoPostDue(schedule)) {
    return {
      ok: true,
      mode: "run",
      renderMode: schedule.renderMode,
      destinationsRequested: schedule.destination,
      scheduled: true,
      skipped: true,
      skipReason: "No scheduled post is due yet.",
      schedule,
      delivery: emptyDelivery(),
    };
  }

  return runBlockinfoPost({
    mode: "run",
    destination: schedule.destination,
    renderMode: schedule.renderMode,
    templateVariant: schedule.templateVariant,
    scheduled: true,
  });
}
