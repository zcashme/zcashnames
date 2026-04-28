import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";
import { db } from "@/lib/db";

type HomePageProps = {
  searchParams?: Promise<{ ref?: string }>;
};

const HOME_METADATA: Metadata = {
  title: "ZcashNames | Personal names for shielded addresses",
  description: "Claim yours.",
  alternates: {
    canonical: "https://www.zcashnames.com/",
  },
  openGraph: {
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
    url: "https://www.zcashnames.com/",
    images: [
      {
        url: "https://www.zcashnames.com/og/home.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames homepage preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
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
    const { data, error } = await db
      .from("zn_waitlist")
      .select("name")
      .eq("referral_code", referralCode)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    const name = (data?.name as string | null | undefined)?.trim();
    return name && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const code = normalizeReferralCode(params.ref);
  if (!code) return HOME_METADATA;

  const inviterName = await lookupInviterName(code);
  if (!inviterName) return HOME_METADATA;

  const inviterParam = encodeURIComponent(inviterName);
  const ogImageUrl = `https://www.zcashnames.com/og/home.png?inviter=${inviterParam}`;

  return {
    ...HOME_METADATA,
    openGraph: {
      ...HOME_METADATA.openGraph,
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
      ...HOME_METADATA.twitter,
      images: [ogImageUrl],
    },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
