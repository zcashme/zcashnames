import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BetaWalletFaq from "@/components/beta/BetaWalletFaq";
import BetaV2Toc from "@/components/beta/BetaV2Toc";
import WalletBrandLogo from "@/components/wallets/WalletBrandLogo";
import { getWalletFaqSections, hasWalletFaq } from "@/lib/beta/walletFaq";
import { getWalletBrand, isWalletBrandSlug } from "@/lib/wallets/catalog";

interface Props {
  params?: Promise<{ wallet: string }>;
}

async function readWalletParam(params?: Promise<{ wallet: string }>): Promise<string | null> {
  try {
    const resolved = await params;
    return typeof resolved?.wallet === "string" ? resolved.wallet : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const wallet = await readWalletParam(params);
  if (!wallet) {
    return {
      title: "Beta FAQ - ZcashNames",
      robots: { index: false, follow: false, nocache: true },
    };
  }
  const brand = getWalletBrand(wallet);
  const hasFaq = brand && isWalletBrandSlug(wallet) && hasWalletFaq(wallet);

  if (!brand || !hasFaq) {
    return {
      title: "Beta FAQ - ZcashNames",
      robots: { index: false, follow: false, nocache: true },
    };
  }

  const pageTitle = `${brand.displayName} Beta FAQ`;
  const description = `Read the ${brand.displayName} ZcashNames beta FAQ.`;

  return {
    title: `${pageTitle} - ZcashNames`,
    description,
    openGraph: {
      title: pageTitle,
      description,
      url: `https://www.zcashnames.com/beta/${brand.slug}/faq`,
      images: [
        {
          url: "/og/beta.png",
          width: 1200,
          height: 630,
          alt: `${brand.displayName} ZcashNames beta FAQ preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: ["/og/beta.png"],
    },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function BrandedBetaFaqPage({ params }: Props) {
  const wallet = await readWalletParam(params);

  if (!wallet || !isWalletBrandSlug(wallet) || !hasWalletFaq(wallet)) {
    notFound();
  }

  const brand = getWalletBrand(wallet);
  if (!brand) notFound();

  const sections = getWalletFaqSections(wallet);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <SiteRouteTitle title={`${brand.displayName} FAQ`} />
      <div className="flex flex-col gap-10 md:flex-row">
        <aside className="contents md:block md:w-56 md:shrink-0 md:self-start md:sticky md:top-24">
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
          <BetaV2Toc sections={sections} />
        </aside>
        <main className="min-w-0 flex-1">
          <BetaWalletFaq brandSlug={wallet} />
        </main>
      </div>
    </div>
  );
}
