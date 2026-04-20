import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import AddressMeComposer from "./AddressMeComposer";

export const metadata: Metadata = {
  title: "Address Me By My Name | ZcashNames",
  description: "Create a square Address Me By My Name image with custom artwork and text color.",
};

export default function AddressMeByMyNamePage() {
  return (
    <main className="w-full">
      <SiteRouteTitle title="Address Me By My Name" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <AddressMeComposer />
      </section>
    </main>
  );
}
