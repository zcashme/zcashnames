import type { Metadata } from "next";
import PressView from "@/components/press/PressView";
import { getLeadersTimeSeries } from "@/lib/leaders/leaders";
import { getPressStats } from "@/lib/press/stats";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Human-readable names for shielded Zcash addresses. Early Access opens 15 October 2026. Sharing a Zcash name does not expose shielded transaction history.";

export const metadata: Metadata = {
  title: "Press - Zcash Names",
  description: DESCRIPTION,
  alternates: { canonical: "https://www.zcashnames.com/press" },
  openGraph: {
    title: "Press | Zcash Names",
    description: DESCRIPTION,
    url: "https://www.zcashnames.com/press",
    images: [
      {
        url: "/og/press.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names press kit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Press | Zcash Names",
    description: DESCRIPTION,
    images: ["/og/press.png"],
  },
};

export default async function PressPage() {
  const [stats, signupSeries] = await Promise.all([getPressStats(), getLeadersTimeSeries()]);
  return <PressView stats={stats} signupSeries={signupSeries} />;
}
