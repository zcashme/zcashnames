// Server component: fetches leaderboard data once and renders the page with SEO
// metadata. LeaderboardContent receives the data as a prop and stays interactive
// for local UI state (toggles, expand-more, etc.).
import type { Metadata } from "next";
import { getLeadersData } from "@/lib/leaders/leaders";
import LeaderboardContent from "./LeaderboardContent";

export const metadata: Metadata = {
  title: "Leaderboard | ZcashNames",
  description: "Global referral rankings, growth, and rewards progress.",
  alternates: {
    canonical: "https://www.zcashnames.com/leaders",
  },
  openGraph: {
    title: "Leaderboard | ZcashNames",
    description: "Global referral rankings, growth, and rewards progress.",
    url: "https://www.zcashnames.com/leaders",
    images: [
      {
        url: "/og/leaders.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames leaders leaderboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard | ZcashNames",
    description: "Global referral rankings, growth, and rewards progress.",
    images: ["/og/leaders.png"],
  },
};

export default async function LeadersPage() {
  const data = await getLeadersData("confirmed");
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      <LeaderboardContent data={data} />
    </main>
  );
}


