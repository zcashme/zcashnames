import type { Metadata } from "next";
import Link from "next/link";
import JoinClient from "./JoinClient";

export const metadata: Metadata = {
  title: "Join the Beta - ZcashNames",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ code?: string }> };

export default async function BetaJoinPage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
      {code ? (
        <JoinClient code={code} />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-base" style={{ color: "var(--fg-heading)" }}>
            No invite code found.
          </p>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Use the link from your invite email, or{" "}
            <Link href="/beta/apply" className="underline">
              apply for the beta
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
