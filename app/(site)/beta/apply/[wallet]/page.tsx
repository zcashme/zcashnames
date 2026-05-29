import type { Metadata } from "next";
import BetaApplyPageContent from "@/components/beta/BetaApplyPageContent";
import { getWalletBrand, isWalletBrandSlug } from "@/lib/wallets/catalog";

interface Props {
  params: Promise<{ wallet: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  const brand = getWalletBrand(wallet);
  if (!brand) {
    return {
      title: "Apply to the Beta - ZcashNames",
      robots: { index: false, follow: false, nocache: true },
    };
  }

  return {
    title: `Apply to the ${brand.displayName} Beta - ZcashNames`,
    description: `Apply for the ${brand.displayName} ZcashNames beta round.`,
    openGraph: {
      title: `${brand.displayName} Beta Invitation`,
      description: `Apply for the ${brand.displayName} ZcashNames beta round.`,
      url: `https://www.zcashnames.com/beta/apply/${brand.slug}`,
      images: [
        {
          url: "/og/beta.png",
          width: 1200,
          height: 630,
          alt: `${brand.displayName} ZcashNames beta invitation preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${brand.displayName} Beta Invitation`,
      description: `Apply for the ${brand.displayName} ZcashNames beta round.`,
      images: ["/og/beta.png"],
    },
    robots: { index: false, follow: false, nocache: true },
  };
}

export const dynamic = "force-dynamic";

export default async function BrandedBetaApplyPage({ params }: Props) {
  const { wallet } = await params;

  return <BetaApplyPageContent brandSlug={isWalletBrandSlug(wallet) ? wallet : undefined} />;
}
