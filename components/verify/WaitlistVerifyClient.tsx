"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import {
  ActionDropdown,
  EmailIcon,
  ShareCopyIcon,
  TelegramIcon,
  XIcon,
} from "@/components/ShareDropdown";
import { useCopy } from "@/components/hooks/useCopy";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { QrBlock } from "@/components/ui/QrBlock";
import VerifyAmbientHeroSection from "@/components/verify/VerifyAmbientHeroSection";
import {
  CONTACT_KINDS,
  CONTACT_LABEL,
  CONTACT_PLACEHOLDER,
  type ContactKind,
} from "@/lib/types";
import {
  buildEmailShareHref,
  buildShareMessageWithLink,
  buildTelegramShareHref,
  buildXShareHref,
} from "@/lib/share";

type ProtectedRequestStatus = "not_submitted" | "submitted" | "approved" | "denied";

type ProtectedRequestRelationship =
  | "personal_or_public_name"
  | "represent_person"
  | "represent_organization"
  | "manage_brand_or_project"
  | "other";

type ProtectedContactMethod = {
  kind: ContactKind;
  value: string;
};

type DeleteRequestStatus = "none" | "pending";

type VerifyCard = {
  id: string;
  name: string | null;
  collapsed: boolean;
  reserved: boolean;
  protectedName: boolean;
  deleteRequestStatus: DeleteRequestStatus;
  deleteRequestId: string | null;
  deleteRequestRequestedAt: string | null;
  deleteRequestExpiresAt: string | null;
  protectedRequestStatus: ProtectedRequestStatus;
  protectedRequestId: string | null;
  protectedRequestReferenceNumber: string | null;
  protectedRequestSubmittedAt: string | null;
  protectedRequestPreferredContactKind: ContactKind | null;
  protectedRequestPreferredContactValue: string | null;
  protectedRequestContactMethods: ProtectedContactMethod[];
  protectedRequestRelationship: ProtectedRequestRelationship | null;
  protectedRequestSupportingLink: string | null;
  protectedRequestAdditionalContext: string | null;
  protectedRequestApprovedAt: string | null;
  protectedRequestDeniedAt: string | null;
  reservedAt: string | null;
  reservedTxid: string | null;
  totalForName: number;
  positionForName: number | null;
  waitlistLinePosition: number | null;
  totalReferrals: number;
  reservedReferrals: number;
  potentialRewards: number;
  referralCode: string | null;
  waitlistHref: string | null;
  memo: string | null;
  memoError: string | null;
};

type VerifyCardStatusUpdate = Pick<
  VerifyCard,
  "reserved" | "reservedAt" | "reservedTxid" | "totalForName" | "positionForName"
>;

type VerifyCardProtectedRequestUpdate = Pick<
  VerifyCard,
  | "protectedRequestStatus"
  | "protectedRequestId"
  | "protectedRequestReferenceNumber"
  | "protectedRequestSubmittedAt"
  | "protectedRequestPreferredContactKind"
  | "protectedRequestPreferredContactValue"
  | "protectedRequestContactMethods"
  | "protectedRequestRelationship"
  | "protectedRequestSupportingLink"
  | "protectedRequestAdditionalContext"
  | "protectedRequestApprovedAt"
  | "protectedRequestDeniedAt"
>;

type VerifyCardPreferenceUpdate = Partial<
  Pick<
    VerifyCard,
    "collapsed" | "deleteRequestStatus" | "deleteRequestId" | "deleteRequestRequestedAt" | "deleteRequestExpiresAt"
  >
>;

type WaitlistVerifyClientProps = {
  verifyToken: string;
  paymentAddress: string;
  baseAmountZec: string;
  cards: VerifyCard[];
  displayEmail: string;
  normalizedEmail: string;
  earlyAccessStartAt: string;
  earlyAccessLabel: string;
  shareDraftPosts: string[];
};

type SummaryCardKind = "reserved" | "referrals" | "position" | "rewards";

const STATUS_REFRESH_COOLDOWN_MS = 75_000;
const MINUTE_MS = 60_000;

const PROTECTED_RELATIONSHIP_LABEL: Record<ProtectedRequestRelationship, string> = {
  personal_or_public_name: "This is my personal or public name",
  represent_person: "I represent this person",
  represent_organization: "I represent this organization",
  manage_brand_or_project: "I manage this brand or project",
  other: "Other",
};

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

type StatusTone = "success" | "warning" | "danger";

function getStatusToneStyles(tone: StatusTone) {
  if (tone === "success") {
    return {
      badgeBackground: "var(--verify-badge-success-fill)",
      badgeColor: "var(--color-accent-green)",
      badgeBorder: "1px solid color-mix(in srgb, var(--color-accent-green) 38%, transparent)",
    };
  }

  if (tone === "danger") {
    return {
      badgeBackground: "var(--verify-badge-danger-fill)",
      badgeColor: "var(--accent-red, #e05252)",
      badgeBorder: "1px solid color-mix(in srgb, var(--accent-red, #e05252) 34%, transparent)",
    };
  }

  return {
    badgeBackground: "var(--verify-badge-warning-fill)",
    badgeColor: "var(--color-accent-interactive)",
    badgeBorder: "1px solid color-mix(in srgb, var(--color-accent-interactive) 34%, transparent)",
  };
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  const styles = getStatusToneStyles(tone);

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em]"
      style={{
        background: styles.badgeBackground,
        color: styles.badgeColor,
        border: styles.badgeBorder,
      }}
    >
      {label}
    </span>
  );
}

function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ZcashBadgeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8h6" />
      <path d="M9 16h6" />
      <path d="M15 8 9 16" />
      <path d="M12 6v2" />
      <path d="M12 16v2" />
    </svg>
  );
}

function DiscordIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.227-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function VerifyInfoModal({
  title,
  paragraphs,
  actions,
  customActions,
  onClose,
}: {
  title: string;
  paragraphs: string[];
  actions: Array<{
    label: string;
    href: string;
    external?: boolean;
    icon?: React.ReactNode;
  }>;
  customActions?: React.ReactNode;
  onClose: () => void;
}) {
  function getDisplayParagraph(paragraph: string): string {
    if (
      paragraph.includes("option to purchase this name during Early Access") &&
      paragraph.includes("Pricing to be announced.")
    ) {
      return "You’ll have the option to purchase this name during Early Access. Access code will be sent by email when available. Pricing to be announced.";
    }

    return paragraph;
  }

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[34rem] rounded-[2rem] border px-5 py-6 shadow-[0_28px_90px_rgba(22,35,66,0.22)] sm:px-7 sm:py-7"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-card) 97%, white 3%), color-mix(in srgb, var(--color-bg-elevated, transparent) 84%, white 16%))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
          aria-label="Close reserved name popup"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
        <div className="mx-auto max-w-md text-center">
          <p
            className="text-sm font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--color-accent-interactive)" }}
          >
            Reserved name
          </p>
          <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl" style={{ color: "var(--fg-heading)" }}>
            {title}
          </h3>
          <div className="mx-auto mt-4 max-w-md space-y-4 text-base leading-8 sm:text-[1.1rem]" style={{ color: "var(--fg-body)" }}>
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph}`}>{getDisplayParagraph(paragraph)}</p>
            ))}
          </div>
          {customActions || actions.length > 0 ? (
            <div className="mx-auto mt-8 grid max-w-sm gap-3">
              {customActions ?? <AccessCodeField />}
              <SummaryModalActionRow actions={actions} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function abbreviateTxid(txid: string | null | undefined): string | null {
  const trimmed = txid?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 16) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-8)}`;
}

function formatZecAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toFixed(8).replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
}

function roundZecAmount(value: number): number {
  return Math.round(value * 100_000_000) / 100_000_000;
}

const MAX_PENDING_RESERVATION_AMOUNT = 999.9999;
/** Optional support / donation step above the env reserve fee. */
const PENDING_RESERVATION_AMOUNT_STEP = 0.005;

function clampPendingZecAmount(value: number): number {
  return Math.min(MAX_PENDING_RESERVATION_AMOUNT, Math.max(0, value));
}

function roundPendingZecAmount(value: number): number {
  return Math.round(clampPendingZecAmount(value) * 10_000) / 10_000;
}

/**
 * Smallest 0.005-aligned amount strictly above the env base fee.
 * e.g. base 0.001 → 0.005, base 0.005 → 0.010, base 0.007 → 0.010.
 */
function firstSupportStepAboveBase(baseAmount: number): number {
  const base = roundPendingZecAmount(baseAmount);
  const step = PENDING_RESERVATION_AMOUNT_STEP;
  let candidate = roundPendingZecAmount(Math.ceil(base / step) * step);
  if (candidate <= base) {
    candidate = roundPendingZecAmount(candidate + step);
  }
  return candidate;
}

function formatPendingZecAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return roundPendingZecAmount(value)
    .toFixed(4)
    .replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
}

function parseZecAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? roundZecAmount(parsed) : 0;
}

function formatOrdinal(value: number): string {
  const absolute = Math.abs(Math.trunc(value));
  const mod100 = absolute % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;

  const mod10 = absolute % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

function buildCipherscanTxHref(txid: string | null | undefined): string | null {
  const trimmed = txid?.trim();
  return trimmed ? `https://cipherscan.app/tx/${encodeURIComponent(trimmed)}` : null;
}

function getCardSortPriority(card: VerifyCard): number {
  if (!card.reserved && !card.protectedName) return 0;
  if (card.protectedName && !card.reserved) return 1;
  return 2;
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <path d="M9.88 5.09A9.77 9.77 0 0 1 12 5c5 0 9 7 9 7a17.73 17.73 0 0 1-3.2 3.88" />
      <path d="M6.61 6.61C4.62 8.06 3 10 3 10s4 7 9 7a8.94 8.94 0 0 0 5.39-1.61" />
    </svg>
  );
}

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GearIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      enableBackground="new 0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="4" />
      <path d="M27.758,10.366l-1-1.732c-0.552-0.957-1.775-1.284-2.732-0.732L23.5,8.206C21.5,9.36,19,7.917,19,5.608V5c0-1.105-0.895-2-2-2h-2 c-1.105,0-2,0.895-2,2v0.608c0,2.309-2.5,3.753-4.5,2.598L7.974,7.902C7.017,7.35,5.794,7.677,5.242,8.634l-1,1.732 c-0.552,0.957-0.225,2.18,0.732,2.732L5.5,13.402c2,1.155,2,4.041,0,5.196l-0.526,0.304c-0.957,0.552-1.284,1.775-0.732,2.732 l1,1.732c0.552,0.957,1.775,1.284,2.732,0.732L8.5,23.794c2-1.155,4.5,0.289,4.5,2.598V27c0,1.105,0.895,2,2,2h2 c1.105,0,2-0.895,2-2v-0.608c0-2.309,2.5-3.753,4.5-2.598l0.526,0.304c0.957,0.552,2.18,0.225,2.732-0.732l1-1.732 c0.552-0.957,0.225-2.18-0.732-2.732L26.5,18.598c-2-1.155-2-4.041,0-5.196l0.526-0.304C27.983,12.546,28.311,11.323,27.758,10.366z" />
    </svg>
  );
}

function EllipsisIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function getCardDeleteWarning(card: VerifyCard): string {
  const name = card.name?.trim() || "this name";

  if (card.reserved) {
    return `This will remove ${name} from your active reservation dashboard. It will not reverse any on-chain payment or refund any reservation fee.`;
  }

  if (card.protectedName) {
    return `This will remove ${name} and any active protected-name access request tied to this waitlist entry.`;
  }

  return `Removing ${name} will discard its position for Early Access.`;
}

function VerifyCardActionMenu({
  collapsed,
  deletePending,
  onViewDetails,
  onToggleCollapsed,
  onDelete,
}: {
  collapsed: boolean;
  deletePending: boolean;
  onViewDetails: () => void;
  onToggleCollapsed: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function handleAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="w-auto shrink-0">
      <ActionDropdown
        open={open}
        onOpenChange={setOpen}
        portalMenu
        items={[
          {
            key: "details",
            label: "View details",
            icon: <InfoIcon />,
            onClick: () => handleAction(onViewDetails),
          },
          {
            key: "toggle",
            label: collapsed ? "Show card" : "Hide card",
            icon: collapsed ? <EyeIcon /> : <EyeOffIcon />,
            onClick: () => handleAction(onToggleCollapsed),
          },
          {
            key: "delete",
            label: deletePending ? "Deletion confirmation sent" : "Delete name",
            icon: <TrashIcon />,
            onClick: deletePending ? undefined : () => handleAction(onDelete),
          },
        ]}
        label="Card actions"
        menuAlign="right"
        menuDirection="down"
        showTriggerIcon={false}
        triggerAriaLabel="Card actions"
        buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2"
        renderTriggerContent={() => (
          <span style={{ color: "var(--fg-muted)" }}>
            <EllipsisIcon />
          </span>
        )}
      />
    </div>
  );
}

