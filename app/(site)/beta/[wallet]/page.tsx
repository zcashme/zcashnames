import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BetaV2Brief, { BETA_V2_SECTIONS } from "@/components/beta/BetaV2Brief";
import BetaV2Toc from "@/components/beta/BetaV2Toc";
import BetaWalletBrief, { getBetaWalletBriefSections } from "@/components/beta/BetaWalletBrief";
import WalletBrandLogo from "@/components/wallets/WalletBrandLogo";
import { getWalletBrand, isWalletBrandSlug } from "@/lib/wallets/catalog";

interface Props {
  params: Promise<{ wallet: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  const brand = getWalletBrand(wallet);
  if (!brand) {
    return {
      title: "Beta - ZcashNames",
      robots: { index: false, follow: false, nocache: true },
    };
  }

  const pageTitle = `Test ZcashNames in ${brand.displayName}`;

  return {
    title: `${pageTitle} - ZcashNames`,
    description: `Read the ${brand.displayName} ZcashNames beta brief.`,
    openGraph: {
      title: pageTitle,
      description: `Read the ${brand.displayName} ZcashNames beta brief.`,
      url: `https://www.zcashnames.com/beta/${brand.slug}`,
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
      title: pageTitle,
      description: `Read the ${brand.displayName} ZcashNames beta brief.`,
      images: ["/og/beta.png"],
    },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function BrandedBetaBriefPage({ params }: Props) {
  const { wallet } = await params;
  const brand = getWalletBrand(wallet);
  const brandSlug = brand?.slug;
  const knownBrand = brandSlug ? isWalletBrandSlug(brandSlug) : false;
  const sections = knownBrand && brand ? getBetaWalletBriefSections(brand) : BETA_V2_SECTIONS;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-10">
      <SiteRouteTitle title={brand ? `Test ZcashNames in ${brand.displayName}` : "Beta"} />
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="contents md:block md:w-56 md:shrink-0 md:sticky md:top-24 md:self-start">
          {knownBrand && brand ? (
            <div className="mb-5 flex min-h-24 items-center justify-center md:justify-start">
              {brand.appIcon ? (
                <img
                  src={brand.appIcon.src}
                  alt={brand.appIcon.alt}
                  className={brand.slug === "zingo"
                    ? "h-28 w-28 rounded-[18px] object-contain"
                    : "h-20 w-20 rounded-[18px] object-contain"}
                />
              ) : (
                <WalletBrandLogo brand={brand} />
              )}
            </div>
          ) : null}
          <BetaV2Toc sections={sections} />
        </aside>
        <main className="flex-1 min-w-0">
          {brandSlug ? <BetaWalletBrief brandSlug={brandSlug} /> : <BetaV2Brief />}
        </main>
      </div>
    </div>
  );
}
