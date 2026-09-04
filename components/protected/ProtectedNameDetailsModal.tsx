"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ShareDropdown, { ShareTriggerIcon } from "@/components/ShareDropdown";
import type { ProtectedViewDispute, ProtectedViewRow } from "@/lib/protected/view";
import { buildReferralUrl, getPreferredReferralCode } from "@/lib/referral-code";

type ProtectedNameDetailsModalProps = {
  row: ProtectedViewRow | null;
  isOpen: boolean;
  onClose: () => void;
  onRequest: (row: ProtectedViewRow) => void;
  onDispute: (row: ProtectedViewRow) => void;
};

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-8 w-8"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-7 w-7"}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/** Classic Ethereum diamond mark for ENS priority-claim names. */
function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-7 w-7"}
      aria-hidden="true"
    >
      <path d="M11.944 1.75 5.75 12.03l6.194 3.66 6.194-3.66L11.944 1.75z" opacity="0.7" />
      <path d="M11.944 17.35 5.75 13.69 11.944 22.25l6.194-8.56-6.194 3.66z" />
      <path d="M11.944 15.69 5.75 12.03l6.194-2.74 6.194 2.74-6.194 3.66z" opacity="0.85" />
    </svg>
  );
}

function ZcashMeIcon() {
  // Circle badge is h-16 w-16 (64px); fill nearly the full disc with a thin margin.
  // Favicon artwork sits high in the PNG, so nudge it down for optical centering.
  return (
    <span className="relative block h-14 w-14 overflow-hidden rounded-full">
      <Image
        src="/assets/icons/zcashme-favicon-64.png"
        alt=""
        width={56}
        height={56}
        className="block h-14 w-14 translate-y-[3px] object-cover"
        aria-hidden="true"
      />
    </span>
  );
}

function DetailsHeaderIcon({ row }: { row: ProtectedViewRow }) {
  if (row.ens_priority_claim) {
    return <EthereumIcon />;
  }
  if (row.zm_priority_claim) {
    return <ZcashMeIcon />;
  }
  return <EllipsisIcon />;
}

function renderDetailValue(value: string | null | undefined) {
  return value && value.length > 0 ? value : "—";
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNameStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "under_review") return "Under Review";
  if (normalized === "protected") return "Protected";
  if (normalized === "rejected") return "Rejected";
  return status.replaceAll("_", " ");
}

function getNameStatusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "protected") {
    return {
      color: "var(--accent-green, #27b36a)",
      background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
    };
  }

  if (normalized === "under_review") {
    return {
      color: "var(--accent-yellow, #d6a852)",
      background: "color-mix(in srgb, var(--accent-yellow, #d6a852) 12%, transparent)",
    };
  }

  if (normalized === "rejected") {
    return {
      color: "var(--accent-red, #e05252)",
      background: "color-mix(in srgb, var(--accent-red, #e05252) 12%, transparent)",
    };
  }

  return {
    color: "var(--fg-muted)",
    background: "var(--market-stats-segment-active-bg)",
  };
}

/** Map DB review_status → display labels the product uses. */
function getDisputeStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "accepted" || normalized === "approved") return "Approved";
  if (normalized === "dismissed" || normalized === "denied") return "Denied";
  if (normalized === "under_review") return "Under Review";
  return status.replaceAll("_", " ");
}

function getDisputeStatusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "accepted" || normalized === "approved") {
    return {
      color: "var(--accent-green, #27b36a)",
      background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
    };
  }

  if (normalized === "under_review") {
    return {
      color: "var(--accent-yellow, #d6a852)",
      background: "color-mix(in srgb, var(--accent-yellow, #d6a852) 12%, transparent)",
    };
  }

  if (
    normalized === "dismissed"
    || normalized === "denied"
    || normalized === "rejected"
  ) {
    return {
      color: "var(--accent-red, #e05252)",
      background: "color-mix(in srgb, var(--accent-red, #e05252) 12%, transparent)",
    };
  }

  return {
    color: "var(--fg-muted)",
    background: "var(--market-stats-segment-active-bg)",
  };
}

function StatusBadge({
  label,
  style,
}: {
  label: string;
  style: { color: string; background: string };
}) {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
      style={style}
    >
      {label}
    </span>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt
        className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--fg-muted)" }}
      >
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm leading-6" style={{ color: "var(--fg-body)" }}>
        {children}
      </dd>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "down" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d={direction === "right" ? "m9 6 6 6-6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M6 18V10" />
      <path d="M12 18V6" />
      <path d="M18 18v-8" />
    </svg>
  );
}

const referralActionClassName =
  "grid min-h-11 w-full grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-2 rounded-2xl border border-border-muted bg-transparent px-3 py-2 text-sm font-semibold text-fg-heading transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]";

