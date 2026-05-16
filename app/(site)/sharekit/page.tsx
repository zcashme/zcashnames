import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { extractReferralCode } from "@/lib/referral-code";
import { resolveReferralIdentity } from "@/lib/referrals";
import { parseShareKitMarkdown } from "@/lib/sharekit";
import ShareKitClient from "./ShareKitClient";

export const metadata: Metadata = {
  title: "Share Kit | ZcashNames",
  description: "Copy and share prepared draft posts with your waitlist referral link.",
  alternates: {
    canonical: "https://www.zcashnames.com/sharekit",
  },
  openGraph: {
    title: "Share Kit | ZcashNames",
    description: "Copy and share prepared draft posts with your waitlist referral link.",
    url: "https://www.zcashnames.com/sharekit",
    images: [
      {
        url: "https://www.zcashnames.com/og/sharekit.png",
        width: 1200,
        height: 630,
        alt: "Share Kit | ZcashNames",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Share Kit | ZcashNames",
    description: "Copy and share prepared draft posts with your waitlist referral link.",
    images: ["https://www.zcashnames.com/og/sharekit.png"],
  },
};
const SHAREKIT_PATH = path.join(process.cwd(), "content", "sharekit.md");

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ShareKitPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const requestedReferralCode = extractReferralCode(firstParam(params.ref) ?? "");
  const resolvedReferral = requestedReferralCode
    ? await resolveReferralIdentity(requestedReferralCode, {
        select: "id, name, referral_code, human_referral_code",
      }).catch(() => null)
    : null;
  const initialReferralName = (resolvedReferral?.row.name as string | null | undefined)?.trim() || null;
  const initialReferralCode = resolvedReferral?.preferredCode ?? "";
  const initialWarning =
    requestedReferralCode && !initialReferralName
      ? "Referral code not found. Posts are using the default link."
      : "";
  const markdown = await fs.readFile(SHAREKIT_PATH, "utf8");
  const sections = parseShareKitMarkdown(markdown);

  return (
    <main className="w-full">
      <SiteRouteTitle title="Share Kit" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <ShareKitClient
          sections={sections}
          initialReferralCode={initialReferralCode}
          initialReferralName={initialReferralName}
          initialWarning={initialWarning}
        />
      </section>
    </main>
  );
}
