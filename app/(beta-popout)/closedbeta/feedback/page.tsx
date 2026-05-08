import type { Metadata } from "next";
import FeedbackPanelBody from "@/components/closedbeta/FeedbackPanelBody";
import { readCurrentStage, readCurrentTester } from "@/lib/beta/gate";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Submit Feedback — ZcashNames Beta",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FeedbackPopoutPage() {
  const [tester, stage] = await Promise.all([
    readCurrentTester(),
    readCurrentStage(),
  ]);

  let focus: ("user" | "sdk")[] = [];
  if (tester) {
    const { data } = await db
      .from("beta_testers")
      .select("focus_areas")
      .eq("id", tester.id)
      .maybeSingle();
    if (data?.focus_areas) {
      focus = (data.focus_areas as unknown[]).filter(
        (v): v is "user" | "sdk" => v === "user" || v === "sdk",
      );
    }
  }

  const testerName = tester?.displayName ?? null;
  const activeStage = stage ?? "testnet";

  return (
    <main className="fixed inset-0">
      <FeedbackPanelBody
        mode="popout"
        stage={activeStage}
        initialTesterName={testerName}
        initialFocus={focus}
      />
    </main>
  );
}
