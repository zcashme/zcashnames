import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { getLatestEnsOutreachBatch } from "@/lib/ens-outreach/store";
import EnsOutreachTool from "./EnsOutreachTool";

export const metadata: Metadata = { title: "ENS Outreach | ZcashNames", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EnsOutreachPage() {
  let batch = null; let error: string | null = null;
  try { batch = await getLatestEnsOutreachBatch(); } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  return <main className="w-full"><SiteRouteTitle title="ENS Outreach" /><EnsOutreachTool initialBatch={batch} initialError={error} /></main>;
}
