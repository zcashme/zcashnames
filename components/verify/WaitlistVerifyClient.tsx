"use client";

import { useId, useMemo, useState } from "react";
import { QrBlock } from "@/components/ui/QrBlock";

type VerifyCard = {
  id: string;
  name: string | null;
  memo: string | null;
  memoError: string | null;
};

type WaitlistVerifyClientProps = {
  paymentAddress: string;
  baseAmountZec: string;
  cards: VerifyCard[];
};

function parseDonationToZats(rawValue: string): number | null {
  const value = rawValue.trim();
  if (!value) return 0;
  if (!/^\d+(\.\d{0,8})?$/.test(value)) return null;
  const [wholePart, fractionPart = ""] = value.split(".");
  const whole = Number(wholePart);
  if (!Number.isFinite(whole)) return null;
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  return whole * 100_000_000 + Number(paddedFraction);
}

function parseZecToZats(value: string): number {
  const [wholePart, fractionPart = ""] = value.split(".");
  const whole = Number(wholePart);
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  return whole * 100_000_000 + Number(paddedFraction);
}

function formatZatsToZec(zats: number): string {
  const whole = Math.floor(zats / 100_000_000);
  const fraction = String(zats % 100_000_000).padStart(8, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function VerifyPaymentCard({
  paymentAddress,
  baseAmountZec,
  card,
}: {
  paymentAddress: string;
  baseAmountZec: string;
  card: VerifyCard;
}) {
  const donationId = useId();
  const [donationInput, setDonationInput] = useState("0");
  const baseAmountZats = useMemo(() => parseZecToZats(baseAmountZec), [baseAmountZec]);
  const donationZats = useMemo(() => parseDonationToZats(donationInput), [donationInput]);
  const totalAmountZec = useMemo(() => {
    if (donationZats == null) return baseAmountZec;
    return formatZatsToZec(baseAmountZats + donationZats);
  }, [baseAmountZats, baseAmountZec, donationZats]);

  return (
    <article
      className="rounded-[28px] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.12)] sm:p-6"
      style={{
        borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 26%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 72%, transparent), color-mix(in srgb, var(--faq-border) 12%, transparent))",
      }}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="mb-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{
              background: "color-mix(in srgb, var(--color-brand-blue) 14%, transparent)",
              color: "var(--color-brand-blue)",
            }}
          >
            Reserve spot
          </p>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
            {card.name?.trim() || "Unavailable name"}
          </h2>
        </div>
        <div className="text-right text-xs" style={{ color: "var(--fg-muted)" }}>
          <div>Waitlist row</div>
          <code className="font-mono text-[0.78rem]" style={{ color: "var(--fg-body)" }}>
            {card.id}
          </code>
        </div>
      </div>

      {card.memoError ? (
        <div
          className="rounded-2xl border px-4 py-4 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--accent-red, #e05252) 40%, transparent)",
            background: "color-mix(in srgb, var(--accent-red, #e05252) 8%, transparent)",
            color: "var(--fg-body)",
          }}
        >
          {card.memoError}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Reserve fee" value={`${baseAmountZec} ZEC`} />
              <MetricCard
                label="Total with donation"
                value={`${totalAmountZec} ZEC`}
                accent
              />
            </div>

            <label className="block" htmlFor={donationId}>
              <span className="mb-2 block text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                Optional donation
              </span>
              <input
                id={donationId}
                type="number"
                min="0"
                step="0.00000001"
                inputMode="decimal"
                value={donationInput}
                onChange={(event) => setDonationInput(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-base outline-none transition"
                style={{
                  borderColor: "var(--faq-border)",
                  background: "color-mix(in srgb, var(--color-bg-elevated, transparent) 75%, transparent)",
                  color: "var(--fg-body)",
                }}
              />
            </label>

            {donationZats == null ? (
              <p className="text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
                Enter a valid ZEC amount with up to 8 decimal places.
              </p>
            ) : null}

            <div className="rounded-2xl border px-4 py-4" style={{ borderColor: "var(--faq-border)" }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--fg-muted)" }}>
                Memo
              </p>
              <code
                className="block break-all text-sm font-mono"
                style={{ color: "var(--fg-body)" }}
              >
                {card.memo}
              </code>
            </div>
          </div>

          <div>
            <QrBlock
              address={paymentAddress}
              amount={totalAmountZec}
              memo={card.memo ?? ""}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{
        borderColor: accent
          ? "color-mix(in srgb, var(--color-brand-blue) 36%, var(--faq-border))"
          : "var(--faq-border)",
        background: accent
          ? "color-mix(in srgb, var(--color-brand-blue) 10%, transparent)"
          : "color-mix(in srgb, var(--color-bg-elevated, transparent) 75%, transparent)",
      }}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--fg-muted)" }}>
        {label}
      </p>
      <p className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
        {value}
      </p>
    </div>
  );
}

export default function WaitlistVerifyClient({
  paymentAddress,
  baseAmountZec,
  cards,
}: WaitlistVerifyClientProps) {
  return (
    <div className="space-y-6">
      {cards.map((card) => (
        <VerifyPaymentCard
          key={card.id}
          paymentAddress={paymentAddress}
          baseAmountZec={baseAmountZec}
          card={card}
        />
      ))}
    </div>
  );
}

