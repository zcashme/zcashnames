import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

type HomePageProps = {
  searchParams?: Promise<{ ref?: string; token?: string }>;
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

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  return HOME_METADATA;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  return <HomePageClient />;
}
