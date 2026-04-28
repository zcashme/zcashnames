import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { extractReferralCode } from "@/lib/referral-code";
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
  },
  twitter: {
    title: "Share Kit | ZcashNames",
    description: "Copy and share prepared draft posts with your waitlist referral link.",
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
  const initialReferralCode = extractReferralCode(firstParam(params.ref) ?? "");
  const markdown = await fs.readFile(SHAREKIT_PATH, "utf8");
  const sections = parseShareKitMarkdown(markdown);

  return (
    <main className="w-full">
      <SiteRouteTitle title="Share Kit" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <ShareKitClient sections={sections} initialReferralCode={initialReferralCode} />
      </section>
    </main>
  );
}