function buildReferralDashboardHref(referralCode: string | null | undefined): string | null {
  const trimmed = referralCode?.trim();
  return trimmed ? `/leaders/ref/${encodeURIComponent(trimmed)}` : null;
}

function buildShareKitHref(referralCode: string | null | undefined): string | null {
  const trimmed = referralCode?.trim();
  return trimmed
    ? `https://www.zcashnames.com/sharekit?ref=${encodeURIComponent(trimmed)}`
    : null;
}

function pickRandomShareDraftPost(posts: string[]): string {
  const normalized = posts.map((post) => post.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return "Join me on the Zcash Names waitlist. [your link]";
  }

  const index = Math.floor(Math.random() * normalized.length);
  return normalized[index] ?? normalized[0];
}

function buildShareKitPostMessage(posts: string[], shareUrl: string): string {
  const draft = pickRandomShareDraftPost(posts);
  const replaced = draft.replaceAll("[your link]", shareUrl).trim();
  return replaced.includes(shareUrl) ? replaced : buildShareMessageWithLink(replaced, shareUrl);
}

function ExternalArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function DashboardIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 13h6v8H3z" />
      <path d="M15 3h6v18h-6z" />
      <path d="M9 8h6v13H9z" />
    </svg>
  );
}

function ChainLinkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.43" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07l1.41-1.41" />
    </svg>
  );
}

function DocumentIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h1" />
    </svg>
  );
}

function formatCountdownBadge(targetDate: string, now: number): string {
  const targetMs = new Date(targetDate).getTime();
  if (!Number.isFinite(targetMs)) return "0d 00h 00m 00s remaining";

  const diffMs = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s remaining`;
}

function useCountdownBadge(targetDate: string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return formatCountdownBadge(targetDate, now);
}

function formatCompactDeadlineLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function VerifyEarlyAccessNotice({
  earlyAccessStartAt,
  hideOnWide = true,
}: {
  earlyAccessStartAt: string;
  hideOnWide?: boolean;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const compactDateLabel = formatCompactDeadlineLabel(earlyAccessStartAt);
  const targetMs = new Date(earlyAccessStartAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  const showOnPath =
    pathname === "/reserve" ||
    pathname === "/faq" ||
    pathname === "/waitlist/view";

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const remainingDays = Math.max(0, Math.floor(Math.max(0, targetMs - now) / 86_400_000));

  if (!visible || !showOnPath) {
    return null;
  }

  return (
    <div
      className={`grid w-full min-w-0 overflow-hidden grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 px-3 py-1.5 text-[0.72rem] font-semibold sm:text-sm ${hideOnWide ? "" : ""}`}
      style={{
        background: "var(--announce-bar-bg)",
        color: "var(--announce-bar-fg)",
      }}
    >
      <span className="h-6 w-6" aria-hidden="true" />
      <Link
        href="/reserve"
        className="col-start-2 flex min-w-0 items-center justify-center gap-2 overflow-hidden text-center transition-opacity hover:opacity-90"
      >
        <span
          className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider sm:text-[0.65rem]"
          style={{
            background: "var(--announce-bar-pill-bg)",
            color: "var(--announce-bar-pill-fg)",
          }}
        >
          {remainingDays} {remainingDays === 1 ? "day" : "days"}
        </span>
        <span className="truncate">Early Access begins {compactDateLabel}. &#8594;</span>
      </Link>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="site-announcement-dismiss justify-self-end text-base sm:text-lg"
        aria-label="Dismiss early access banner"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}

export function VerifyEarlyAccessCounter({
  earlyAccessStartAt,
}: {
  earlyAccessStartAt: string;
}) {
  const countdown = useDetailedCountdown(earlyAccessStartAt);

  return (
    <div
      className="inline-flex items-center justify-center gap-2 text-center text-base font-bold"
      style={{ color: "var(--color-accent-interactive)" }}
    >
      <ClockIcon className="h-4 w-4 shrink-0" />
      <span>
        {String(countdown.days).padStart(2, "0")}d {countdown.hours}h {countdown.minutes}m{" "}
        {countdown.seconds}s
      </span>
    </div>
  );
}

function useDetailedCountdown(targetDate: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const targetMs = new Date(targetDate).getTime();
  const diffMs = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function formatReservedDate(value: string | null): string {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatReservedTime(value: string | null): string {
  if (!value) return "Awaiting payment";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatStatusCheckTimestamp(value: string | null): string {
  if (!value) return "No successful status check yet.";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatCooldownCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pluralizeNames(count: number): string {
  return count === 1 ? "name" : "names";
}

const PROTECTED_RELATIONSHIP_OPTIONS: Array<{
  value: ProtectedRequestRelationship;
  label: string;
}> = [
  { value: "personal_or_public_name", label: "This is my personal or public name" },
  { value: "represent_person", label: "I represent this person" },
  { value: "represent_organization", label: "I represent this organization" },
  { value: "manage_brand_or_project", label: "I manage this brand or project" },
  { value: "other", label: "Other" },
];

type ProtectedContactRow = {
  uid: string;
  kind: ContactKind;
  value: string;
};

function buildProtectedContactUid() {
  return `pc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextUnusedProtectedContactKind(rows: ProtectedContactRow[]): ContactKind | null {
  return CONTACT_KINDS.find((kind) => !rows.some((row) => row.kind === kind)) ?? null;
}

function relationshipLabel(value: ProtectedRequestRelationship | null): string {
  return (
    PROTECTED_RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.label ??
    "Not provided"
  );
}

function formatProtectedRequestTimestamp(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function positionDisplay(card: VerifyCard): string {
  if (!card.reserved || !card.positionForName) {
    return "N/A";
  }

  return `${card.positionForName} of ${card.totalForName}`;
}

function PerforatedDivider() {
  return (
    <>
      <div className="flex items-center py-2 lg:hidden">
        <span
          aria-hidden="true"
          className="h-px flex-1 opacity-100"
          style={{
            background:
              "repeating-linear-gradient(to right, color-mix(in srgb, var(--faq-border) 96%, transparent) 0 10px, transparent 10px 16px)",
          }}
        />
      </div>
      <div className="hidden h-full items-center justify-center py-8 lg:flex">
        <div className="flex h-full flex-col items-center">
          <span
            aria-hidden="true"
            className="w-px flex-1 opacity-100"
            style={{
              background:
                "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--faq-border) 96%, transparent) 0 10px, transparent 10px 16px)",
            }}
          />
        </div>
      </div>
    </>
  );
}

function VerifyHeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[1.02/0.9] w-full max-w-[34rem] overflow-hidden rounded-[34px]">
      <div
        className="absolute inset-0 rounded-[34px]"
        style={{
          background:
            "radial-gradient(circle at 24% 22%, color-mix(in srgb, var(--color-accent-interactive) 18%, transparent) 0, transparent 35%), radial-gradient(circle at 78% 28%, color-mix(in srgb, var(--color-brand-blue) 18%, transparent) 0, transparent 34%), linear-gradient(145deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 92%, white 8%) 0%, color-mix(in srgb, var(--color-card) 90%, transparent) 100%)",
          border: "1px solid color-mix(in srgb, var(--faq-border) 82%, transparent)",
          boxShadow: "0 32px 80px rgba(29, 43, 82, 0.14)",
        }}
      />
      <div
        className="absolute -left-10 top-14 h-32 w-32 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--color-accent-interactive) 34%, transparent)" }}
      />
      <div
        className="absolute right-6 top-6 h-36 w-36 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--color-brand-blue) 24%, transparent)" }}
      />
      <div
        className="absolute bottom-10 left-1/2 h-40 w-[72%] -translate-x-1/2 rounded-[28px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, white 78%, transparent) 0%, color-mix(in srgb, var(--color-bg-elevated, transparent) 82%, transparent) 100%)",
          border: "1px solid color-mix(in srgb, var(--faq-border) 72%, white 12%)",
          boxShadow: "0 20px 46px rgba(63, 92, 168, 0.14)",
        }}
      />
      <div
        className="absolute bottom-[4.15rem] left-1/2 h-28 w-[58%] -translate-x-1/2 rounded-[24px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, white 80%, transparent) 0%, color-mix(in srgb, var(--color-card) 82%, transparent) 100%)",
          border: "1px solid color-mix(in srgb, var(--faq-border) 68%, white 10%)",
        }}
      />
      <div
        className="absolute bottom-[7.75rem] left-1/2 flex h-44 w-36 -translate-x-1/2 items-center justify-center rounded-[30px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, white 70%, transparent) 0%, color-mix(in srgb, var(--color-brand-blue) 18%, white 62%) 100%)",
          border: "1px solid color-mix(in srgb, white 72%, var(--faq-border) 28%)",
          boxShadow:
            "0 28px 50px color-mix(in srgb, var(--color-brand-blue) 14%, transparent), 0 0 72px color-mix(in srgb, var(--color-accent-interactive) 18%, transparent)",
          transform: "perspective(900px) rotateX(12deg) rotateY(-18deg)",
        }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.74) 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85), 0 10px 24px rgba(63,92,168,0.16)",
          }}
        >
          <span
            className="text-4xl font-black"
            style={{ color: "var(--color-accent-interactive)", lineHeight: 1 }}
          >
            Z
          </span>
        </div>
      </div>
      <div
        className="absolute inset-x-8 bottom-8 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--faq-border) 70%, transparent) 18%, color-mix(in srgb, var(--faq-border) 84%, transparent) 50%, color-mix(in srgb, var(--faq-border) 70%, transparent) 82%, transparent 100%)",
        }}
      />
    </div>
  );
}