function UrlList({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return <span style={{ color: "var(--fg-muted)" }}>—</span>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {urls.map((url) => (
        <li key={url} className="min-w-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium underline underline-offset-2 transition-[filter] duration-200 hover:brightness-110"
            style={{ color: "var(--color-accent-interactive)" }}
          >
            {url}
          </a>
        </li>
      ))}
    </ul>
  );
}

function DisputeCard({
  dispute,
  index,
}: {
  dispute: ProtectedViewDispute;
  index: number;
}) {
  return (
    <article
      className="rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: "color-mix(in srgb, var(--faq-border) 88%, transparent)",
        background: "color-mix(in srgb, var(--color-bg-elevated, transparent) 55%, transparent)",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
          Dispute {index}
        </p>
        <StatusBadge
          label={getDisputeStatusLabel(dispute.review_status)}
          style={getDisputeStatusStyle(dispute.review_status)}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <FieldBlock label="Submitted">{formatTimestamp(dispute.created_at)}</FieldBlock>
        <FieldBlock label="Category">{renderDetailValue(dispute.category)}</FieldBlock>
        <FieldBlock label="Name status at filing">
          {getNameStatusLabel(dispute.name_status_at_submission)}
        </FieldBlock>
        <FieldBlock label="Parent name">
          {renderDetailValue(dispute.parent_name)}
        </FieldBlock>
        <div className="col-span-2">
          <FieldBlock label="Reason">{renderDetailValue(dispute.reason)}</FieldBlock>
        </div>
        <div className="col-span-2">
          <FieldBlock label="Evidence">
            <UrlList urls={dispute.evidence} />
          </FieldBlock>
        </div>
        {dispute.decision ? (
          <div
            className="col-span-2 mt-1 border-t pt-3"
            style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
          >
            <FieldBlock label="Decision reason">
              {renderDetailValue(dispute.decision.reason)}
            </FieldBlock>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export default function ProtectedNameDetailsModal({
  row,
  isOpen,
  onClose,
  onRequest,
  onDispute,
}: ProtectedNameDetailsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !row || typeof document === "undefined") return null;

  const status = row.status.toLowerCase();
  const canRequest = !row.redeemed && status === "protected";
  const canDispute = !row.redeemed && (status === "protected" || status === "rejected");
  const referralCode = row.referral_code
    ? getPreferredReferralCode({
        referral_code: row.referral_code,
        human_referral_code: row.human_referral_code,
      })
    : null;
  const referralUrl = referralCode ? buildReferralUrl(referralCode) : null;
  const referralDashboardHref = referralCode
    ? `/leaders/ref/${encodeURIComponent(referralCode)}`
    : null;
  const hasFamilyVariants = Boolean(row.parent_name) || (row.variant_names?.length ?? 0) > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="protected-name-details-title"
        className="relative isolate w-full max-w-lg overflow-visible"
        style={{
          height: "50vh",
          maxHeight: "50vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="absolute left-1/2 top-0 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
          style={{
            background: "var(--color-raised)",
            borderColor: "var(--faq-border)",
            color: "var(--fg-heading)",
            boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
          }}
          aria-hidden="true"
        >
          <DetailsHeaderIcon row={row} />
        </span>

        {/* Inner shell clips the scrollbar to the rounded corners */}
        <div
          className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl"
          style={{
            background: "var(--feature-card-bg)",
            border: "1px solid var(--faq-border)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5 pt-12 sm:px-8 [scrollbar-gutter:stable]"
            onWheel={(event) => event.stopPropagation()}
          >
            <div
              className="mb-5 pb-5"
              style={{
                borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <h2
                    id="protected-name-details-title"
                    className="min-w-0 text-left text-xl font-bold leading-none"
                    style={{ color: "var(--fg-heading)" }}
                  >
                    {row.normalized_name}
                  </h2>
                  <StatusBadge
                    label={getNameStatusLabel(row.status)}
                    style={getNameStatusStyle(row.status)}
                  />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="zns-modal-close inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              {row.parent_name ? (
                <FieldBlock label="Parent name">
                  <Link
                    href={`/protected?${new URLSearchParams({
                      search: row.parent_name,
                      searchMode: "exact",
                      details: "1",
                    }).toString()}`}
                    className="font-medium underline underline-offset-2 transition-[filter] duration-200 hover:brightness-110"
                    style={{ color: "var(--color-accent-interactive)" }}
                  >
                    {row.parent_name}
                  </Link>
                </FieldBlock>
              ) : (
                <FieldBlock label="Variant name(s)">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {(row.variant_names ?? []).length > 0 ? (
                      <span>{row.variant_names.join(", ")}</span>
                    ) : null}
                    {status === "protected" ? (
                      <Link
                        href={`/protected/suggest?${new URLSearchParams({
                          type: "variant",
                          parent: row.normalized_name || row.name,
                          category: row.category,
                          source: "protected-variant-add",
                        }).toString()}`}
                        className="font-medium transition-[filter] duration-200 hover:brightness-110"
                        style={{ color: "var(--color-accent-interactive)" }}
                      >
                        Add +
                      </Link>
                    ) : null}
                  </div>
                </FieldBlock>
              )}
              <FieldBlock label="Category">{renderDetailValue(row.category)}</FieldBlock>
              <div className="col-span-2">
                <FieldBlock label="Reason">{renderDetailValue(row.reason)}</FieldBlock>
              </div>
              <div className="col-span-2">
                <FieldBlock label="Evidence URLs">
                  <UrlList urls={row.evidence ?? []} />
                </FieldBlock>
              </div>
              <FieldBlock label="Protected">{formatTimestamp(row.protected_at)}</FieldBlock>
              <FieldBlock label="Expires">
                {row.expires_at ? formatTimestamp(row.expires_at) : "Never"}
              </FieldBlock>
              <FieldBlock label="Redeemed">
                {row.redeemed ? (
                  <Link
                    href={`/explorer?name=${encodeURIComponent(row.normalized_name || row.name)}`}
                    className="font-medium underline underline-offset-2 transition-[filter] duration-200 hover:brightness-110"
                    style={{ color: "var(--color-accent-interactive)" }}
                  >
                    View on Explorer
                  </Link>
                ) : (
                  "No"
                )}
              </FieldBlock>
              {row.status.toLowerCase() === "rejected" ? (
                <>
                  <FieldBlock label="Rejected">{formatTimestamp(row.rejected_at)}</FieldBlock>
                  <div className="col-span-2">
                    <FieldBlock label="Rejected reason">
                      {renderDetailValue(row.rejected_reason)}
                    </FieldBlock>
                  </div>
                </>
              ) : null}
              <FieldBlock label="Updated">{formatTimestamp(row.updated_at)}</FieldBlock>
              <FieldBlock label="Created">{formatTimestamp(row.created_at)}</FieldBlock>
            </dl>

            {referralCode && referralUrl && referralDashboardHref ? (
              <section
                className="mt-6 space-y-3 pt-5"
                style={{
                  borderTop: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                }}
              >
                <h3
                  className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {hasFamilyVariants ? "Family referrals" : "Referrals"}
                </h3>
                <div className="flex items-stretch justify-center gap-2 pt-1">
                  <div className="w-48 shrink-0">
                    <ShareDropdown
                      label="Reflink"
                      shareUrl={referralUrl}
                      message={`Join Zcash Names with this referral link: ${referralUrl}`}
                      xMessage={`Join Zcash Names with this referral link: ${referralUrl}`}
                      emailSubject="Join Zcash Names"
                      buttonClassName={referralActionClassName}
                      menuAlign="left"
                      menuDirection="down"
                      portalMenu
                      menuStyle={{ zIndex: 10050 }}
                      renderTriggerContent={(open) => (
                        <>
                          <ShareTriggerIcon />
                          <span className="min-w-0 truncate text-center">Reflink</span>
                          <span
                            className={`inline-flex transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          >
                            <ChevronIcon direction="down" />
                          </span>
                        </>
                      )}
                    />
                  </div>
                  <div className="w-48 shrink-0">
                    <Link href={referralDashboardHref} className={referralActionClassName}>
                      <BarChartIcon />
                      <span className="min-w-0 truncate text-center">Dashboard</span>
                      <span aria-hidden="true" className="inline-flex">
                        <ChevronIcon direction="right" />
                      </span>
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            <section
              className="mt-6 pt-5"
              style={{
                borderTop: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                  className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Disputes
                </h3>
                <span className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  {(row.disputes ?? []).length}
                </span>
              </div>
              {(row.disputes ?? []).length === 0 ? (
                <p className="text-sm leading-6" style={{ color: "var(--fg-muted)" }}>
                  No disputes have been submitted for this name.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(row.disputes ?? []).map((dispute, disputeIndex) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      index={disputeIndex + 1}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div
            className="shrink-0 border-t px-6 py-4 sm:px-8"
            style={{
              borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
              background: "var(--feature-card-bg)",
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onRequest(row)}
                disabled={!canRequest}
                title={
                  canRequest
                    ? "Open the access request form with this name selected"
                    : "Only non-redeemed protected names can be requested"
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: canRequest ? "var(--home-result-primary-shadow)" : "none",
                }}
              >
                Request
              </button>
              <button
                type="button"
                onClick={() => onDispute(row)}
                disabled={!canDispute}
                title={
                  canDispute
                    ? "Open the dispute form with this name selected"
                    : "Only non-redeemed protected or rejected names can be disputed"
                }
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border-muted bg-transparent px-5 py-2 text-sm font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dispute
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
