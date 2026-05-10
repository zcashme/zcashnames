import type { Metadata } from "next";
import WaitlistPageClient from "./WaitlistPageClient";
import { getNetworkStats } from "@/lib/network-stats";

export const metadata: Metadata = {
  title: "ZcashNames | Join the Waitlist",
  description: "Claim your Zcash name. Get early access to ZcashNames.",
  alternates: { canonical: "https://www.zcashnames.com/waitlist" },
  openGraph: {
    title: "ZcashNames | Join the Waitlist",
    description: "Claim your Zcash name. Get early access to ZcashNames.",
    url: "https://www.zcashnames.com/waitlist",
    images: [
      {
        url: "https://www.zcashnames.com/og/home.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames waitlist",
      },
    ],
  },
};

export default async function WaitlistPage() {
  const stats = await getNetworkStats("waitlist");
  return <WaitlistPageClient stats={stats} />;
}