function HeroCountdownCard({
  earlyAccessLabel,
  earlyAccessStartAt,
  mobile = false,
}: {
  earlyAccessLabel: string;
  earlyAccessStartAt: string;
  mobile?: boolean;
}) {
  const { days, hours, minutes, seconds } = useDetailedCountdown(earlyAccessStartAt);
  const compactDateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(earlyAccessStartAt));

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(22,35,66,0.08)] ${
        mobile ? "px-5 py-5" : "px-6 py-5"
      }`}
      style={{
        borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
        background: mobile
          ? "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 68%, transparent), color-mix(in srgb, var(--color-card) 96%, transparent))"
          : "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 75%, transparent), color-mix(in srgb, var(--color-card) 96%, transparent))",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent-interactive) 16%, transparent) 0%, transparent 72%)",
        }}
      />
        <p className={`text-sm ${mobile ? "text-center" : "text-center"}`} style={{ color: "var(--fg-body)" }}>
          Early Access begins
        </p>
        <div className="mt-0.5 text-center">
          <p
            className={`${mobile ? "text-[1.35rem]" : "text-[1.65rem]"} font-bold tracking-tight`}
            style={{ color: "var(--fg-heading)" }}
          >
            {compactDateLabel}
          </p>
        </div>

      <div
        className={`mt-4 ${
          mobile
            ? "grid grid-cols-4"
            : "relative grid grid-cols-2 gap-x-6 gap-y-0 text-center"
        }`}
      >
        {!mobile ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
              style={{
                background: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--faq-border) 84%, transparent) 12%, color-mix(in srgb, var(--faq-border) 84%, transparent) 88%, transparent 100%)",
              }}
            />
          </>
        ) : null}
        {[
          { label: "Days", value: days },
          { label: "Hrs", value: hours },
          { label: "Mins", value: minutes },
          { label: "Secs", value: seconds },
        ].map((item, index) => (
          <div
            key={item.label}
            className={mobile ? "text-center" : "py-4"}
            style={
              mobile && index > 0
                ? {
                    borderLeft: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                  }
                : undefined
            }
          >
          <div
              className="text-[2.65rem] font-black tracking-[-0.05em]"
              style={{ color: "var(--color-accent-interactive)" }}
            >
              {item.value}
            </div>
            <div
              className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--fg-muted)" }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      </div>
    );
  }

export function HeroHowReservationsWork() {
  const [firstStepTitleStruck, setFirstStepTitleStruck] = useState(false);
  const [firstStepBodyStruck, setFirstStepBodyStruck] = useState(false);
  const [firstStepChecked, setFirstStepChecked] = useState(false);
  const animationTimersRef = useState<number[]>([])[0];

  function clearAnimationTimers() {
    for (const timer of animationTimersRef) {
      window.clearTimeout(timer);
    }
    animationTimersRef.length = 0;
  }

  function playFirstStepAnimation() {
    clearAnimationTimers();
    setFirstStepTitleStruck(false);
    setFirstStepBodyStruck(false);
    setFirstStepChecked(false);

    animationTimersRef.push(
      window.setTimeout(() => setFirstStepTitleStruck(true), 220),
    );
    animationTimersRef.push(
      window.setTimeout(() => setFirstStepBodyStruck(true), 760),
    );
    animationTimersRef.push(
      window.setTimeout(() => setFirstStepChecked(true), 1360),
    );
  }

  function resetFirstStepAnimation() {
    clearAnimationTimers();
    setFirstStepTitleStruck(false);
    setFirstStepBodyStruck(false);
    setFirstStepChecked(false);
  }

  useEffect(() => {
    playFirstStepAnimation();
    return () => {
      clearAnimationTimers();
    };
  }, []);

  const steps = [
    {
      title: "Join the waitlist",
      body: "Find your name and join for free.",
    },
    {
      title: "Complete your reservation",
      body: "Pay a small fee to secure your position.",
    },
    {
      title: "Buy your name",
      body: "When Early Access begins, you receive a code to purchase your name.",
    },
  ];

  return (
    <div className="relative mx-auto mt-8 max-w-[34rem] text-left lg:mx-0">
      {steps.map((item, index) => (
        <div
          key={item.title}
          className={`${index === 0 ? "" : "mt-4"} flex items-start gap-4`}
          onMouseEnter={index === 0 ? resetFirstStepAnimation : undefined}
          onMouseLeave={index === 0 ? playFirstStepAnimation : undefined}
        >
          <span
            className="relative z-[1] inline-flex h-8 w-8 shrink-0 rounded-full text-sm font-bold"
            style={{
              background: "var(--color-accent-interactive-soft)",
              color: "var(--color-accent-interactive)",
              perspective: "800px",
            }}
          >
            <span
              className="relative block h-8 w-8"
              style={{
                transformStyle: "preserve-3d",
                transition: index === 0 ? "transform 720ms cubic-bezier(0.2, 0.8, 0.2, 1)" : undefined,
                transform: index === 0 && firstStepChecked ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <span
                className="absolute inset-0 flex items-center justify-center rounded-full"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                {index + 1}
              </span>
              <span
                className="absolute inset-0 flex items-center justify-center rounded-full"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <CheckIcon className="h-4 w-4" />
              </span>
            </span>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold" style={{ color: "var(--fg-heading)" }}>
              {index === 0 ? (
                <span className="relative inline-block">
                  <span>{item.title}</span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                    style={{
                      width: "100%",
                      background: "currentColor",
                      transformOrigin: "left center",
                      transition: "transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                      transform: firstStepTitleStruck ? "scaleX(1)" : "scaleX(0)",
                    }}
                  />
                </span>
              ) : (
                item.title
              )}
            </h2>
            <p className="mt-1 text-base leading-7" style={{ color: "var(--fg-body)" }}>
              {index === 0 ? (
                <span className="relative inline-block">
                  <span>{item.body}</span>
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                    style={{
                      width: "100%",
                      background: "currentColor",
                      transformOrigin: "left center",
                      transition: "transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                      transform: firstStepBodyStruck ? "scaleX(1)" : "scaleX(0)",
                    }}
                  />
                </span>
              ) : (
                item.body
              )}
            </p>
          </div>
          {index < steps.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute left-4 top-8 h-8 w-px -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--faq-border) 84%, transparent) 0%, color-mix(in srgb, var(--faq-border) 84%, transparent) 100%)",
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SummaryStrip({
  totalCount,
  pendingCount,
  reservedCount,
  protectedCount,
  displayEmail,
  activeFilter,
  onFilterChange,
  onAddMoreNames,
}: {
  totalCount: number;
  pendingCount: number;
  reservedCount: number;
  protectedCount: number;
  displayEmail: string;
  activeFilter: "all" | "pending" | "reserved" | "protected";
  onFilterChange: (filter: "all" | "pending" | "reserved" | "protected") => void;
  onAddMoreNames: () => void;
}) {
  let body = `You have ${totalCount} ${pluralizeNames(totalCount)} on the waitlist.`;

  if (protectedCount > 0) {
    const needsReservationCount = pendingCount;
    if (needsReservationCount > 0) {
      body += ` ${needsReservationCount} ${needsReservationCount === 1 ? "name has" : "names have"} not been reserved and ${protectedCount} ${protectedCount === 1 ? "name is" : "names are"} protected.`;
    } else {
      body += ` ${protectedCount === 1 ? "One linked name is" : `${protectedCount} linked names are`} protected.`;
    }
  } else if (pendingCount === 0) {
    body += " All linked names are reserved.";
  } else if (pendingCount === 1) {
    body += " One name has not been reserved.";
  } else {
    body += ` ${pendingCount} names have not been reserved.`;
  }

  return (
    <section className="rounded-[30px] px-5 py-5 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-3 text-left">
            <MailIcon className="h-5 w-5 shrink-0 self-center" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
                {displayEmail}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
            {body}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {[
            {
              key: "all" as const,
              label: `All (${totalCount})`,
              borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
            },
            {
              key: "pending" as const,
              label: `Pending (${pendingCount})`,
              borderColor: "color-mix(in srgb, var(--color-accent-interactive) 32%, var(--faq-border))",
            },
            {
              key: "protected" as const,
              label: `Protected (${protectedCount})`,
              borderColor: "color-mix(in srgb, var(--accent-red, #e05252) 38%, var(--faq-border))",
            },
            {
              key: "reserved" as const,
              label: `Reserved (${reservedCount})`,
              borderColor: "color-mix(in srgb, var(--color-accent-green) 44%, var(--faq-border))",
            },
          ].map((option) => {
            const active = activeFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onFilterChange(option.key)}
                className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{
                  background: active ? "var(--home-result-primary-bg)" : "transparent",
                  color: active ? "var(--home-result-primary-fg)" : "var(--fg-body)",
                  border: `1.5px solid ${option.borderColor}`,
                  boxShadow: active ? "var(--home-result-primary-shadow)" : "none",
                }}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onAddMoreNames}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85"
            style={{
              background: "transparent",
              color: "var(--fg-body)",
              border: "1.5px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
              boxShadow: "none",
            }}
            aria-label="Add more names"
            title="Add more names"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ReservationMetaBox({
  label,
  primary,
  secondary,
  href,
  external = false,
  onClick,
}: {
  label: string;
  primary: string;
  secondary?: string | null;
  href?: string | null;
  external?: boolean;
  onClick?: (() => void) | null;
}) {
  const content = (
    <div
      className="relative min-w-0 rounded-[18px] border px-4 py-2.5 text-center transition hover:opacity-85"
      style={{
        borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
        background: "transparent",
      }}
    >
      {href || onClick ? (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3"
          style={{ color: "var(--fg-muted)" }}
        >
          {onClick ? (
            <InfoIcon />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M7 17 17 7" />
              <path d="M9 7h8v8" />
            </svg>
          )}
        </span>
      ) : null}
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
        {primary}
      </p>
      {secondary ? (
        <p className="mt-1 text-sm" style={{ color: "var(--fg-body)" }}>
          {secondary}
        </p>
      ) : null}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block cursor-pointer text-left">
        {content}
      </button>
    );
  }
  if (!href) return content;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function ExactAmountCallout({
  variant,
}: {
  variant: "payment" | "sent";
}) {
  return (
    <div
      className="rounded-[22px] border px-4 py-4 text-left sm:px-5"
      style={{
        borderColor: "color-mix(in srgb, var(--color-brand-blue) 18%, var(--faq-border))",
        background: "var(--verify-accent-panel-fill)",
      }}
    >
      {variant === "payment" ? (
        <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
          Don&apos;t change the address or memo. Send at least the minimum amount. Donations are welcome.
        </p>
      ) : (
        <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
          Your reservation will appear after the transaction has been mined. Refresh status to check again.
        </p>
      )}
    </div>
  );
}

function SummaryModalActionRow({
  actions,
}: {
  actions: Array<{
    label: string;
    href: string;
    external?: boolean;
    icon?: React.ReactNode;
  }>;
}) {
  if (actions.length === 0) {
    return null;
  }

  const actionButtonClassName =
    "flex h-16 w-full items-center justify-between rounded-[1.15rem] border px-4 py-4 text-left transition hover:opacity-85";
  const actionButtonStyle = {
    borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
    background: "var(--verify-panel-soft-fill)",
    color: "var(--fg-heading)",
  } satisfies React.CSSProperties;

  return (
    <div className="mx-auto grid w-full max-w-sm gap-3">
      {actions.map((action) => {
        const content = (
          <>
            <span className="flex min-w-0 items-center gap-3">
              {action.icon ? <span style={{ color: "var(--fg-muted)" }}>{action.icon}</span> : null}
              <span className="text-base font-semibold sm:text-lg">{action.label}</span>
            </span>
            <span style={{ color: "var(--fg-muted)" }}>
              <ExternalArrowIcon />
            </span>
          </>
        );

        return action.external ? (
          <a
            key={action.label}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className={actionButtonClassName}
            style={actionButtonStyle}
          >
            {content}
          </a>
        ) : (
          <Link
            key={action.label}
            href={action.href}
            className={actionButtonClassName}
            style={actionButtonStyle}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

function SummaryDetailModal({
  eyebrow,
  title,
  paragraphs,
  actions,
  customActions,
  footer,
  onClose,
}: {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  actions: Array<{
    label: string;
    href: string;
    external?: boolean;
    icon?: React.ReactNode;
  }>;
  customActions?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[34rem] rounded-[2rem] border px-5 py-6 shadow-[0_28px_90px_rgba(22,35,66,0.22)] sm:px-7 sm:py-7"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-card) 97%, white 3%), color-mix(in srgb, var(--color-bg-elevated, transparent) 84%, white 16%))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
          aria-label="Close summary popup"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>

        <div className="mx-auto max-w-md text-center">
          <div className="mt-2">
            <p
              className="text-sm font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--color-accent-interactive)" }}
            >
              {eyebrow}
            </p>
            <h3
              className="mt-2 text-balance text-3xl font-black tracking-[-0.05em] sm:text-4xl"
              style={{ color: "var(--fg-heading)" }}
            >
              {title}
            </h3>
          </div>

          <div className="mx-auto mt-4 max-w-md space-y-4 text-base leading-8 sm:text-[1.1rem]" style={{ color: "var(--fg-body)" }}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {customActions || actions.length > 0 ? (
            <div className="mx-auto mt-8 grid max-w-sm gap-3">
              {customActions}
              <SummaryModalActionRow actions={actions} />
            </div>
          ) : null}
        </div>

        {footer ? (
          <div
            className="mx-auto mt-8 max-w-2xl border-t pt-5 text-center"
            style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeleteNameModal({
  card,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  card: VerifyCard;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[34rem] rounded-[2rem] border px-5 py-6 shadow-[0_28px_90px_rgba(22,35,66,0.22)] sm:px-7 sm:py-7"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-card) 97%, white 3%), color-mix(in srgb, var(--color-bg-elevated, transparent) 84%, white 16%))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
          aria-label="Close delete confirmation"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>

        <div className="mx-auto max-w-md text-center">
          <p
            className="text-sm font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--accent-red, #e05252)" }}
          >
            Delete name
          </p>
          <h3
            className="mt-2 text-balance text-3xl font-black tracking-[-0.05em] sm:text-4xl"
            style={{ color: "var(--fg-heading)" }}
          >
            {card.name?.trim() || "This name"}
          </h3>
          <div
            className="mx-auto mt-4 max-w-md space-y-4 text-base leading-8 sm:text-[1.1rem]"
            style={{ color: "var(--fg-body)" }}
          >
            <p>
              We&apos;ll email a confirmation link before removing this name from our waitlist.
            </p>
            <p>{getCardDeleteWarning(card)}</p>
          </div>

          {errorMessage ? (
            <p className="mt-4 text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
              {errorMessage}
            </p>
          ) : null}

          <div className="mx-auto mt-8 grid w-full max-w-sm gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.15rem] border px-4 py-4 text-left text-base font-semibold transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
                background: "var(--verify-panel-soft-fill)",
                color: "var(--fg-heading)",
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>
                <MailIcon />
              </span>
              <span>
                {isSubmitting ? <AnimatedLoadingLabel label="Sending confirmation" active /> : "Send confirmation email"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteSuccessModal({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[32rem] rounded-[2rem] border px-5 py-6 text-center shadow-[0_28px_90px_rgba(22,35,66,0.22)] sm:px-7 sm:py-7"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-card) 97%, white 3%), color-mix(in srgb, var(--color-bg-elevated, transparent) 84%, white 16%))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
          aria-label="Close removal confirmation"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
        <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--color-accent-interactive)" }}>
          Name removed
        </p>
        <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl" style={{ color: "var(--fg-heading)" }}>
          {name}
        </h3>
        <p className="mx-auto mt-4 max-w-md text-base leading-8 sm:text-[1.05rem]" style={{ color: "var(--fg-body)" }}>
          This has been removed from the waitlist and your reservation page.
        </p>
      </div>
    </div>
  );
}

function ReservationCelebrationModal({
  name,
  shareHref,
  reducedMotion,
  onClose,
}: {
  name: string;
  shareHref: string;
  reducedMotion: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const confettiPieces = [
    { left: "10%", top: "20%", delay: "0ms", color: "var(--color-accent-interactive)" },
    { left: "23%", top: "10%", delay: "80ms", color: "var(--color-accent-green)" },
    { left: "36%", top: "24%", delay: "140ms", color: "var(--hero-headline-primary)" },
    { left: "52%", top: "12%", delay: "30ms", color: "var(--color-accent-interactive)" },
    { left: "67%", top: "18%", delay: "170ms", color: "var(--color-accent-green)" },
    { left: "80%", top: "8%", delay: "110ms", color: "var(--hero-headline-primary)" },
  ];

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-[34rem] overflow-hidden rounded-[2rem] border px-5 py-6 text-center shadow-[0_28px_90px_rgba(22,35,66,0.22)] sm:px-7 sm:py-7 ${reducedMotion ? "" : "motion-safe:animate-[verify-success-pop_340ms_cubic-bezier(0.2,0.9,0.25,1.15)]"}`}
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-card) 97%, white 3%), color-mix(in srgb, var(--color-bg-elevated, transparent) 84%, white 16%))",
          transformOrigin: "center center",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {!reducedMotion ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {confettiPieces.map((piece, index) => (
              <span
                key={`${piece.left}-${index}`}
                className="absolute block rounded-full motion-safe:animate-[verify-confetti-float_1250ms_ease-out_forwards]"
                style={{
                  left: piece.left,
                  top: piece.top,
                  width: index % 2 === 0 ? "12px" : "18px",
                  height: index % 2 === 0 ? "12px" : "18px",
                  background: piece.color,
                  opacity: 0.9,
                  animationDelay: piece.delay,
                }}
              />
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
          aria-label="Close reservation success"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
        <p className="text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--color-accent-green)" }}>
          Congratulations!
        </p>
        <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl" style={{ color: "var(--fg-heading)" }}>
          You reserved {name}.
        </h3>
        <p className="mx-auto mt-4 max-w-md text-base leading-8 sm:text-[1.05rem]" style={{ color: "var(--fg-body)" }}>
          We&apos;ll email you with more instructions as Early Access approaches.
        </p>
        <div className="mx-auto mt-8 grid w-full max-w-sm gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-14 w-full items-center justify-center rounded-[1.15rem] border px-4 py-4 text-base font-semibold transition hover:opacity-85"
            style={{
              borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
              background: "var(--verify-panel-soft-fill)",
              color: "var(--fg-heading)",
            }}
          >
            Close
          </button>
          <a
            href={shareHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.15rem] border px-4 py-4 text-base font-semibold transition hover:opacity-85"
            style={{
              borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
              background: "transparent",
              color: "var(--fg-heading)",
            }}
          >
            <span style={{ color: "var(--fg-muted)" }}>
              <XIcon />
            </span>
            <span>Post on X</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function RenderSummaryModal({
  activeSummary,
  shareDraftPosts,
  onClose,
}: {
  activeSummary: {
    kind: SummaryCardKind;
    card: VerifyCard;
  };
  shareDraftPosts: string[];
  onClose: () => void;
}) {
  const { kind, card } = activeSummary;
  const name = card.name?.trim() || "This name";
  const txHref = buildCipherscanTxHref(card.reservedTxid);
  const dashboardHref = buildReferralDashboardHref(card.referralCode);
  const shareKitHref = buildShareKitHref(card.referralCode);
  const shareUrl = card.referralCode?.trim()
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.zcashnames.com"}/?ref=${encodeURIComponent(card.referralCode.trim())}`
    : null;
  const summaryActionButtonClassName =
    "flex h-16 w-full items-center justify-between rounded-[1.15rem] border px-4 py-4 text-left transition hover:opacity-85";
  const summaryActionButtonStyle = {
    borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
    background: "var(--verify-panel-soft-fill)",
    color: "var(--fg-heading)",
  } satisfies React.CSSProperties;
  const shareReferralAction = shareUrl ? (
    <div className="mx-auto grid w-full max-w-sm gap-3">
      <div className="w-full">
        <ActionDropdown
          label="Referral Link"
          menuAlign="left"
          menuDirection="down"
          showTriggerIcon={false}
          items={[
            {
              key: "copy",
              label: "Copy Link",
              icon: <ShareCopyIcon />,
              onClick: () => {
                if (!shareUrl) return;
                void navigator.clipboard.writeText(shareUrl);
              },
            },
            {
              key: "email",
              label: "Email",
              icon: <EmailIcon />,
              onClick: () => {
                if (!shareUrl) return;
                const message = buildShareKitPostMessage(shareDraftPosts, shareUrl);
                window.location.href = buildEmailShareHref("Zcash Names", message);
              },
            },
            {
              key: "telegram",
              label: "Telegram",
              icon: <TelegramIcon />,
              onClick: () => {
                if (!shareUrl) return;
                const message = buildShareKitPostMessage(shareDraftPosts, shareUrl);
                window.open(buildTelegramShareHref(message), "_blank", "noopener,noreferrer");
              },
            },
            {
              key: "x",
              label: "X",
              icon: <XIcon />,
              onClick: () => {
                if (!shareUrl) return;
                const message = buildShareKitPostMessage(shareDraftPosts, shareUrl);
                window.open(buildXShareHref(message), "_blank", "noopener,noreferrer");
              },
            },
            ...(shareKitHref
              ? [
                  {
                    key: "suggested-posts",
                    label: "Suggested posts",
                    icon: <DocumentIcon className="h-4 w-4" />,
                    href: shareKitHref,
                    external: true,
                  },
                ]
              : []),
            {
              key: "system",
              label: "More ways",
              icon: <EllipsisIcon className="h-4 w-4" />,
              onClick: async () => {
                if (!shareUrl) return;
                const message = buildShareKitPostMessage(shareDraftPosts, shareUrl);
                if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                  try {
                    await navigator.share({ text: message });
                    return;
                  } catch {
                    return;
                  }
                }
                await navigator.clipboard.writeText(shareUrl);
              },
            },
          ]}
          buttonClassName="flex w-full items-stretch bg-transparent p-0 text-left"
          menuClassName="w-full rounded-[1.15rem] border border-[color:var(--faq-border)] bg-[color:var(--verify-menu-fill)] p-2 shadow-[0_18px_40px_rgba(22,35,66,0.14)]"
          itemClassName="rounded-[1.15rem] px-4 py-4 text-base font-semibold"
          renderTriggerContent={(open) => (
            <div
              className={summaryActionButtonClassName}
              style={summaryActionButtonStyle}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span style={{ color: "var(--fg-muted)" }}>
                  <ChainLinkIcon className="h-4 w-4" />
                </span>
                <span className="text-base font-semibold sm:text-lg">Referral Link</span>
              </span>
              <span
                style={{
                  color: "var(--fg-muted)",
                  transform: open ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                <ExternalArrowIcon />
              </span>
            </div>
          )}
        />
      </div>
    </div>
  ) : null;

  if (kind === "reserved") {
    return (
      <SummaryDetailModal
        eyebrow="Reserved"
        title={name}
        paragraphs={
          card.reserved && card.reservedAt
            ? [`You'll have the option to purchase ${name} during Early Access. Access code will be sent by email when available. Pricing to be announced.`]
            : ["This name has not been reserved yet. Complete payment to secure your place for Early Access."]
        }
        actions={txHref ? [{ label: "View on-chain transaction", href: txHref, external: true, icon: <ChainLinkIcon className="h-4 w-4" /> }] : []}
        onClose={onClose}
      />
    );
  }

  if (kind === "referrals") {
    const hasReferrals = card.totalReferrals > 0;
    return (
      <SummaryDetailModal
        eyebrow="Referrals"
        title={name}
        paragraphs={
          hasReferrals
            ? [
                `You referred ${card.totalReferrals} people to the waitlist. ${card.reservedReferrals} have reserved their place.`,
              ]
            : ["You have not referred anyone yet. Share your link to improve your Early Access position and earn rewards."]
        }
        actions={
          dashboardHref
            ? [{ label: "Referral Dashboard", href: dashboardHref, icon: <DashboardIcon className="h-4 w-4" /> }]
            : []
        }
        customActions={shareReferralAction ?? undefined}
        onClose={onClose}
      />
    );
  }

  if (kind === "position") {
    const paragraphs: string[] = [];
    if (card.reserved && card.positionForName) {
      paragraphs.push(`You are ${formatOrdinal(card.positionForName)} in line for ${name}.`);
    } else {
      paragraphs.push(`You have not reserved ${name} yet, so your place in line is not finalized.`);
    }

    if (card.totalForName > 1) {
      const othersCount = card.totalForName - 1;
      const personLabel = othersCount === 1 ? "person is" : "people are";
      paragraphs.push(`${othersCount} ${personLabel} also waiting for this name.`);
    }

    if (card.reserved && card.positionForName === 1) {
      paragraphs.push(`Your position may change if others also want ${name} and earn enough referrals. Share your referral link to protect your position.`);
    }

    return (
      <SummaryDetailModal
        eyebrow="Position"
        title={name}
        paragraphs={paragraphs}
        actions={[
          ...(card.waitlistHref ? [{ label: "Early Access Queue", href: card.waitlistHref, icon: <SearchIcon className="h-4 w-4" /> }] : []),
        ]}
        customActions={shareReferralAction ?? undefined}
        onClose={onClose}
      />
    );
  }

  return (
    <SummaryDetailModal
      eyebrow="Rewards"
      title={name}
      paragraphs={
        card.potentialRewards > 0
          ? [
              `You can earn up to ${formatZecAmount(card.potentialRewards)} ZEC if your referrals and their referrals purchase names during Early Access.`,
            ]
          : [
              "Share your referral link to invite others to the waitlist. Rewards are delivered to your Zcash Name when your referrals purchase their names during Early Access.",
            ]
      }
      actions={[
        ...(dashboardHref ? [{ label: "Referral Dashboard", href: dashboardHref, icon: <DashboardIcon className="h-4 w-4" /> }] : []),
      ]}
      customActions={shareReferralAction ?? undefined}
      onClose={onClose}
    />
  );
}

function WhatToDoSteps({
  minimumAmountZec,
}: {
  minimumAmountZec: string;
}) {
  const steps = [
    `Send at least ${minimumAmountZec} ZEC. Don't change address or memo.`,
    "Tap I Sent It!",
    "We’ll email your access code before Early Access begins.",
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
        Next steps
      </h3>
      <ol className="relative mt-4 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 px-4 py-2"
          >
            <span
              className="relative z-[1] inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              style={{
                background: "var(--color-accent-interactive-soft)",
                color: "var(--color-accent-interactive)",
              }}
            >
              {index + 1}
            </span>
            <span className="text-sm leading-6" style={{ color: "var(--fg-body)" }}>
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PaymentTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative -mb-px px-3 py-2.5 text-sm font-semibold transition"
      style={{
        background: "transparent",
        color: active ? "var(--color-accent-interactive)" : "var(--fg-body)",
        borderBottom: active
          ? "4px solid var(--color-accent-interactive)"
          : "2px solid transparent",
      }}
    >
      {label}
    </button>
  );
}

function ReservationStatusPane({
  card,
  verifyToken,
  onStatusUpdate,
  onReservationConfirmed,
}: {
  card: VerifyCard;
  verifyToken: string;
  onStatusUpdate: (cardId: string, update: VerifyCardStatusUpdate) => void;
  onReservationConfirmed: (card: VerifyCard) => void;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  const remainingMs = Math.max(0, cooldownUntil - nowMs);
  const isCoolingDown = remainingMs > 0;

  async function runStatusCheck() {
    if (isChecking || isCoolingDown) return;

    setIsChecking(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist/reservation-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verifyToken,
          rowId: card.id,
        }),
      });

      const payload = (await response.json()) as
        | {
            ok: true;
            checkedAt: string;
            card: {
              reserved: boolean;
              reservedAt: string | null;
              reservedTxid: string | null;
              totalForName: number;
              positionForName: number | null;
            };
          }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Reservation status could not be refreshed.",
        );
      }

      setLastCheckedAt(payload.checkedAt);
      const transitionedToReserved = !card.reserved && payload.card.reserved;
      onStatusUpdate(card.id, {
        reserved: payload.card.reserved,
        reservedAt: payload.card.reservedAt,
        reservedTxid: payload.card.reservedTxid,
        totalForName: payload.card.totalForName,
        positionForName: payload.card.positionForName,
      });
      if (transitionedToReserved) {
        onReservationConfirmed(card);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Reservation status could not be refreshed.",
      );
    } finally {
      setCooldownUntil(Date.now() + STATUS_REFRESH_COOLDOWN_MS);
      setNowMs(Date.now());
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (hasOpened) return;
    setHasOpened(true);
    void runStatusCheck();
  }, [hasOpened]);

  return (
    <div className="space-y-5">
      <div
        className="rounded-[24px] border px-4 py-4 text-left sm:px-5"
        style={{
          borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
          background: "var(--verify-panel-fill)",
        }}
      >
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
          Reservation status
        </p>
        {card.reserved ? (
          <div className="mt-3">
            <StatusBadge label="Reserved" tone="success" />
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          {card.reserved
            ? "A reservation was found for this UUID."
            : "No qualifying transaction has been detected for this name yet."}
        </p>
        <button
          type="button"
          onClick={() => void runStatusCheck()}
          disabled={isChecking || isCoolingDown}
          className="mt-4 inline-flex h-[42px] items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          {isChecking
            ? <AnimatedLoadingLabel label="Checking" active />
            : isCoolingDown
              ? `Refresh Status (${formatCooldownCountdown(remainingMs)})`
              : "Refresh Status"}
        </button>
      </div>

      <div
        className="rounded-[24px] border px-4 py-4 text-left sm:px-5"
        style={{
          borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
          background: "var(--verify-panel-fill)",
        }}
      >
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
          Last status check
        </p>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          {formatStatusCheckTimestamp(lastCheckedAt)}
        </p>
      </div>

      {errorMessage ? (
        <p className="text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function AccessCodeField({
  value = "Not available yet",
  copyValue = "",
}: {
  value?: string;
  copyValue?: string;
}) {
  const { copied, copy } = useCopy();
  const canCopy = copyValue.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-sm text-left">
      <div className="grid w-full items-center gap-2 grid-cols-[auto_minmax(0,1fr)_2.75rem]">
        <span className="pr-1 text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
          Access Code
        </span>
        <code
          className="min-w-0 truncate rounded-xl px-3 py-3 text-[0.78rem] font-mono"
          style={{
            background: "var(--color-raised)",
            color: "var(--fg-body)",
            border: "1px solid var(--border-muted)",
          }}
          title={value}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => void copy(copyValue)}
          disabled={!canCopy}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "transparent",
            border: "1.5px solid var(--border-muted)",
            color: "var(--fg-body)",
          }}
          aria-label="Copy access code"
          title={canCopy ? (copied ? "Copied!" : "Copy access code") : "Access code unavailable"}
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <ShareCopyIcon />}
        </button>
      </div>
    </div>
  );
}

