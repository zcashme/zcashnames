import type { Metadata } from "next";
import BetaApplyPageContent from "@/components/beta/BetaApplyPageContent";

export const metadata: Metadata = {
  title: "Apply to the Beta - ZcashNames",
  description: "Apply for the next ZcashNames beta round.",
  openGraph: {
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    url: "https://www.zcashnames.com/beta/apply",
    images: [
      {
        url: "/og/beta.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames beta invitation preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    images: ["/og/beta.png"],
  },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Beta application page — renders a contextual header explaining the current
 * cohort's focus, then the BetaV2ApplicationForm. This is a client-accessible
 * route; the form submits to server actions that write to the beta_testers table
 * and trigger email notifications.
 */
export default function BetaApplyPage() {
  return <BetaApplyPageContent />;
}
