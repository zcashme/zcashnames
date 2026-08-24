import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import {
  getReferinfoDeterministicAssetConfig,
  getReferinfoDeterministicLayoutPathForEditorKind,
  loadReferinfoDeterministicLayout,
} from "@/lib/referinfo-post/deterministic";
import { isEphemeralReferinfoFilesystemRuntime } from "@/lib/referinfo-post/runtime";
import { getReferinfoPostScheduleState } from "@/lib/referinfo-post/store";
import { DEFAULT_REFERINFO_POST_SCHEDULE } from "@/lib/referinfo-post/types";
import type {
  ReferinfoDeterministicLayout,
  ReferinfoPlannedPost,
  ReferinfoPostScheduleState,
  ReferinfoReportWindow,
} from "@/lib/referinfo-post/types";
import { buildReferinfoPreviewResult } from "@/lib/referinfo-post/workflow";
import ReferinfoPostTool from "./ReferinfoPostTool";

export const metadata: Metadata = {
  title: "Referinfo Post | ZcashNames",
  description: "Generate and deliver the weekly referinfo thread to Telegram, X, or both.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReferinfoPostPage() {
  const initialSchedule: ReferinfoPostScheduleState = await getReferinfoPostScheduleState().catch(() => ({
    ...DEFAULT_REFERINFO_POST_SCHEDULE,
  }));
  const assets = getReferinfoDeterministicAssetConfig();
  const hostedFilesystemReadonly = isEphemeralReferinfoFilesystemRuntime();
  const [top10Layout, top5Layout, topIndirectLayout, leaderChangesLayout] = await Promise.all([
    loadReferinfoDeterministicLayout(getReferinfoDeterministicLayoutPathForEditorKind("top10", assets), ["rank", "name", "direct", "indirect", "reward", "total"]),
    loadReferinfoDeterministicLayout(getReferinfoDeterministicLayoutPathForEditorKind("top5", assets), ["rank", "name", "metric", "reward"]),
    loadReferinfoDeterministicLayout(getReferinfoDeterministicLayoutPathForEditorKind("top_indirect", assets), ["rank", "name", "metric", "depth2", "depth3", "depth4plus", "reward", "total"]),
    loadReferinfoDeterministicLayout(getReferinfoDeterministicLayoutPathForEditorKind("leader_changes", assets), ["period", "leader", "context"]),
  ]);

  let initialPreviewPosts: ReferinfoPlannedPost[] = [];
  let initialReportWindow: ReferinfoReportWindow | null = null;
  let previewError: string | null = null;

  try {
    const preview = await buildReferinfoPreviewResult();
    initialPreviewPosts = preview.plannedPosts ?? [];
    initialReportWindow = preview.reportWindow ?? null;
  } catch (error) {
    previewError = error instanceof Error ? error.message : String(error);
  }

  return (
    <main className="w-full">
      <SiteRouteTitle title="Referinfo Post" />
      <ReferinfoPostTool
        initialSchedule={initialSchedule}
        initialPreviewPosts={initialPreviewPosts}
        initialReportWindow={initialReportWindow}
        top10Layout={top10Layout}
        top5Layout={top5Layout}
        topIndirectLayout={topIndirectLayout}
        leaderChangesLayout={leaderChangesLayout}
        hostedFilesystemReadonly={hostedFilesystemReadonly}
        initialTemplateVariant={assets.templateVariant}
        deterministicBackgroundPath={assets.backgroundPath}
        top10LayoutPath={assets.top10LayoutPath}
        top5LayoutPath={assets.top5LayoutPath}
        topIndirectLayoutPath={assets.topIndirectLayoutPath}
        leaderChangesLayoutPath={assets.leaderChangesLayoutPath}
        captionPolicyPath={assets.captionPolicyPath}
        initialPreviewError={previewError}
      />
    </main>
  );
}
