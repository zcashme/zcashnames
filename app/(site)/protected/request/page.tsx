import type { Metadata } from "next";
import Link from "next/link";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ProtectedRequestForm from "@/components/protected/ProtectedRequestForm";
import { getRequestableProtectedNameByName } from "@/lib/protected/requests";
import {
  PROTECTED_REQUEST_CONTACT_KINDS,
  type ProtectedRequestContactKind,
} from "@/lib/protected/shared";

const DEFAULT_TITLE = "Access a Protected Name";
const DEFAULT_DESCRIPTION =
  "Request access to a protected Zcash Name if you represent the person, organization, or identity associated with it.";

type ProtectedRequestPageProps = {
  searchParams?: Promise<{
    name?: string;
    contactKind?: string;
    contactValue?: string;
  }>;
};

function headingForName(name: string | null): string {
  return name ? `Request access to ${name}` : DEFAULT_TITLE;
}

export async function generateMetadata({
  searchParams,
}: ProtectedRequestPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const requestedName = typeof params.name === "string" ? params.name.trim() : "";
  const lookedUp = requestedName ? await getRequestableProtectedNameByName(requestedName) : null;
  const titleName = lookedUp?.value ?? (requestedName || null);
  const title = headingForName(titleName);

  return {
    title: `${title} - Zcash Names`,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: "https://www.zcashnames.com/protected/request" },
    openGraph: {
      title: `${title} | Zcash Names`,
      description: DEFAULT_DESCRIPTION,
      url: "https://www.zcashnames.com/protected/request",
      images: [
        {
          url: "/og/protected-request.png",
          width: 1200,
          height: 630,
          alt: "Request a protected Zcash Name preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Zcash Names`,
      description: DEFAULT_DESCRIPTION,
      images: ["/og/protected-request.png"],
    },
  };
}

export const dynamic = "force-dynamic";

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M12 5L5 12L12 19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function ProtectedRequestPage({
  searchParams,
}: ProtectedRequestPageProps) {
  const params = (await searchParams) ?? {};
  const initialName = typeof params.name === "string" ? params.name.trim() : null;
  const rawContactKind = typeof params.contactKind === "string" ? params.contactKind.trim() : "";
  const initialContactKind = (PROTECTED_REQUEST_CONTACT_KINDS as readonly string[]).includes(
    rawContactKind,
  )
    ? (rawContactKind as ProtectedRequestContactKind)
    : null;
  const initialContactValue =
    typeof params.contactValue === "string" ? params.contactValue.trim() : null;
  const lookedUp = initialName ? await getRequestableProtectedNameByName(initialName) : null;
  const titleName = lookedUp?.value ?? initialName;
  const heading = headingForName(titleName);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title={heading} href="/protected/request" />

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/protected"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-muted bg-transparent px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Names
          </Link>
        </div>

        <section
          className="relative w-full rounded-t-2xl border border-b-0 px-6 py-8 sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <HeroShareButton
            message="Request access to a protected name in the Zcash Name Space at ZcashNames:"
            xMessage="Request access to a protected name in the Zcash Name Space at @ZcashNames:"
            shareUrl="https://www.zcashnames.com/protected/request"
            emailSubject="Request a protected Zcash name"
          />
          <div className="grid gap-4">
            <h1
              className="text-center text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
              style={{ color: "var(--fg-heading)" }}
            >
              {titleName ? (
                <>
                  Request access to{" "}
                  <span style={{ color: "var(--color-accent-interactive)" }}>{titleName}</span>
                </>
              ) : (
                heading
              )}
            </h1>
            <p
              className="mx-auto max-w-3xl text-center text-base leading-8 sm:text-lg"
              style={{ color: "var(--fg-body)" }}
            >
              Request access if you represent the person, organization, or identity associated with a
              protected name. Approval does not waive the purchase price.
            </p>
          </div>
        </section>

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <ProtectedRequestForm
            returnHref="/protected"
            initialName={initialName}
            initialContactKind={initialContactKind}
            initialContactValue={initialContactValue}
          />
        </div>
      </div>
    </div>
  );
}
