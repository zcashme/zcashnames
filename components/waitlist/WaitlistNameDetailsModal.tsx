"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ShareDropdown, { ShareTriggerIcon } from "@/components/ShareDropdown";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";
import { buildReferralUrl } from "@/lib/referral-code";
import type { PublicWaitlistViewRow } from "@/lib/waitlist/view";

type WaitlistNameDetailsModalProps = {
  row: PublicWaitlistViewRow | null;
  isOpen: boolean;
  onClose: () => void;
  onProtect: (row: PublicWaitlistViewRow) => void;
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

function EthereumIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M11.944 1.75 5.75 12.03l6.194 3.66 6.194-3.66L11.944 1.75z" opacity="0.7" />
      <path d="M11.944 17.35 5.75 13.69 11.944 22.25l6.194-8.56-6.194 3.66z" />
      <path d="M11.944 15.69 5.75 12.03l6.194-2.74 6.194 2.74-6.194 3.66z" opacity="0.85" />
    </svg>
  );
}

function ZcashMeIcon() {
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

function WaitlistHeaderIcon({ row }: { row: PublicWaitlistViewRow }) {
  if (row.ensPriorityClaim) {
    return <EthereumIcon />;
  }
  if (row.zmPriorityClaim) {
    return <ZcashMeIcon />;
  }
  return <ZcashNamesLogoMark alt="" size={40} />;
}

function getStatusLabel(row: PublicWaitlistViewRow): "Protected" | "Reserved" | "Pending" {
  if (row.protected) return "Protected";
  if (row.reserved) return "Reserved";
  return "Pending";
}

function getStatusStyle(status: ReturnType<typeof getStatusLabel>) {
  if (status === "Protected") {
    return {
      color: "var(--color-accent-interactive)",
      background: "color-mix(in srgb, var(--color-accent-interactive) 12%, transparent)",
    };
  }
  if (status === "Reserved") {
    return {
      color: "var(--accent-green, #27b36a)",
      background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
    };
  }
  return {
    color: "var(--accent-red, #d67452)",
    background: "color-mix(in srgb, var(--accent-red, #d67452) 12%, transparent)",
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

function PersonIcon() {
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
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c.8-3.2 3.2-5 6.5-5s5.7 1.8 6.5 5" />
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

function ShieldIcon() {
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
      <path d="M12 3.5 5.5 6v5.4c0 4.1 2.7 7.8 6.5 9.1 3.8-1.3 6.5-5 6.5-9.1V6L12 3.5z" />
    </svg>
  );
}

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SectionEyebrow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3
      className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
      style={{ color: "var(--fg-muted)" }}
    >
      <span className="inline-flex" aria-hidden="true">
        {icon}
      </span>
      {children}
    </h3>
  );
}

function othersInterestedSentence(interestCount: number) {
  const others = Math.max(0, interestCount - 1);
  if (others === 0) return "No others are interested in this name.";
  if (others === 1) return "1 other is interested in this name.";
  return `${others.toLocaleString()} others are interested in this name.`;
}

const inlineLinkClassName =
  "font-semibold no-underline transition-[filter] duration-200 hover:brightness-110";

function ZcashMeNameLink({ name }: { name: string }) {
  return (
    <a
      href={`https://zcash.me/${encodeURIComponent(name)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={inlineLinkClassName}
      style={{ color: "var(--color-accent-interactive)" }}
    >
      Zcash.me/{name}
    </a>
  );
}

function RequestAccessLink({
  href,
  onNavigate,
}: {
  href: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate();
      }}
      className={inlineLinkClassName}
      style={{ color: "var(--color-accent-interactive)" }}
    >
      request access
    </Link>
  );
}

function priorityClaimCopy({
  name,
  ensPriorityClaim,
  zmPriorityClaim,
  requestHref,
  onRequest,
}: {
  name: string;
  ensPriorityClaim: boolean;
  zmPriorityClaim: boolean;
  requestHref: string;
  onRequest: () => void;
}) {
  const zmLink = <ZcashMeNameLink name={name} />;
  const requestLink = <RequestAccessLink href={requestHref} onNavigate={onRequest} />;

  if (ensPriorityClaim && zmPriorityClaim) {
    return (
      <>
        This name is protected. If you control {name}.eth or {zmLink}, you can {requestLink}.
      </>
    );
  }
  if (ensPriorityClaim) {
    return (
      <>
        This name is protected. If you control {name}.eth, you can {requestLink}.
      </>
    );
  }
  return (
    <>
      This name is protected. If you control {zmLink}, you can {requestLink}.
    </>
  );
}

function buildProtectedRequestHref(row: PublicWaitlistViewRow) {
  const params = new URLSearchParams({ name: row.name });
  if (row.zmPriorityClaim) {
    params.set("contactKind", "other");
    params.set("contactValue", `https://zcash.me/${row.name}`);
  }
  return `/protected/request?${params.toString()}`;
}

function buildProtectedDetailsHref(name: string) {
  return `/protected?${new URLSearchParams({
    search: name,
    searchMode: "exact",
    details: "1",
  }).toString()}`;
}

function positionLabel(row: PublicWaitlistViewRow) {
  if (row.reserved) {
    return `Position for Name: ${row.rankPosition.toLocaleString()} of ${row.rankTotal.toLocaleString()}`;
  }
  return `Position for Name: N/A of ${row.interestCount.toLocaleString()}`;
}

const referralActionClassName =
  "grid min-h-11 w-full grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-2 rounded-2xl border border-border-muted bg-transparent px-3 py-2 text-sm font-semibold text-fg-heading transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]";
const sectionDividerStyle = {
  borderTop: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
} as const;

export default function WaitlistNameDetailsModal({
  row,
  isOpen,
  onClose,
  onProtect,
}: WaitlistNameDetailsModalProps) {
  const router = useAppRouter();

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

  const status = getStatusLabel(row);
  const referralCode = row.displayReferralCode?.trim() || null;
  const shareUrl = referralCode ? buildReferralUrl(referralCode) : null;
  const isPriorityClaim = row.ensPriorityClaim || row.zmPriorityClaim;
  const requestHref = buildProtectedRequestHref(row);

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
        aria-labelledby="waitlist-name-details-title"
        className="relative isolate w-full max-w-lg overflow-visible"
        style={{
          maxHeight: "calc(100dvh - 2rem)",
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
          <WaitlistHeaderIcon row={row} />
        </span>

        <div
          className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden rounded-2xl"
          style={{
            background: "var(--feature-card-bg)",
            border: "1px solid var(--faq-border)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 pt-12 sm:px-8 [scrollbar-gutter:stable]"
            onWheel={(event) => event.stopPropagation()}
          >
            <div
              className="mb-5 pb-5"
              style={{
                borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2
                      id="waitlist-name-details-title"
                      className="min-w-0 text-left text-xl font-bold leading-none"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      {row.name}
                    </h2>
                    <StatusBadge label={status} style={getStatusStyle(status)} />
                  </div>
                  {referralCode ? (
                    <p className="mt-2 font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
                      {referralCode}
                    </p>
                  ) : null}
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

            <section className="space-y-3">
              <SectionEyebrow icon={<PersonIcon />}>Summary</SectionEyebrow>
              <div className="space-y-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
                <p>
                  {row.name} was #{row.basePosition.toLocaleString()} to join the waitlist.
                </p>
                <p>{othersInterestedSentence(row.interestCount)}</p>
                {row.reserved ? (
                  <p>This name is reserved and ready to receive an Early Access code.</p>
                ) : isPriorityClaim ? (
                  <p>
                    {priorityClaimCopy({
                      name: row.name,
                      ensPriorityClaim: row.ensPriorityClaim,
                      zmPriorityClaim: row.zmPriorityClaim,
                      requestHref,
                      onRequest: () => {
                        onClose();
                        router.push(requestHref);
                      },
                    })}
                  </p>
                ) : (
                  <p>
                    To be positioned and eligible to receive an Early Access code and referral
                    rewards, {row.name} must{" "}
                    <Link
                      href="/reserve"
                      className={inlineLinkClassName}
                      style={{ color: "var(--color-accent-interactive)" }}
                    >
                      complete reservation
                    </Link>
                    .
                  </p>
                )}
              </div>
            </section>

            <section className="mt-6 space-y-3 pt-5" style={sectionDividerStyle}>
              <SectionEyebrow icon={<BarChartIcon />}>Referrals</SectionEyebrow>
              <div className="text-center">
                <p className="text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
                  {positionLabel(row)}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
                  {row.directReferrals.toLocaleString()} direct
                  <span aria-hidden="true">{"  •  "}</span>
                  {row.reservedReferrals.toLocaleString()} reserved
                  <span aria-hidden="true">{"  •  "}</span>
                  {row.indirectReferrals.toLocaleString()} indirect
                </p>
              </div>
              {row.leaderHref || shareUrl ? (
                <div className="flex items-stretch gap-2 pt-1">
                  {row.leaderHref ? (
                    <Link href={row.leaderHref} className={`min-w-0 flex-1 ${referralActionClassName}`}>
                      <BarChartIcon />
                      <span className="min-w-0 truncate text-center">View Dashboard</span>
                      <span aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {shareUrl ? (
                    <div className="min-w-0 flex-1">
                      <ShareDropdown
                        label="Share Reflink"
                        shareUrl={shareUrl}
                        message={`Join the Zcash Names waitlist with my referral link: ${shareUrl}`}
                        xMessage={`Join the Zcash Names waitlist with my referral link: ${shareUrl}`}
                        emailSubject="Join the Zcash Names waitlist"
                        buttonClassName={referralActionClassName}
                        menuAlign="left"
                        menuDirection="down"
                        portalMenu
                        menuStyle={{ zIndex: 10050 }}
                        renderTriggerContent={(open) => (
                          <>
                            <ShareTriggerIcon />
                            <span className="min-w-0 truncate text-center">Share Reflink</span>
                            <span
                              className={`inline-flex transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                            >
                              <ChevronDownIcon />
                            </span>
                          </>
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="mt-6 space-y-3 pt-5" style={sectionDividerStyle}>
              <SectionEyebrow icon={<ShieldIcon />}>Protection</SectionEyebrow>
              {row.protected ? (
                <p className="text-sm leading-7" style={{ color: "var(--fg-body)" }}>
                  <span className="font-semibold" style={{ color: "var(--fg-heading)" }}>
                    This name is protected.{" "}
                  </span>
                  <Link
                    href={buildProtectedDetailsHref(row.name)}
                    onClick={(event) => {
                      event.preventDefault();
                      const href = buildProtectedDetailsHref(row.name);
                      onClose();
                      router.push(href);
                    }}
                    className={inlineLinkClassName}
                    style={{ color: "var(--color-accent-interactive)" }}
                  >
                    View details
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm leading-7" style={{ color: "var(--fg-body)" }}>
                  Can this name be used for impersonation, fraud, or other misuse?{" "}
                  <Link
                    href={`/protected/suggest?${new URLSearchParams({ name: row.name }).toString()}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onProtect(row);
                    }}
                    className={inlineLinkClassName}
                    style={{ color: "var(--color-accent-interactive)" }}
                  >
                    Suggest protection
                  </Link>
                  .
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
