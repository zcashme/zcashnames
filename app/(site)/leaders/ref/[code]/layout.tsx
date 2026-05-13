import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/zns/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const referralCode = decodeURIComponent(code);
  const url = `${BRAND.url}/leaders/ref/${encodeURIComponent(referralCode)}`;

  return {
    title: `${referralCode} Dashboard | ${BRAND.name}`,
    description: "Track referrals, estimated rewards, and leaderboard rank from one tap.",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: `${BRAND.name} Dashboard`,
    },
    openGraph: {
      title: `${referralCode} Dashboard | ${BRAND.name}`,
      description: "Track referrals, estimated rewards, and leaderboard rank from one tap.",
      url,
      images: [
        {
          url: `${BRAND.url}/og/leaders-ref.png`,
          width: 1200,
          height: 630,
          alt: "ZcashNames referral dashboard preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${referralCode} Dashboard | ${BRAND.name}`,
      description: "Track referrals, estimated rewards, and leaderboard rank from one tap.",
      images: [`${BRAND.url}/og/leaders-ref.png`],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function ReferralDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
