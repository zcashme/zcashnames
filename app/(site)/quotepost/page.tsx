import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import QuotePostComposer from "./QuotePostComposer";

export const metadata: Metadata = {
  title: "Quotepost | ZcashNames",
  description: "Create local-only quote graphics in batch.",
  robots: { index: false, follow: false },
  openGraph: { title: "Quotepost" },
  twitter: { title: "Quotepost" },
};

export default function QuotepostPage() {
  return (
    <main className="w-full">
      <SiteRouteTitle title="Quotepost" />
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <QuotePostComposer />
      </section>
    </main>
  );
}
