import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { getDefaultBlockinfoPostCaptionPolicy } from "@/lib/blockinfo-post/caption-policy";
import {
  fetchDeterministicSnapshot,
  getDefaultDeterministicLayout,
  getDeterministicAssetConfig,
  loadDeterministicCaptionPolicy,
  loadDeterministicLayout,
} from "@/lib/blockinfo-post/deterministic";
import { isEphemeralBlockinfoFilesystemRuntime } from "@/lib/blockinfo-post/runtime";
import { getBlockinfoPostScheduleState } from "@/lib/blockinfo-post/store";
import { DEFAULT_BLOCKINFO_POST_SCHEDULE } from "@/lib/blockinfo-post/types";
import type {
  BlockinfoPostCaptionPolicy,
  BlockinfoPostDeterministicLayout,
  BlockinfoPostDeterministicSnapshot,
  BlockinfoPostScheduleState,
} from "@/lib/blockinfo-post/types";
import { db } from "@/lib/db";
import BlockinfoPostTool from "./BlockinfoPostTool";

export const metadata: Metadata = {
  title: "Blockinfo Post | ZcashNames",
  description: "Generate and deliver a blockinfo post from the latest zebra_stats row to Telegram, X, or both.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadLatestDeterministicSnapshot(): Promise<BlockinfoPostDeterministicSnapshot | null> {
  const { data, error } = await db
    .from("zebra_stats")
    .select("*")
    .order("height", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return fetchDeterministicSnapshot(data as Record<string, unknown>).catch(() => null);
}

export default async function BlockinfoPostPage() {
  const initialSchedule: BlockinfoPostScheduleState = await getBlockinfoPostScheduleState().catch(() => ({
    ...DEFAULT_BLOCKINFO_POST_SCHEDULE,
  }));
  const deterministicPaths = getDeterministicAssetConfig();
  const initialLayout: BlockinfoPostDeterministicLayout = await loadDeterministicLayout(deterministicPaths.layoutPath).catch(() =>
    getDefaultDeterministicLayout(),
  );
  const initialCaptionPolicy: BlockinfoPostCaptionPolicy = await loadDeterministicCaptionPolicy(deterministicPaths.captionPolicyPath).catch(() =>
    getDefaultBlockinfoPostCaptionPolicy(),
  );
  const initialSnapshot = await loadLatestDeterministicSnapshot();
  const hostedFilesystemReadonly = isEphemeralBlockinfoFilesystemRuntime();

  return (
    <main className="w-full">
      <SiteRouteTitle title="Blockinfo Post" />
      <BlockinfoPostTool
        initialSchedule={initialSchedule}
        initialLayout={initialLayout}
        initialCaptionPolicy={initialCaptionPolicy}
        initialSnapshot={initialSnapshot}
        deterministicBackgroundPath={deterministicPaths.backgroundPath}
        deterministicLayoutPath={deterministicPaths.layoutPath}
        deterministicCaptionPolicyPath={deterministicPaths.captionPolicyPath}
        hostedFilesystemReadonly={hostedFilesystemReadonly}
      />
    </main>
  );
}
