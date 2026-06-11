import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FeedbackPanelBody from "@/components/closedbeta/FeedbackPanelBody";
import { readCurrentBetaAccessSession, readCurrentStage } from "@/lib/beta/gate";

export const metadata: Metadata = {
  title: "Submit Feedback - ZcashNames Beta",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FeedbackPopoutPage() {
  const [session, stage] = await Promise.all([
    readCurrentBetaAccessSession(),
    readCurrentStage(),
  ]);

  const feedbackEnabled =
    (session?.kind === "tester" && session.tester.cohort === "v2") ||
    (session?.kind === "shared" && session.testerId === "shared_mainnet");

  if (!feedbackEnabled) {
    redirect("/");
  }

  return (
    <main className="fixed inset-0">
      <FeedbackPanelBody
        mode="popout"
        stage={stage ?? "testnet"}
        initialTesterName={session?.kind === "tester" ? session.tester.displayName : null}
      />
    </main>
  );
}
