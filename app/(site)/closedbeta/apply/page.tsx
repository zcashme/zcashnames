import type { Metadata } from "next";
import Link from "next/link";
import BetaApplicationForm from "@/components/closedbeta/BetaApplicationForm";

export const metadata: Metadata = {
  title: "Apply to the Closed Beta — ZcashNames",
  description: "Apply for a spot in the ZcashNames closed beta.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function BetaApplyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-6 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" /> Closed Beta
        </span>
        <h1
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ color: "var(--fg-heading)", marginBottom: "0.75rem" }}
        >
          Apply to the ZcashNames Beta
        </h1>
        <p
          className="text-base"
          style={{ color: "var(--fg-body)", lineHeight: 1.65 }}
        >
          We&rsquo;re running a small,
          high-signal beta. We're seeking a few testers to provide lots of detail. Tell us a bit about yourself. 
          If there&rsquo;s a spot for you, we&rsquo;ll reach out via your
          preferred contact with an invite code.
        </p>
        <p
          className="text-sm mt-3"
          style={{ color: "var(--fg-muted)" }}
        >
          Already invited?{" "}
          <Link
            href="/closedbeta"
            className="underline"
            style={{ color: "var(--fg-body)" }}
          >
            Read the brief
          </Link>
          .
        </p>
      </header>

      <BetaApplicationForm />
    </div>
  );
}