function ProtectedHowAccessWorks({
  firstStepComplete = false,
}: {
  firstStepComplete?: boolean;
}) {
  const steps = [
    {
      title: "Submit a request",
      body: "Tell us how to contact you and why you should have access to this name.",
    },
    {
      title: "We review it",
      body: "We may contact you for information that connects you to the protected identity.",
    },
    {
      title: "Receive a decision",
      body: "We'll send the result using your preferred contact method.",
    },
    {
      title: "Claim the name",
      body: "If approved, you'll receive an access code and instructions to continue.",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
          How access works
        </h3>
        <ol className="relative mt-4 space-y-3">
          {steps.map((step, index) => {
            const isComplete = index === 0 && firstStepComplete;
            return (
            <li
              key={step.title}
              className="relative grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3 px-4 py-2"
            >
              <span
                className="relative z-[1] inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent-red, #d95b5b) 16%, transparent)",
                  color: "var(--accent-red, #d95b5b)",
                }}
              >
                {isComplete ? <CheckIcon className="h-4 w-4" /> : index + 1}
              </span>
              <span className={isComplete ? "opacity-70" : undefined}>
                <span
                  className="block text-sm font-semibold leading-6"
                  style={{
                    color: "var(--fg-heading)",
                    // line-through handles multi-line titles correctly; avoid a
                    // single absolute bar that only cuts through mid-block.
                    textDecoration: isComplete ? "line-through" : undefined,
                    textDecorationThickness: isComplete ? "1.5px" : undefined,
                  }}
                >
                  {step.title}
                </span>
                <span
                  className="mt-1 block text-sm leading-6"
                  style={{
                    color: "var(--fg-body)",
                    // Completed step: strike the title only. Body stays readable
                    // without a misplaced mid-line across wrapped text.
                  }}
                >
                  {step.body}
                </span>
              </span>
              {isComplete ? (
                <span
                  aria-hidden="true"
                  className="absolute left-8 top-10 h-8 w-px -translate-x-1/2"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--accent-red, #d95b5b) 34%, transparent) 0%, color-mix(in srgb, var(--accent-red, #d95b5b) 18%, transparent) 100%)",
                  }}
                />
              ) : null}
            </li>
            );
          })}
        </ol>
      </div>

    </div>
  );
}

