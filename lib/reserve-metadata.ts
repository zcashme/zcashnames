import type { Metadata } from "next";
import { BRAND } from "@/lib/zns/brand";

const RESERVE_TITLE = "Reserve Waitlist Spot - Zcash Names";
const RESERVE_DESCRIPTION =
  "Open your Zcash Names reservation dashboard and prepare one ZIP-321 payment request per name.";
const RESERVE_CANONICAL = "https://www.zcashnames.com/reserve";

const previewImage = {
  url: BRAND.previewImage,
  width: 1200,
  height: 630,
  alt: RESERVE_TITLE,
};

/** Shared SEO/OG for `/reserve` and the `/waitlist/reserve` alias. */
export const RESERVE_METADATA: Metadata = {
  title: RESERVE_TITLE,
  description: RESERVE_DESCRIPTION,
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: RESERVE_CANONICAL },
  openGraph: {
    title: RESERVE_TITLE,
    description: RESERVE_DESCRIPTION,
    url: RESERVE_CANONICAL,
    siteName: BRAND.name,
    type: "website",
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    site: BRAND.twitter,
    title: RESERVE_TITLE,
    description: RESERVE_DESCRIPTION,
    images: [previewImage],
  },
};
