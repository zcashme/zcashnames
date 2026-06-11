import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  parseStageCookieValue,
  BETA_STAGE_COOKIE_NAME,
  readCurrentBetaAccessSession,
} from "@/lib/beta/gate";
import { getChainStats } from "@/lib/network-stats";
import NetworkPageClient from "./NetworkPageClient";

export const metadata: Metadata = {
  title: "ZcashNames | Personal names for shielded addresses",
  description: "Claim yours.",
  alternates: { canonical: "https://www.zcashnames.com/" },
  openGraph: {
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
    url: "https://www.zcashnames.com/",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "ZcashNames" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
    images: ["/og/home.png"],
  },
};

export default async function HomePage() {
  const store = await cookies();
  const stageCookie = store.get(BETA_STAGE_COOKIE_NAME)?.value;
  const parsed = stageCookie ? parseStageCookieValue(stageCookie) : null;
  const network = parsed?.stage ?? "mainnet";
  const [stats, session] = await Promise.all([
    getChainStats(network),
    readCurrentBetaAccessSession(),
  ]);

  const feedbackEnabled =
    (session?.kind === "tester" && session.tester.cohort === "v2") ||
    (session?.kind === "shared" && session.testerId === "shared_mainnet");

  return (
    <NetworkPageClient
      network={network}
      stats={stats}
      feedbackEnabled={feedbackEnabled}
    />
  );
}
