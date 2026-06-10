import type { Metadata } from "next";
import FeedbackPanelBody from "@/components/closedbeta/FeedbackPanelBody";
import { readCurrentStage, readCurrentTester } from "@/lib/beta/gate";

export const metadata: Metadata = {
  title: "Submit Feedback - ZcashNames Beta",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FeedbackPopoutPage() {
  const [tester, stage] = await Promise.all([
    readCurrentTester(),
    readCurrentStage(),
  ]);

  return (
    <main className="fixed inset-0">
      <FeedbackPanelBody
        mode="popout"
        stage={stage ?? "testnet"}
        initialTesterName={tester?.displayName ?? null}
      />
    </main>
  );
}
