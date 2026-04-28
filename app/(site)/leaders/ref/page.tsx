import type { Metadata } from "next";
import ReferralCodeEntryClient from "./ReferralCodeEntryClient";

export const metadata: Metadata = {
  title: "Referral Dashboard | ZcashNames Leaders",
  description: "Your referral dashboard for rewards progress.",
  alternates: {
    canonical: "https://www.zcashnames.com/leaders/ref",
  },
  openGraph: {
    title: "Referral Dashboard | ZcashNames",
    description: "Your referral dashboard for rewards progress.",
    url: "https://www.zcashnames.com/leaders/ref",
    images: [
      {
        url: "https://www.zcashnames.com/og/leaders-ref.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames referral dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Referral Dashboard | ZcashNames",
    description: "Your referral dashboard for rewards progress.",
    images: ["https://www.zcashnames.com/og/leaders-ref.png"],
  },
};

export default function ReferralCodeEntryPage() {
  return <ReferralCodeEntryClient />;
}
