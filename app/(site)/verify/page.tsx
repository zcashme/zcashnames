import type { Metadata } from "next";
import Link from "next/link";
import WaitlistVerifyClient from "@/components/verify/WaitlistVerifyClient";
import {
  getWaitlistVerifyPaymentAddress,
  getWaitlistVerifyReserveFeeZec,
  parseWaitlistVerifyToken,
} from "@/lib/campaigns/waitlist-confirm-response";
import {
  buildWaitlistVerifyMemo,
  findWaitlistRowsByNormalizedEmail,
} from "@/lib/campaigns/waitlist-verify";

type VerifyPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  title: "Verify Waitlist Spot - Zcash Names",
  description: "Verify your Zcash Names waitlist spot and prepare one ZIP-321 payment request per name.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

function ErrorPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-[28px] border px-6 py-8 text-center"
      style={{
        borderColor: "color-mix(in srgb, var(--accent-red, #e05252) 28%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--accent-red, #e05252) 7%, transparent), color-mix(in srgb, var(--faq-border) 12%, transparent))",
      }}
    >
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7" style={{ color: "var(--fg-body)" }}>
        {body}
      </p>
      <p className="mt-4 text-sm" style={{ color: "var(--fg-muted)" }}>
        If this keeps happening, request a fresh email and try again.
      </p>
    </div>
  );
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = (await searchParams) ?? {};
  const token = params.token?.trim() ?? "";

  if (!token) {
    console.error("[waitlist-verify-page] missing token");
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Missing verify link"
          body="This page requires a signed verify link from your campaign email."
        />
      </div>
    );
  }

  const parsed = parseWaitlistVerifyToken(token);
  if (!parsed) {
    console.error("[waitlist-verify-page] invalid token");
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Verify link expired"
          body="This verify link is invalid or has expired. Open the most recent campaign email and click the link again."
        />
      </div>
    );
  }

  const paymentAddress = getWaitlistVerifyPaymentAddress();
  const baseAmountZec = getWaitlistVerifyReserveFeeZec();
  if (!paymentAddress || !baseAmountZec) {
    console.error("[waitlist-verify-page] missing payment config", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      hasPaymentAddress: Boolean(paymentAddress),
      hasBaseAmount: Boolean(baseAmountZec),
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Verify page unavailable"
          body="The verification payment configuration is incomplete right now."
        />
      </div>
    );
  }

  let rows;
  try {
    rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist rows.";
    console.error("[waitlist-verify-page] row lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load names"
          body="We couldn't load your waitlist names for verification right now."
        />
      </div>
    );
  }

  if (rows.length === 0) {
    console.error("[waitlist-verify-page] no rows found", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="No waitlist names found"
          body="We couldn't find any waitlist names for the email address tied to this verify link."
        />
      </div>
    );
  }

  const cards = rows.map((row) => {
    try {
      return {
        id: row.id,
        name: row.name,
        memo: buildWaitlistVerifyMemo(row.name, row.id),
        memoError: null,
      };
    } catch (error) {
      return {
        id: row.id,
        name: row.name,
        memo: null,
        memoError:
          error instanceof Error
            ? error.message
            : "This row is missing a usable name, so a payment request could not be generated.",
      };
    }
  });

  console.info("[waitlist-verify-page] loaded", {
    normalizedEmail: parsed.normalizedEmail,
    campaignId: parsed.campaignId,
    rowCount: rows.length,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8 text-center">
        <span
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "color-mix(in srgb, var(--color-brand-blue) 14%, transparent)",
            color: "var(--color-brand-blue)",
          }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
          Waitlist verification
        </span>
        <h1
          className="text-3xl font-bold tracking-tight md:text-5xl"
          style={{ color: "var(--fg-heading)" }}
        >
          Reserve your spot in line
        </h1>
        <p
          className="mx-auto mt-4 max-w-3xl text-base leading-7"
          style={{ color: "var(--fg-body)" }}
        >
          We found {rows.length} {rows.length === 1 ? "waitlist name" : "waitlist names"} tied to{" "}
          <strong>{parsed.normalizedEmail}</strong>. Send one separate transaction per card below.
          Each ZIP-321 request already includes the correct admin wallet, reserve fee, and memo.
        </p>
      </header>

      <div
        className="mb-8 rounded-[28px] border px-5 py-5 sm:px-6"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 72%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
        }}
      >
        <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
          Before you send
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
          <li>Each card is one name and one transaction.</li>
          <li>The memo must stay exactly as shown so the payment can be attributed later.</li>
          <li>The donation field is optional and only increases the amount for that specific card.</li>
          <li>If your wallet cannot open the QR directly, copy the URI or manually copy the address, amount, and memo.</li>
        </ul>
      </div>

      <WaitlistVerifyClient
        paymentAddress={paymentAddress}
        baseAmountZec={baseAmountZec}
        cards={cards}
      />

      <p className="mt-8 text-center text-sm" style={{ color: "var(--fg-muted)" }}>
        Need a fresh link? Return to your email and click the verification link again.
        {" "}
        <Link href="/" className="underline" style={{ color: "var(--fg-body)" }}>
          Back to zcashnames.com
        </Link>
      </p>
    </div>
  );
}

