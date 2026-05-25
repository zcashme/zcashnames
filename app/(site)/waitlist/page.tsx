import type { Metadata } from "next";
import WaitlistPageClient from "./WaitlistPageClient";
import { getNetworkStats } from "@/lib/network-stats";
import { resolveReferralIdentity } from "@/lib/referrals";

type WaitlistPageProps = {
  searchParams?: Promise<{ ref?: string }>;
};

const WAITLIST_METADATA: Metadata = {
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
  twitter: {
    card: "summary_large_image",
    title: "ZcashNames | Join the Waitlist",
    description: "Claim your Zcash name. Get early access to ZcashNames.",
    images: ["https://www.zcashnames.com/og/home.png"],
  },
};

function normalizeReferralCode(value: string | undefined): string | null {
  const code = (value ?? "").trim();
  if (!code) return null;
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(code)) return null;
  return code;
}

async function lookupInviterName(referralCode: string): Promise<string | null> {
  try {
    const resolved = await resolveReferralIdentity(referralCode, {
      select: "id, name, referral_code, human_referral_code",
    });
    const name = (resolved?.row.name as string | null | undefined)?.trim();
    return name && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }: WaitlistPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const code = normalizeReferralCode(params.ref);
  if (!code) return WAITLIST_METADATA;

  const inviterName = await lookupInviterName(code);
  if (!inviterName) return WAITLIST_METADATA;

  const inviterParam = encodeURIComponent(inviterName);
  const ogImageUrl = `https://www.zcashnames.com/og/home.png?inviter=${inviterParam}`;

  return {
    ...WAITLIST_METADATA,
    openGraph: {
      ...WAITLIST_METADATA.openGraph,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `ZcashNames invite from ${inviterName}`,
        },
      ],
    },
    twitter: {
      ...WAITLIST_METADATA.twitter,
      images: [ogImageUrl],
    },
  };
}

export default async function WaitlistPage() {
  const stats = await getNetworkStats("waitlist");
  return <WaitlistPageClient stats={stats} />;
}