function ProtectedRequestAction({
  label,
  icon,
  href,
  external = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const className =
    "flex h-16 w-full items-center justify-between rounded-[1.15rem] border px-4 py-4 text-left transition hover:opacity-85";
  const style = {
    borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
    background: "var(--verify-panel-soft-fill)",
    color: "var(--fg-heading)",
  } satisfies React.CSSProperties;

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span style={{ color: "var(--fg-muted)" }}>{icon}</span>
        <span className="text-sm font-semibold sm:text-base">{label}</span>
      </span>
      <span style={{ color: "var(--fg-muted)" }}>
        <ExternalArrowIcon />
      </span>
    </>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={className} style={style}>
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={className} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {content}
    </button>
  );
}

function ProtectedAccessRequestPanel({
  card,
  verifyToken,
  displayEmail,
  onProtectedRequestUpdate,
  onOpenProtectedWhy,
}: {
  card: VerifyCard;
  verifyToken: string;
  displayEmail: string;
  onProtectedRequestUpdate: (
    cardId: string,
    update: VerifyCardProtectedRequestUpdate,
  ) => void;
  onOpenProtectedWhy: () => void;
}) {
  const statusRef = useRef<HTMLDivElement | null>(null);
  const [contacts, setContacts] = useState<ProtectedContactRow[]>([]);
  const [preferredContactUid, setPreferredContactUid] = useState("");
  const [relationship, setRelationship] = useState<ProtectedRequestRelationship>("personal_or_public_name");
  const [supportingLink, setSupportingLink] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingAccessBody, setPendingAccessBody] = useState<{
    token: string;
    rowId: string;
    contactMethods: Array<{ kind: ContactKind; value: string; preferred: boolean }>;
    relationship: ProtectedRequestRelationship;
    supportingLink: string;
    additionalContext: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSubmittedDetails, setShowSubmittedDetails] = useState(false);

  useEffect(() => {
    const contactRows =
      card.protectedRequestContactMethods.length > 0
        ? card.protectedRequestContactMethods.map((contact, index) => ({
            uid: `pc_existing_${index}_${contact.kind}`,
            kind: contact.kind,
            value: contact.value,
          }))
        : [
            {
              uid: "pc_default_email",
              kind: "email" as ContactKind,
              value: displayEmail,
            },
          ];

    setContacts(contactRows);

    const preferredRow =
      contactRows.find((row) => row.kind === card.protectedRequestPreferredContactKind) ??
      contactRows[0];
    setPreferredContactUid(preferredRow?.uid ?? "");
    setRelationship(card.protectedRequestRelationship ?? "personal_or_public_name");
    setSupportingLink(card.protectedRequestSupportingLink ?? "");
    setAdditionalContext(card.protectedRequestAdditionalContext ?? "");
    setErrorMessage("");
    setIsEditing(card.protectedRequestStatus === "not_submitted");
    setShowSubmittedDetails(false);
  }, [
    card.protectedRequestAdditionalContext,
    card.protectedRequestContactMethods,
    card.protectedRequestPreferredContactKind,
    card.protectedRequestRelationship,
    card.protectedRequestStatus,
    card.protectedRequestSupportingLink,
    displayEmail,
  ]);

  function addContact() {
    const kind = nextUnusedProtectedContactKind(contacts);
    if (!kind) return;

    const uid = buildProtectedContactUid();
    setContacts((current) => [...current, { uid, kind, value: "" }]);
    if (!preferredContactUid) {
      setPreferredContactUid(uid);
    }
  }

  function removeContact(uid: string) {
    setContacts((current) => {
      const next = current.filter((row) => row.uid !== uid);
      if (preferredContactUid === uid) {
        setPreferredContactUid(next[0]?.uid ?? "");
      }
      return next;
    });
  }

  function updateContactKind(uid: string, kind: ContactKind) {
    setContacts((current) => {
      const currentRow = current.find((row) => row.uid === uid);
      if (!currentRow || currentRow.kind === kind) {
        return current;
      }

      const collision = current.find((row) => row.uid !== uid && row.kind === kind);
      if (!collision) {
        return current.map((row) => (row.uid === uid ? { ...row, kind } : row));
      }

      return current.map((row) => {
        if (row.uid === uid) return { ...row, kind };
        if (row.uid === collision.uid) return { ...row, kind: currentRow.kind };
        return row;
      });
    });
  }

  function updateContactValue(uid: string, value: string) {
    setContacts((current) =>
      current.map((row) => (row.uid === uid ? { ...row, value } : row)),
    );
  }

  function submitRequest() {
    if (isSubmitting || captchaOpen) return;

    const normalizedContacts = contacts
      .map((contact) => ({
        ...contact,
        value: contact.value.trim(),
      }))
      .filter((contact) => contact.value.length > 0);

    if (normalizedContacts.length === 0) {
      setErrorMessage("Add at least one contact method.");
      return;
    }

    const preferred =
      normalizedContacts.find((contact) => contact.uid === preferredContactUid) ??
      normalizedContacts[0];
    if (!preferred) {
      setErrorMessage("Choose a preferred contact method.");
      return;
    }

    setErrorMessage("");
    setPendingAccessBody({
      token: verifyToken,
      rowId: card.id,
      contactMethods: normalizedContacts.map((contact) => ({
        kind: contact.kind,
        value: contact.value,
        preferred: contact.uid === preferred.uid,
      })),
      relationship,
      supportingLink,
      additionalContext,
    });
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (isSubmitting) return;
    setCaptchaOpen(false);
    setPendingAccessBody(null);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (!pendingAccessBody || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist/protected-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingAccessBody,
          captcha_token: solution.captcha_token,
          captcha_answer: solution.captcha_answer,
        }),
      });

      const payload = (await response.json()) as
        | {
            ok: true;
            request: {
              id: string;
              status: Exclude<ProtectedRequestStatus, "not_submitted">;
              referenceNumber: string;
              submittedAt: string;
              preferredContactKind: ContactKind | null;
              preferredContactValue: string | null;
              contactMethods: ProtectedContactMethod[];
              relationship: ProtectedRequestRelationship | null;
              supportingLink: string | null;
              additionalContext: string | null;
              approvedAt: string | null;
              deniedAt: string | null;
            };
          }
        | { ok: false; error?: string; code?: string };

      if (!response.ok || !payload.ok) {
        const message =
          "error" in payload && payload.error
            ? payload.error
            : "Access request could not be submitted.";
        const captchaFailed =
          ("code" in payload && payload.code === "captcha_failed") ||
          message.toLowerCase().includes("human check");

        if (captchaFailed) {
          throw new Error(message);
        }

        setErrorMessage(message);
        setCaptchaOpen(false);
        setPendingAccessBody(null);
        return;
      }

      onProtectedRequestUpdate(card.id, {
        protectedRequestStatus: payload.request.status,
        protectedRequestId: payload.request.id,
        protectedRequestReferenceNumber: payload.request.referenceNumber,
        protectedRequestSubmittedAt: payload.request.submittedAt,
        protectedRequestPreferredContactKind: payload.request.preferredContactKind,
        protectedRequestPreferredContactValue: payload.request.preferredContactValue,
        protectedRequestContactMethods: payload.request.contactMethods,
        protectedRequestRelationship: payload.request.relationship,
        protectedRequestSupportingLink: payload.request.supportingLink,
        protectedRequestAdditionalContext: payload.request.additionalContext,
        protectedRequestApprovedAt: payload.request.approvedAt,
        protectedRequestDeniedAt: payload.request.deniedAt,
      });
      setIsEditing(false);
      setCaptchaOpen(false);
      setPendingAccessBody(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Access request could not be submitted.";

      if (message.toLowerCase().includes("human check")) {
        throw error;
      }

      setErrorMessage(message);
      setCaptchaOpen(false);
      setPendingAccessBody(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (card.protectedRequestStatus === "approved") {
    return (
      <div
        ref={statusRef}
        className="rounded-[24px] border px-4 py-4 text-left sm:px-5"
        style={{
          borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
          background: "color-mix(in srgb, var(--color-card) 92%, transparent)",
        }}
      >
        <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
          Access approved
        </h3>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
          Your request has been approved. We will deliver the access code to your preferred contact method. You may purchase this name during the Early Access period.
        </p>
        <div className="mt-5 grid gap-3">
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
              Preferred contact
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
              {card.protectedRequestPreferredContactKind
                ? `${CONTACT_LABEL[card.protectedRequestPreferredContactKind]}: ${card.protectedRequestPreferredContactValue ?? ""}`
                : "Not provided"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isEditing && card.protectedRequestStatus === "submitted") {
    const contactMethods = card.protectedRequestContactMethods.length
      ? card.protectedRequestContactMethods
          .map((contact) => `${CONTACT_LABEL[contact.kind]}: ${contact.value}`)
          .join("\n")
      : "Not provided";

    return (
      <div
        ref={statusRef}
        className="rounded-[24px] border px-4 py-4 text-left sm:px-5"
        style={{
          borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
          background: "color-mix(in srgb, var(--color-card) 92%, transparent)",
        }}
      >
        <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
          Request submitted
        </h3>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
          {formatProtectedRequestTimestamp(card.protectedRequestSubmittedAt)}
        </p>
        <div className="mt-5 grid gap-3">
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
              Preferred contact method
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
              {card.protectedRequestPreferredContactKind
                ? `${CONTACT_LABEL[card.protectedRequestPreferredContactKind]}: ${card.protectedRequestPreferredContactValue ?? ""}`
                : "Not provided"}
            </p>
          </div>
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
              Status
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
              Under review
            </p>
          </div>
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
              Reference number
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
              {card.protectedRequestReferenceNumber ?? "Pending"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSubmittedDetails((current) => !current)}
          className="mt-5 inline-flex text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--fg-body)" }}
        >
          {showSubmittedDetails ? "Hide details" : "Show details"}
        </button>
        {showSubmittedDetails ? (
          <div className="mt-5 grid gap-3">
            <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
                Contact methods
              </p>
              <p className="mt-1 whitespace-pre-line text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                {contactMethods}
              </p>
            </div>
            <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
                Relationship to this name
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                {card.protectedRequestRelationship
                  ? PROTECTED_RELATIONSHIP_LABEL[card.protectedRequestRelationship]
                  : "Not provided"}
              </p>
            </div>
            <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
                Supporting link
              </p>
              <p className="mt-1 break-all text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                {card.protectedRequestSupportingLink ?? "Not provided"}
              </p>
            </div>
            <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
                Additional context
              </p>
              <p className="mt-1 whitespace-pre-line text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                {card.protectedRequestAdditionalContext || "Not provided"}
              </p>
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <ProtectedRequestAction
            label="Update request details"
            icon={<GearIcon className="h-4 w-4" />}
            onClick={() => setIsEditing(true)}
          />
        </div>
      </div>
    );
  }

  if (!isEditing && card.protectedRequestStatus === "denied") {
    return (
      <div
        ref={statusRef}
        className="rounded-[24px] border px-4 py-4 text-left sm:px-5"
        style={{
          borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
          background: "color-mix(in srgb, var(--color-card) 92%, transparent)",
        }}
      >
        <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
          Access not approved
        </h3>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
          We could not confirm access based on the information provided.
        </p>
        <div className="mt-6 grid gap-3">
          <ProtectedRequestAction
            label="Submit additional information"
            icon={<DocumentIcon className="h-4 w-4" />}
            onClick={() => setIsEditing(true)}
          />
          <ProtectedRequestAction
            label="Contact support"
            icon={<MailIcon className="h-4 w-4" />}
            href="mailto:support@zcashnames.com"
            external
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to submit your protected name access request."
        confirmLabel="Submit request"
        submitting={isSubmitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
    <div
      className="rounded-[24px] border px-4 py-4 text-left sm:px-5"
      style={{
        borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
            Request this name
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-7" style={{ color: "var(--fg-body)" }}>
            Requests are reviewed manually. Approval does not waive the purchase price.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <label className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
            Preferred contact method(s)
          </label>
          <p className="mb-3 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
            Add one or more contact methods and mark which one you prefer we use first.
          </p>
          <div className="flex flex-col gap-3">
            {contacts.map((contact) => {
              const isPreferred = contact.uid === preferredContactUid;
              return (
                <div key={contact.uid} className="flex items-center gap-2">
                  <label
                    className="flex shrink-0 cursor-pointer items-center justify-center"
                    title={isPreferred ? "Preferred contact" : "Mark as preferred"}
                    style={{ width: 24 }}
                  >
                    <input
                      type="radio"
                      name={`protected_contact_${card.id}`}
                      checked={isPreferred}
                      onChange={() => setPreferredContactUid(contact.uid)}
                      className="sr-only"
                    />
                    <span
                      className="block rounded-full transition-all"
                      style={{
                        width: 14,
                        height: 14,
                        border: `2px solid ${isPreferred ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                        background: isPreferred ? "var(--color-accent-green)" : "transparent",
                        boxShadow: isPreferred ? "inset 0 0 0 2px var(--color-raised)" : "none",
                      }}
                    />
                  </label>
                  <select
                    value={contact.kind}
                    onChange={(event) => updateContactKind(contact.uid, event.target.value as ContactKind)}
                    className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{
                        background: "var(--verify-input-fill)",
                        border: "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
                        color: "var(--fg-heading)",
                      appearance: "none",
                      paddingRight: "2rem",
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='gray' stroke-width='2'><polyline points='3 5 6 8 9 5'/></svg>\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.6rem center",
                      backgroundSize: "0.8rem",
                      minWidth: 130,
                    }}
                  >
                    {CONTACT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {CONTACT_LABEL[kind]}
                      </option>
                    ))}
                  </select>
                  <input
                    type={contact.kind === "email" ? "email" : "text"}
                    value={contact.value}
                    onChange={(event) => updateContactValue(contact.uid, event.target.value)}
                    placeholder={CONTACT_PLACEHOLDER[contact.kind]}
                    maxLength={200}
                    className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{
                      background: "var(--verify-input-fill)",
                      border: "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
                      color: "var(--fg-heading)",
                    }}
                  />
                  {contacts.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeContact(contact.uid)}
                      aria-label="Remove this contact method"
                      className="cursor-pointer px-1 text-2xl leading-none opacity-60 hover:opacity-100"
                      style={{ color: "var(--fg-body)" }}
                    >
                      &times;
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          {contacts.length < CONTACT_KINDS.length ? (
            <button
              type="button"
              onClick={addContact}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: "var(--fg-body)", marginLeft: "2rem" }}
            >
              <span>+</span>
              <span className="underline">Add another contact method</span>
            </button>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
            Your relationship to this name
          </label>
          <select
            value={relationship}
            onChange={(event) => setRelationship(event.target.value as ProtectedRequestRelationship)}
            className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--verify-input-fill)",
              border: "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
              color: "var(--fg-heading)",
              appearance: "none",
              paddingRight: "2rem",
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='gray' stroke-width='2'><polyline points='3 5 6 8 9 5'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.6rem center",
              backgroundSize: "0.8rem",
            }}
          >
            {PROTECTED_RELATIONSHIP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
            Supporting link
          </label>
          <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
            Optional on first submission. Examples: official website, public profile, or organization page.
          </p>
          <input
            type="url"
            value={supportingLink}
            onChange={(event) => setSupportingLink(event.target.value)}
            placeholder="https://example.com"
            maxLength={240}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--verify-input-fill)",
              border: "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
              color: "var(--fg-heading)",
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
            Additional context
          </label>
          <textarea
            value={additionalContext}
            onChange={(event) => setAdditionalContext(event.target.value)}
            placeholder="Tell us anything that may help us review your request."
            maxLength={400}
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "var(--verify-input-fill)",
              border: "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
              color: "var(--fg-heading)",
              resize: "vertical",
            }}
          />
          <p className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
            {additionalContext.length}/400 characters
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
          {errorMessage}
        </p>
      ) : null}

      {card.protectedRequestStatus === "submitted" ? (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: "transparent",
              color: "var(--fg-body)",
              border: "1.5px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
            }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => submitRequest()}
            disabled={isSubmitting || captchaOpen}
            className="inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            {isSubmitting ? (
              <AnimatedLoadingLabel label="Submitting" active />
            ) : captchaOpen ? (
              "Complete check…"
            ) : (
              "Update request"
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => submitRequest()}
          disabled={isSubmitting || captchaOpen}
          className="mt-6 inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          {isSubmitting ? (
            <AnimatedLoadingLabel label="Submitting" active />
          ) : captchaOpen ? (
            "Complete check…"
          ) : (
            "Submit access request"
          )}
        </button>
      )}

    </div>
    </>
  );
}

function VerifyPaymentCard({
  verifyToken,
  paymentAddress,
  baseAmountZec,
  card,
  displayEmail,
  onStatusUpdate,
  onOpenReservedInfo,
  onOpenPendingInfo,
  onOpenProtectedInfo,
  onProtectedRequestUpdate,
  onOpenSummary,
  onToggleCollapsed,
  onRequestDelete,
  onReservationConfirmed,
}: {
  verifyToken: string;
  paymentAddress: string;
  baseAmountZec: string;
  card: VerifyCard;
  displayEmail: string;
  onStatusUpdate: (cardId: string, update: VerifyCardStatusUpdate) => void;
  onOpenReservedInfo: () => void;
  onOpenPendingInfo: () => void;
  onOpenProtectedInfo: (card: VerifyCard) => void;
  onProtectedRequestUpdate: (
    cardId: string,
    update: VerifyCardProtectedRequestUpdate,
  ) => void;
  onOpenSummary: (kind: SummaryCardKind, card: VerifyCard) => void;
  onToggleCollapsed: (card: VerifyCard) => void;
  onRequestDelete: (card: VerifyCard) => void;
  onReservationConfirmed: (card: VerifyCard) => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeTab, setActiveTab] = useState<"payment" | "sent">("payment");
  const baseAmountValue = roundPendingZecAmount(parseZecAmount(baseAmountZec));
  const [selectedAmount, setSelectedAmount] = useState(baseAmountValue);
  const [draftAmount, setDraftAmount] = useState(() => formatPendingZecAmount(baseAmountValue));
  const repeatTimeoutRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const amountFieldRef = useRef<HTMLDivElement | null>(null);
  const reservedDate = formatReservedDate(card.reservedAt);
  const selectedAmountText = formatPendingZecAmount(selectedAmount);
  const isSupporting = selectedAmount > baseAmountValue;
  const firstSupportAmount = firstSupportStepAboveBase(baseAmountValue);
  const deletePending = card.deleteRequestStatus === "pending";
  const compactCardClassName = card.collapsed
    ? "max-w-full rounded-[32px] border shadow-[0_28px_80px_rgba(22,35,66,0.10)]"
    : "rounded-[32px] border shadow-[0_28px_80px_rgba(22,35,66,0.10)]";

  function handleViewDetails() {
    if (card.protectedName && !card.reserved) {
      onOpenProtectedInfo(card);
      return;
    }
    if (card.reserved) {
      onOpenReservedInfo();
      return;
    }
    onOpenPendingInfo();
  }

  useEffect(() => {
    return () => {
      if (repeatTimeoutRef.current !== null) {
        window.clearTimeout(repeatTimeoutRef.current);
      }
      if (repeatIntervalRef.current !== null) {
        window.clearInterval(repeatIntervalRef.current);
      }
    };
  }, []);

  function clearAmountRepeat() {
    if (repeatTimeoutRef.current !== null) {
      window.clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }

  function setAmount(nextAmount: number) {
    const normalizedAmount = roundPendingZecAmount(nextAmount);
    setSelectedAmount(normalizedAmount);
    setDraftAmount(formatPendingZecAmount(normalizedAmount));
  }

  function triggerInvalidAmountFeedback() {
    setDraftAmount(selectedAmountText);

    if (prefersReducedMotion || !amountFieldRef.current) {
      return;
    }

    amountFieldRef.current.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: "translate3d(-8px, 0, 0)" },
        { transform: "translate3d(7px, 0, 0)" },
        { transform: "translate3d(-5px, 0, 0)" },
        { transform: "translate3d(4px, 0, 0)" },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)",
      },
    );
  }

  function validateDraftAmount() {
    const trimmedAmount = draftAmount.trim();
    const parsedAmount = roundPendingZecAmount(parseZecAmount(trimmedAmount));

    if (trimmedAmount && parsedAmount >= baseAmountValue) {
      setAmount(parsedAmount);
      return;
    }

    triggerInvalidAmountFeedback();
  }

  function increaseAmount() {
    setSelectedAmount((current) => {
      // From base (or anything below the first 0.005 rung), jump to that rung.
      // Further presses add 0.005.
      const nextAmount =
        current < firstSupportAmount
          ? firstSupportAmount
          : current + PENDING_RESERVATION_AMOUNT_STEP;
      const normalizedAmount = roundPendingZecAmount(nextAmount);
      setDraftAmount(formatPendingZecAmount(normalizedAmount));
      return normalizedAmount;
    });
  }

  function handleAmountDraftChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.currentTarget.value;
    if (/^\d{0,3}(?:\.\d{0,4})?$/.test(nextValue)) {
      setDraftAmount(nextValue);
    }
  }

  function handleAmountDraftKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraftAmount(selectedAmountText);
      event.currentTarget.blur();
    }
  }

  function decreaseAmount() {
    setSelectedAmount((current) => {
      // Step down by 0.005 on the support ladder; after the last rung, land on env base.
      const nextAmount =
        current <= firstSupportAmount
          ? baseAmountValue
          : Math.max(firstSupportAmount, current - PENDING_RESERVATION_AMOUNT_STEP);
      const normalizedAmount = roundPendingZecAmount(nextAmount);
      setDraftAmount(formatPendingZecAmount(normalizedAmount));
      return normalizedAmount;
    });
  }

  function startAmountRepeat(direction: "increase" | "decrease") {
    clearAmountRepeat();
    repeatTimeoutRef.current = window.setTimeout(() => {
      const action = direction === "increase" ? increaseAmount : decreaseAmount;
      action();
      repeatIntervalRef.current = window.setInterval(action, 90);
    }, 325);
  }

  useEffect(() => {
    if (selectedAmount < baseAmountValue) {
      setAmount(baseAmountValue);
    }
  }, [baseAmountValue, selectedAmount]);

  if (card.protectedName && !card.reserved) {
    return (
      <article
        className={compactCardClassName}
        style={{
          borderColor: "color-mix(in srgb, var(--accent-red, #e05252) 38%, var(--faq-border))",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent) 0%, color-mix(in srgb, var(--color-card) 96%, transparent) 100%)",
        }}
      >
        <div className={card.collapsed ? "" : "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]"}>
          <section className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0">
                      <h2 className="min-w-0 text-[1.65rem] font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
                        {card.name?.trim() || "Protected name"}
                      </h2>
                    </div>
                    <VerifyCardActionMenu
                      collapsed={card.collapsed}
                      deletePending={deletePending}
                      onViewDetails={handleViewDetails}
                      onToggleCollapsed={() => onToggleCollapsed(card)}
                      onDelete={() => onRequestDelete(card)}
                    />
                  </div>
                  <div className="min-w-0">
                    {!card.collapsed ? (
                      <p className="mt-1 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                        This name is protected to reduce impersonation. Request access if you represent the person, organization, or identity associated with this name.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge label="Protected" tone="danger" />
                </div>
              </div>
            </div>

            {!card.collapsed ? (
              <div className="mt-6">
                <ProtectedHowAccessWorks firstStepComplete={card.protectedRequestStatus !== "not_submitted"} />
              </div>
            ) : null}
          </section>

          {!card.collapsed ? (
            <section className="px-5 py-5 sm:px-6 sm:py-6">
              <ProtectedAccessRequestPanel
                card={card}
                verifyToken={verifyToken}
                displayEmail={displayEmail}
                onProtectedRequestUpdate={onProtectedRequestUpdate}
                onOpenProtectedWhy={() => onOpenProtectedInfo(card)}
              />
            </section>
          ) : null}
        </div>
      </article>
    );
  }

  if (card.reserved) {
    return (
      <article
        className={compactCardClassName}
        style={{
          borderColor: "color-mix(in srgb, var(--color-accent-green) 44%, var(--faq-border))",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-accent-green-light) 76%, transparent) 0%, color-mix(in srgb, var(--color-card) 96%, transparent) 100%)",
        }}
      >
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0">
                  <h2 className="min-w-0 text-[1.65rem] font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
                    {card.name?.trim() || "Reserved name"}
                  </h2>
                </div>
                <VerifyCardActionMenu
                  collapsed={card.collapsed}
                  deletePending={deletePending}
                  onViewDetails={handleViewDetails}
                  onToggleCollapsed={() => onToggleCollapsed(card)}
                  onDelete={() => onRequestDelete(card)}
                />
              </div>
              <div className="shrink-0">
                <StatusBadge label="Reserved" tone="success" />
              </div>
            </div>
            {!card.collapsed ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <ReservationMetaBox
                  label="Reserved"
                  primary={reservedDate}
                  onClick={() => onOpenSummary("reserved", card)}
                />
                <ReservationMetaBox
                  label="Referrals"
                  primary={`${card.reservedReferrals} of ${card.totalReferrals}`}
                  onClick={() => onOpenSummary("referrals", card)}
                />
                <ReservationMetaBox
                  label="Position"
                  primary={positionDisplay(card)}
                  onClick={() => onOpenSummary("position", card)}
                />
                <ReservationMetaBox
                  label="Rewards"
                  primary={`${formatZecAmount(card.potentialRewards)} ZEC`}
                  onClick={() => onOpenSummary("rewards", card)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  if (card.memoError) {
    return (
      <article
        className={compactCardClassName}
        style={{
          borderColor: "color-mix(in srgb, var(--accent-red, #e05252) 38%, var(--faq-border))",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent-red, #e05252) 8%, transparent) 0%, color-mix(in srgb, var(--color-card) 96%, transparent) 100%)",
        }}
      >
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                    Reservation unavailable
                  </p>
                  <h2 className="mt-1 text-[1.65rem] font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
                    {card.name?.trim() || "Unavailable name"}
                  </h2>
                </div>
                <VerifyCardActionMenu
                  collapsed={card.collapsed}
                  deletePending={deletePending}
                  onViewDetails={handleViewDetails}
                  onToggleCollapsed={() => onToggleCollapsed(card)}
                  onDelete={() => onRequestDelete(card)}
                />
              </div>
              <div className="min-w-0">
                {!card.collapsed ? (
                  <p className="mt-4 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
                    {card.memoError}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="shrink-0">
              <StatusBadge label="Pending" tone="warning" />
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={compactCardClassName}
      style={{
        borderColor: "color-mix(in srgb, var(--color-accent-interactive) 32%, var(--faq-border))",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent) 0%, color-mix(in srgb, var(--color-card) 96%, transparent) 100%)",
      }}
    >
      <div className={card.collapsed ? "" : "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]"}>
        <section className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="min-w-0">
                    <h2 className="min-w-0 text-[1.65rem] font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
                      {card.name?.trim() || "Unavailable name"}
                    </h2>
                  </div>
                  <VerifyCardActionMenu
                    collapsed={card.collapsed}
                    deletePending={deletePending}
                    onViewDetails={handleViewDetails}
                    onToggleCollapsed={() => onToggleCollapsed(card)}
                    onDelete={() => onRequestDelete(card)}
                  />
                </div>
                <div className="min-w-0">
                  {!card.collapsed ? (
                    <p className="mt-1 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
                      Pay the reservation fee to qualify for Early Access.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge label="Pending" tone="warning" />
              </div>
            </div>
          </div>

          {!card.collapsed ? (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-center text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
                  {isSupporting ? "Thanks for your support" : "Send at least"}
                </p>
                <div className="mt-2 grid grid-cols-[2.5rem_minmax(0,auto)_2.5rem] items-center justify-center gap-3">
                  {isSupporting ? (
                    <button
                      type="button"
                      onClick={decreaseAmount}
                      onPointerDown={() => startAmountRepeat("decrease")}
                      onPointerUp={clearAmountRepeat}
                      onPointerLeave={clearAmountRepeat}
                      onPointerCancel={clearAmountRepeat}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition-opacity hover:opacity-80"
                      style={{
                        background: "transparent",
                        borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
                        color: "var(--fg-body)",
                      }}
                      aria-label="Decrease amount"
                      title="Decrease amount"
                    >
                      -
                    </button>
                  ) : (
                    <span className="h-10 w-10" aria-hidden="true" />
                  )}
                  <div
                    ref={amountFieldRef}
                    className="flex items-baseline justify-center text-center text-[2.35rem] font-black tracking-[-0.05em]"
                    style={{ color: "var(--fg-heading)" }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      value={draftAmount}
                      onChange={handleAmountDraftChange}
                      onBlur={validateDraftAmount}
                      onKeyDown={handleAmountDraftKeyDown}
                      onFocus={(event) => event.currentTarget.select()}
                      aria-label="Reservation amount"
                      className="min-w-0 border-0 bg-transparent p-0 text-right outline-none"
                      style={{
                        width: `${Math.max(draftAmount.length, 1)}ch`,
                        color: "inherit",
                        font: "inherit",
                        letterSpacing: "inherit",
                        lineHeight: "inherit",
                        caretColor: "currentColor",
                        appearance: "none",
                      }}
                    />
                    <span className="ml-[0.24em]">ZEC</span>
                  </div>
                  <button
                    type="button"
                    onClick={increaseAmount}
                    onPointerDown={() => startAmountRepeat("increase")}
                    onPointerUp={clearAmountRepeat}
                    onPointerLeave={clearAmountRepeat}
                    onPointerCancel={clearAmountRepeat}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: "transparent",
                      borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
                      color: "var(--fg-body)",
                    }}
                    aria-label="Increase amount"
                    title="Increase amount"
                  >
                    +
                  </button>
                </div>
              </div>
              <WhatToDoSteps minimumAmountZec={formatPendingZecAmount(baseAmountValue)} />
            </div>
          ) : null}
        </section>

        {!card.collapsed ? (
          <section className="px-5 py-5 sm:px-6 sm:py-6">
            <div
              className="flex h-full flex-col rounded-[24px] border px-4 py-4 sm:px-5"
              style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
            >
              <div
                className="flex items-end justify-center gap-6 border-b"
                style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
              >
                <PaymentTabButton
                  label="Payment"
                  active={activeTab === "payment"}
                  onClick={() => setActiveTab("payment")}
                />
                <PaymentTabButton
                  label="I Sent It!"
                  active={activeTab === "sent"}
                  onClick={() => setActiveTab("sent")}
                />
              </div>

              {activeTab === "payment" ? (
                <div className="mt-6 flex h-full flex-col text-center">
                  <div className="mt-5">
                    <QrBlock
                      address={paymentAddress}
                      amount={selectedAmountText}
                      memo={card.memo ?? ""}
                      downloadFilename={`zcashnames-reserve-${(card.name?.trim() || "name").toLowerCase()}.png`}
                      layout="verify"
                      size={184}
                    />
                  </div>
                </div>
                ) : (
                  <div className="mt-6">
                    <ReservationStatusPane
                      card={card}
                      verifyToken={verifyToken}
                      onStatusUpdate={onStatusUpdate}
                      onReservationConfirmed={onReservationConfirmed}
                    />
                    <div className="mt-5">
                      <ExactAmountCallout variant="sent" />
                    </div>
                  </div>
                )}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

export default function WaitlistVerifyClient({
  verifyToken,
  paymentAddress,
  baseAmountZec,
  cards,
  displayEmail,
  normalizedEmail,
  earlyAccessStartAt,
  earlyAccessLabel,
  shareDraftPosts,
}: WaitlistVerifyClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = usePrefersReducedMotion();
  const addMoreNamesRef = useRef<HTMLDivElement | null>(null);
  const [cardState, setCardState] = useState(cards);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "reserved" | "protected">("all");
  const pendingCount = cardState.filter((card) => !card.reserved && !card.protectedName).length;
  const reservedCount = cardState.filter((card) => card.reserved).length;
  const protectedCount = cardState.filter((card) => card.protectedName && !card.reserved).length;
  const filteredCards = cardState
    .filter((card) => {
      if (activeFilter === "pending") return !card.reserved && !card.protectedName;
      if (activeFilter === "reserved") return card.reserved;
      if (activeFilter === "protected") return card.protectedName && !card.reserved;
      return true;
    })
    .sort((left, right) => getCardSortPriority(left) - getCardSortPriority(right));
  const orderedCardGroups: Array<{
    type: "expanded" | "collapsed";
    cards: VerifyCard[];
  }> = [];
  let collapsedBuffer: VerifyCard[] = [];

  for (const card of filteredCards) {
    if (card.collapsed) {
      collapsedBuffer.push(card);
      continue;
    }

    if (collapsedBuffer.length > 0) {
      orderedCardGroups.push({ type: "collapsed", cards: collapsedBuffer });
      collapsedBuffer = [];
    }

    orderedCardGroups.push({ type: "expanded", cards: [card] });
  }

  if (collapsedBuffer.length > 0) {
    orderedCardGroups.push({ type: "collapsed", cards: collapsedBuffer });
  }
  const [showReservedInfo, setShowReservedInfo] = useState(false);
  const [showPendingInfo, setShowPendingInfo] = useState(false);
  const [protectedInfoCard, setProtectedInfoCard] = useState<VerifyCard | null>(null);
  const [deleteCard, setDeleteCard] = useState<VerifyCard | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleteRequestSubmitting, setIsDeleteRequestSubmitting] = useState(false);
  const [deleteCaptchaOpen, setDeleteCaptchaOpen] = useState(false);
  const [removedName, setRemovedName] = useState<string | null>(null);
  const [celebrationCard, setCelebrationCard] = useState<VerifyCard | null>(null);
  const [activeSummary, setActiveSummary] = useState<{
    kind: SummaryCardKind;
    card: VerifyCard;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflowX = root.style.overflowX;
    const previousBodyOverflowX = body.style.overflowX;

    root.style.overflowX = "hidden";
    body.style.overflowX = "hidden";

    return () => {
      root.style.overflowX = previousRootOverflowX;
      body.style.overflowX = previousBodyOverflowX;
    };
  }, []);

  useEffect(() => {
    const deleteStatus = searchParams.get("delete");
    const removed = searchParams.get("removed")?.trim();
    if (deleteStatus === "success" && removed) {
      setRemovedName(removed);
    }
  }, [searchParams]);

  function clearDeleteSuccess() {
    setRemovedName(null);
    router.replace(`/reserve?token=${encodeURIComponent(verifyToken)}`, { scroll: false });
  }

  function updateCard(cardId: string, update: VerifyCardStatusUpdate) {
    setCardState((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              ...update,
            }
          : card,
      ),
    );
  }

  function updateProtectedRequest(
    cardId: string,
    update: VerifyCardProtectedRequestUpdate,
  ) {
    setCardState((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              ...update,
            }
          : card,
      ),
    );
  }

  function updateCardPreference(
    cardId: string,
    update: VerifyCardPreferenceUpdate,
  ) {
    setCardState((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              ...update,
            }
          : card,
      ),
    );
  }

  function handleReservationConfirmed(card: VerifyCard) {
    setCelebrationCard({
      ...card,
      reserved: true,
    });
  }

  function scrollToAddMoreNames() {
    addMoreNamesRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  async function handleToggleCollapsed(card: VerifyCard) {
    const nextCollapsed = !card.collapsed;
    updateCardPreference(card.id, { collapsed: nextCollapsed });

    try {
      const response = await fetch("/api/waitlist/reserve-row-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verifyToken,
          rowId: card.id,
          collapsed: nextCollapsed,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not save card visibility.");
      }
    } catch (error) {
      updateCardPreference(card.id, { collapsed: card.collapsed });
      const message =
        error instanceof Error ? error.message : "Could not save card visibility.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    }
  }

  function openDeleteCaptcha() {
    if (!deleteCard || isDeleteRequestSubmitting || deleteCaptchaOpen) return;
    setDeleteErrorMessage(null);
    setDeleteCaptchaOpen(true);
  }

  function closeDeleteCaptcha() {
    if (isDeleteRequestSubmitting) return;
    setDeleteCaptchaOpen(false);
  }

  async function handleCreateDeleteRequest(solution: CaptchaSolution) {
    if (!deleteCard || isDeleteRequestSubmitting) return;
    setIsDeleteRequestSubmitting(true);
    setDeleteErrorMessage(null);

    try {
      const response = await fetch("/api/waitlist/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verifyToken,
          rowId: deleteCard.id,
          captcha_token: solution.captcha_token,
          captcha_answer: solution.captcha_answer,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        deleteRequest?: {
          id: string;
          status: DeleteRequestStatus;
          requestedAt: string;
          expiresAt: string;
        };
      };

      if (!response.ok || !payload.ok || !payload.deleteRequest) {
        const message = payload.error || "Could not create the delete request.";
        const captchaFailed =
          payload.code === "captcha_failed" || message.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(message);
        }
        setDeleteErrorMessage(message);
        setDeleteCaptchaOpen(false);
        return;
      }

      updateCardPreference(deleteCard.id, {
        deleteRequestStatus: "pending",
        deleteRequestId: payload.deleteRequest.id,
        deleteRequestRequestedAt: payload.deleteRequest.requestedAt,
        deleteRequestExpiresAt: payload.deleteRequest.expiresAt,
      });
      setDeleteCaptchaOpen(false);
      setDeleteCard(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create the delete request.";
      if (message.toLowerCase().includes("human check")) {
        throw error;
      }
      setDeleteErrorMessage(message);
      setDeleteCaptchaOpen(false);
    } finally {
      setIsDeleteRequestSubmitting(false);
    }
  }

  const celebrationName = celebrationCard?.name?.trim() || "your name";
  const celebrationShareUrl = celebrationCard?.referralCode?.trim()
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.zcashnames.com"}/?ref=${encodeURIComponent(celebrationCard.referralCode.trim())}`
    : `${typeof window !== "undefined" ? window.location.origin : "https://www.zcashnames.com"}/waitlist`;
  const celebrationXHref = buildXShareHref(
    buildShareMessageWithLink(
      `I just reserved ${celebrationName} for Zcash Names Early Access. Join the waitlist with my referral link if you want a name for your shielded address, too.`,
      celebrationShareUrl,
    ),
  );

  function renderVerifyPaymentCard(card: VerifyCard) {
    return (
      <VerifyPaymentCard
        key={card.id}
        verifyToken={verifyToken}
        paymentAddress={paymentAddress}
        baseAmountZec={baseAmountZec}
        card={card}
        displayEmail={displayEmail || normalizedEmail}
        onStatusUpdate={updateCard}
        onOpenReservedInfo={() => setShowReservedInfo(true)}
        onOpenPendingInfo={() => setShowPendingInfo(true)}
        onOpenProtectedInfo={(protectedCard) => setProtectedInfoCard(protectedCard)}
        onProtectedRequestUpdate={updateProtectedRequest}
        onOpenSummary={(kind, summaryCard) => setActiveSummary({ kind, card: summaryCard })}
        onToggleCollapsed={handleToggleCollapsed}
        onRequestDelete={(deleteTarget) => {
          setDeleteErrorMessage(null);
          setDeleteCard(deleteTarget);
        }}
        onReservationConfirmed={handleReservationConfirmed}
      />
    );
  }

  return (
    <div>
      <style jsx global>{`
        @keyframes verify-success-pop {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes verify-confetti-float {
          0% {
            opacity: 0;
            transform: translate3d(0, -10px, 0) scale(0.65) rotate(0deg);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 185px, 0) scale(1) rotate(22deg);
          }
        }
      `}</style>
      <VerifyAmbientHeroSection
        earlyAccessStartAt={earlyAccessStartAt}
        bandInsetClassName="-mt-5 pt-5 sm:-mt-6 sm:pt-6"
        hero={
          <section className="mx-auto max-w-[63rem] xl:max-w-[65rem]">
            <div
              className="mx-auto max-w-2xl rounded-2xl border px-6 py-8 text-center sm:px-8 sm:py-10"
              style={{
                borderColor: "var(--faq-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
              }}
            >
              <h1
                className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
                style={{ color: "var(--hero-headline-primary)" }}
              >
                Ready to
                <br />
                <span style={{ color: "var(--color-accent-interactive)" }}>claim your name?</span>
              </h1>
              <HeroHowReservationsWork />
            </div>
          </section>
        }
      />

      <section className="mt-8 sm:mt-10">
        <SummaryStrip
          totalCount={cardState.length}
          pendingCount={pendingCount}
          reservedCount={reservedCount}
          protectedCount={protectedCount}
          displayEmail={displayEmail || normalizedEmail}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onAddMoreNames={scrollToAddMoreNames}
        />

        <div className="mt-6">
          {orderedCardGroups.length > 0 ? (
            <div className="space-y-6">
              {orderedCardGroups.map((group, index) =>
                group.type === "collapsed" ? (
                  <div key={`collapsed-${index}`} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {group.cards.map((card) => renderVerifyPaymentCard(card))}
                  </div>
                ) : (
                  group.cards.map((card) => renderVerifyPaymentCard(card))
                ),
              )}
            </div>
          ) : null}
        </div>

        <div
          ref={addMoreNamesRef}
          className="mt-10 border-t pt-8 sm:mt-12 sm:pt-10"
          style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
        >
          <div className="mx-auto max-w-4xl">
            <h2
              className="text-balance text-center text-[1.65rem] font-bold tracking-tight"
              style={{ color: "var(--hero-headline-primary)" }}
            >
              Add more <span style={{ color: "var(--color-accent-interactive)" }}>names</span>
            </h2>
            <p
              className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 sm:text-base"
              style={{ color: "var(--fg-body)" }}
            >
              <strong>
                Add your name to the waitlist, reserve your place, and refer others to move up
                before receiving your access code.
              </strong>
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <WaitlistEntryForm showNewsletter={false} />
          </div>
        </div>
      </section>

      {showReservedInfo ? (
        <VerifyInfoModal
          title="Reserved name"
          paragraphs={[
            "You’ll have the option to purchase this name during Early Access. Pricing to be announced.",
          ]}
          actions={[
            { label: "Frequently Asked Questions", href: "/faq", icon: <DocumentIcon className="h-4 w-4" /> },
            { label: "Discord", href: "https://discord.gg/z2H23QgAGf", external: true, icon: <DiscordIcon className="h-4 w-4" /> },
          ]}
          onClose={() => setShowReservedInfo(false)}
        />
      ) : null}
      {showPendingInfo ? (
        <VerifyInfoModal
          title="Pending reservation"
          paragraphs={[
            "This name has not been reserved yet. Complete the transaction to receive an access code before Early Access begins.",
          ]}
          actions={[
            { label: "Frequently Asked Questions", href: "/faq", icon: <DocumentIcon className="h-4 w-4" /> },
            { label: "Discord", href: "https://discord.gg/z2H23QgAGf", external: true, icon: <DiscordIcon className="h-4 w-4" /> },
          ]}
          onClose={() => setShowPendingInfo(false)}
        />
      ) : null}
      {protectedInfoCard ? (
        <SummaryDetailModal
          eyebrow="Protected"
          title={protectedInfoCard.name?.trim() || "Protected name"}
          paragraphs={[
            "Some names are protected because they are strongly associated with a person, organization, brand, or public identity. This review helps reduce impersonation and misleading claims.",
          ]}
          actions={[
            { label: "Frequently Asked Questions", href: "/faq", icon: <DocumentIcon className="h-4 w-4" /> },
            { label: "Discord", href: "https://discord.gg/z2H23QgAGf", external: true, icon: <DiscordIcon className="h-4 w-4" /> },
          ]}
          customActions={<AccessCodeField />}
          onClose={() => setProtectedInfoCard(null)}
        />
      ) : null}
      {activeSummary ? (
        <RenderSummaryModal
          activeSummary={activeSummary}
          shareDraftPosts={shareDraftPosts}
          onClose={() => setActiveSummary(null)}
        />
      ) : null}
      {deleteCard ? (
        <DeleteNameModal
          card={deleteCard}
          isSubmitting={isDeleteRequestSubmitting}
          errorMessage={deleteErrorMessage}
          onClose={() => {
            if (!isDeleteRequestSubmitting && !deleteCaptchaOpen) {
              setDeleteCard(null);
              setDeleteErrorMessage(null);
            }
          }}
          onConfirm={openDeleteCaptcha}
        />
      ) : null}
      <CaptchaChallengeModal
        isOpen={deleteCaptchaOpen && !!deleteCard}
        title="Confirm you're human"
        description="Complete this quick check before we email a delete confirmation link."
        confirmLabel="Send confirmation email"
        submitting={isDeleteRequestSubmitting}
        onCancel={closeDeleteCaptcha}
        onConfirm={handleCreateDeleteRequest}
      />
      {removedName ? (
        <DeleteSuccessModal name={removedName} onClose={clearDeleteSuccess} />
      ) : null}
      {celebrationCard ? (
        <ReservationCelebrationModal
          name={celebrationName}
          shareHref={celebrationXHref}
          reducedMotion={reducedMotion}
          onClose={() => setCelebrationCard(null)}
        />
      ) : null}
    </div>
  );
}
