"use server";

import { saveReferinfoPostScheduleSettings } from "@/lib/referinfo-post/store";
import type {
  ReferinfoDeterministicLayout,
  ReferinfoDeterministicLayoutKind,
  ReferinfoPostDestination,
  ReferinfoPostRenderMode,
  ReferinfoPostResult,
  ReferinfoPostScheduleInput,
  ReferinfoPostScheduleState,
} from "@/lib/referinfo-post/types";
import type { ReferinfoPostTemplateVariant } from "@/lib/referinfo-post/template-variant";
import { isReferinfoPostDestination, isReferinfoPostRenderMode } from "@/lib/referinfo-post/types";
import {
  saveReferinfoDeterministicLayout,
} from "@/lib/referinfo-post/deterministic";
import { getHostedReferinfoConfigMessage, isEphemeralReferinfoFilesystemRuntime } from "@/lib/referinfo-post/runtime";
import { runReferinfoPost } from "@/lib/referinfo-post/workflow";

function normalizeDestination(destination: ReferinfoPostDestination): ReferinfoPostDestination {
  return isReferinfoPostDestination(destination) ? destination : "both";
}

function normalizeRenderMode(renderMode: ReferinfoPostRenderMode): ReferinfoPostRenderMode {
  return isReferinfoPostRenderMode(renderMode) ? renderMode : "deterministic";
}

export async function runReferinfoPostAction(
  destination: ReferinfoPostDestination,
  renderMode: ReferinfoPostRenderMode,
  templateVariant: ReferinfoPostTemplateVariant,
): Promise<ReferinfoPostResult> {
  return runReferinfoPost({
    mode: "run",
    destination: normalizeDestination(destination),
    renderMode: normalizeRenderMode(renderMode),
    templateVariant,
  });
}

export async function dryRunReferinfoPostAction(
  destination: ReferinfoPostDestination,
  renderMode: ReferinfoPostRenderMode,
  templateVariant: ReferinfoPostTemplateVariant,
): Promise<ReferinfoPostResult> {
  return runReferinfoPost({
    mode: "dry-run",
    destination: normalizeDestination(destination),
    renderMode: normalizeRenderMode(renderMode),
    templateVariant,
  });
}

export async function saveReferinfoPostScheduleAction(
  input: ReferinfoPostScheduleInput,
): Promise<{ ok: true; schedule: ReferinfoPostScheduleState } | { ok: false; error: string }> {
  try {
    const schedule = await saveReferinfoPostScheduleSettings(input);
    return { ok: true, schedule };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveReferinfoDeterministicLayoutAction(
  kind: ReferinfoDeterministicLayoutKind,
  layout: ReferinfoDeterministicLayout,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (isEphemeralReferinfoFilesystemRuntime()) {
      return { ok: false, error: getHostedReferinfoConfigMessage() };
    }
    await saveReferinfoDeterministicLayout(kind, layout);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
