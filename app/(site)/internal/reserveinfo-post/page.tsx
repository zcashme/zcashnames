import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { buildCompletedReserveinfoWindow } from "@/lib/reserveinfo-post/planning";
import { getReserveinfoPostScheduleState, getReserveinfoQueue } from "@/lib/reserveinfo-post/store";
import { DEFAULT_RESERVEINFO_POST_SCHEDULE, type ReserveinfoPlannedPost, type ReserveinfoReportWindow } from "@/lib/reserveinfo-post/types";
import { buildReserveinfoPreview } from "@/lib/reserveinfo-post/workflow";
import ReserveinfoPostTool from "./ReserveinfoPostTool";

export const metadata: Metadata = { title: "Reserveinfo Post | ZcashNames", description: "Preview and publish the weekly reserved-names queue.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReserveinfoPostPage() {
  const initialSchedule = await getReserveinfoPostScheduleState().catch(() => ({ ...DEFAULT_RESERVEINFO_POST_SCHEDULE }));
  const reportWindow = buildCompletedReserveinfoWindow(new Date(), initialSchedule.weeklyTimezone);
  let initialQueue: ReserveinfoPlannedPost[] = []; let initialPreview: ReserveinfoPlannedPost[] = []; let previewError: string | null = null; let previewWindow: ReserveinfoReportWindow | null = reportWindow;
  try { initialQueue = await getReserveinfoQueue(reportWindow); }
  catch (error) { previewError = error instanceof Error ? error.message : String(error); }
  if (!initialQueue.length) {
    try {
      const preview = await buildReserveinfoPreview(new Date(), initialSchedule);
      initialPreview = preview.plannedPosts;
      previewWindow = preview.reportWindow;
    } catch (error) {
      previewError = [previewError, error instanceof Error ? error.message : String(error)].filter(Boolean).join(" ");
    }
  }
  return <main className="w-full"><SiteRouteTitle title="Reserveinfo Post" /><ReserveinfoPostTool initialSchedule={initialSchedule} initialQueue={initialQueue} initialPreview={initialPreview} reportWindow={previewWindow} previewError={previewError} initialTemplateVariant={initialSchedule.templateVariant} /></main>;
}
