"use server";

import { saveDeterministicCaptionPolicy, saveDeterministicLayout } from "@/lib/blockinfo-post/deterministic";
import { getHostedConfigPersistenceMessage, isEphemeralBlockinfoFilesystemRuntime } from "@/lib/blockinfo-post/runtime";
import { saveBlockinfoPostScheduleSettings } from "@/lib/blockinfo-post/store";
import {
  type BlockinfoPostCaptionPolicy,
  type BlockinfoPostDeterministicLayout,
  type BlockinfoPostDestination,
  type BlockinfoPostRenderMode,
  type BlockinfoPostResult,
  type BlockinfoPostScheduleInput,
  type BlockinfoPostScheduleState,
  isBlockinfoPostDestination,
  isBlockinfoPostRenderMode,
} from "@/lib/blockinfo-post/types";
import { runBlockinfoPost } from "@/lib/blockinfo-post/workflow";

function normalizeDestination(destination: BlockinfoPostDestination): BlockinfoPostDestination {
  return isBlockinfoPostDestination(destination) ? destination : "telegram";
}

function normalizeRenderMode(renderMode: BlockinfoPostRenderMode): BlockinfoPostRenderMode {
  return isBlockinfoPostRenderMode(renderMode) ? renderMode : "deterministic";
}

export async function runBlockinfoPostAction(
  destination: BlockinfoPostDestination,
  renderMode: BlockinfoPostRenderMode,
): Promise<BlockinfoPostResult> {
  return runBlockinfoPost({
    mode: "run",
    destination: normalizeDestination(destination),
    renderMode: normalizeRenderMode(renderMode),
  });
}

export async function dryRunBlockinfoPostAction(
  destination: BlockinfoPostDestination,
  renderMode: BlockinfoPostRenderMode,
): Promise<BlockinfoPostResult> {
  return runBlockinfoPost({
    mode: "dry-run",
    destination: normalizeDestination(destination),
    renderMode: normalizeRenderMode(renderMode),
  });
}

export async function saveBlockinfoPostScheduleAction(
  input: BlockinfoPostScheduleInput,
): Promise<{ ok: true; schedule: BlockinfoPostScheduleState } | { ok: false; error: string }> {
  try {
    const schedule = await saveBlockinfoPostScheduleSettings(input);
    return { ok: true, schedule };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveDeterministicLayoutAction(
  layout: BlockinfoPostDeterministicLayout,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (isEphemeralBlockinfoFilesystemRuntime()) {
      return { ok: false, error: getHostedConfigPersistenceMessage() };
    }
    await saveDeterministicLayout(layout);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveDeterministicCaptionPolicyAction(
  policy: BlockinfoPostCaptionPolicy,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (isEphemeralBlockinfoFilesystemRuntime()) {
      return { ok: false, error: getHostedConfigPersistenceMessage() };
    }
    await saveDeterministicCaptionPolicy(policy);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
