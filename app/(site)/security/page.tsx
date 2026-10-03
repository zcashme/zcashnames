import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import SecurityCompetitionClient from "@/components/security/SecurityCompetitionClient";
import SecurityRules from "@/components/security/SecurityRules";
import { getSecurityConfig, securityPageModel } from "@/lib/security/config";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Rules and paid submission for the ZNS mint bug bounty competition.";

export const metadata: Metadata = {
  title: "Security Competition - Zcash Names",
  description: DESCRIPTION,
  alternates: { canonical: "https://www.zcashnames.com/security" },
  openGraph: {
    title: "Security Competition | Zcash Names",
    description: DESCRIPTION,
    url: "https://www.zcashnames.com/security",
  },
  twitter: {
    card: "summary",
    title: "Security Competition | Zcash Names",
    description: DESCRIPTION,
  },
};

export default function SecurityPage() {
  const model = securityPageModel(getSecurityConfig());

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title="Security Competition" href="/security" />
      <div className="name-action-column mx-auto w-full min-w-0 max-w-2xl">
        <SecurityRules model={model}>
          <SecurityCompetitionClient model={model} />
        </SecurityRules>
      </div>
    </div>
  );
}
