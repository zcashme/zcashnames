/**
 * Shared body for both the docked side panel and the standalone popout window.
 * Contains the Checklist and Report tabs, a top progress bar, and bottom
 * controls for wallet selection, docs, contact, and sign-out.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FeedbackForm from "./FeedbackForm";
import FeedbackChecklist, { initialChecklistExpansion } from "./FeedbackChecklist";
import { useChecklistProgress } from "@/components/hooks/useChecklistProgress";
import {
  getCurrentTesterName,
  getCurrentTesterPreferredWalletVariantId,
  signOutBetaTester,
} from "@/lib/beta/actions";
import { BETA_CHECKLIST } from "@/lib/beta/checklist";
import {
  hasWalletFaq,
} from "@/lib/beta/walletFaq";
import { resolveWalletDownloadHref } from "@/lib/beta/wallet-selection";
import {
  getWalletBrand,
  getWalletVariant,
  subcategoryLabel,
  WALLET_VARIANTS,
  type WalletVariantId,
} from "@/lib/wallets/catalog";
import { COMMUNITIES } from "@/lib/zns/brand";

type Tab = "checklist" | "report";
export type TooltipStep =
  | "popout"
  | "report"
  | "checkbox"
  | "wallet"
  | "readme"
  | "contact"
  | "collapse"
  | "tooltips";

export interface FeedbackPanelBodyProps {
  stage: "testnet" | "mainnet";
  mode: "panel" | "popout";
  initialTesterName?: string | null;
  onClose?: () => void;
  tooltipStep?: TooltipStep | null;
  onTooltipNext?: () => void;
  onTooltipClose?: () => void;
  onTooltipRestart?: () => void;
}

function walletSummary(variantId: WalletVariantId | null): string {
  if (!variantId) return "Wallet";
  const variant = getWalletVariant(variantId);
  if (!variant) return "Wallet";
  return `${variant.displayName} / ${subcategoryLabel(variant.subcategory)}`;
}

function walletFieldValue(variantId: WalletVariantId | null): string {
  if (!variantId) return "";
  const variant = getWalletVariant(variantId);
  if (!variant) return "";
  return `${variant.displayName} on ${subcategoryLabel(variant.subcategory)}`;
}

function resolveWalletFaqLink(variantId: WalletVariantId | null): { label: string; href: string } | null {
  if (!variantId) return null;
  const variant = getWalletVariant(variantId);
  if (!variant || !hasWalletFaq(variant.brandSlug)) return null;

  return {
    label: `${variant.displayName} FAQ`,
    href: `/beta/${variant.brandSlug}/faq`,
  };
}

export default function FeedbackPanelBody({
  stage,
  mode,
  initialTesterName,
  onClose,
  tooltipStep,
  onTooltipNext,
  onTooltipClose,
  onTooltipRestart,
}: FeedbackPanelBodyProps) {
  const [tab, setTab] = useState<Tab>("checklist");
  const [reportingItemId, setReportingItemId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [readMeOpen, setReadMeOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const [testerName, setTesterName] = useState<string | null>(initialTesterName ?? null);
  const [testerLoaded, setTesterLoaded] = useState(initialTesterName !== undefined);
  const [selectedWalletVariantId, setSelectedWalletVariantId] = useState<WalletVariantId | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    initialChecklistExpansion().sections,
  );

  const popoutTipRef = useRef<HTMLDivElement>(null);
  const collapseTipRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const readMeMenuRef = useRef<HTMLDivElement>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  const { hydrated: progressHydrated, completed, total } = useChecklistProgress(testerName, stage);

  useEffect(() => {
    if (testerLoaded && selectedWalletVariantId !== null) return;
    let cancelled = false;
    Promise.all([getCurrentTesterName(), getCurrentTesterPreferredWalletVariantId()])
      .then(([name, preferredWallet]) => {
        if (cancelled) return;
        setTesterName(name);
        setSelectedWalletVariantId(preferredWallet);
        setTesterLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setTesterLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWalletVariantId, testerLoaded]);

  useEffect(() => {
    if (!contactOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && contactMenuRef.current?.contains(target)) return;
      setContactOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [contactOpen]);

  useEffect(() => {
    if (!readMeOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && readMeMenuRef.current?.contains(target)) return;
      setReadMeOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [readMeOpen]);

  useEffect(() => {
    if (!walletOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && walletMenuRef.current?.contains(target)) return;
      setWalletOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [walletOpen]);

  function handleToggleSection(section: string) {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function handleReportItem(itemId: string) {
    setReportingItemId(itemId);
    setTab("report");
  }

  function openInNewWindow() {
    if (typeof window === "undefined") return;
    const features = "width=560,height=860,menubar=no,toolbar=no,location=no,status=no";
    window.open("/closedbeta/feedback", "zns-beta-feedback", features);
    onTooltipClose?.();
    onClose?.();
  }

  function collapsePanel() {
    onTooltipClose?.();
    onClose?.();
  }

  async function handleSignOut() {
    try {
      await signOutBetaTester();
    } catch {
      // We reload regardless.
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  const reportingItem = reportingItemId
    ? BETA_CHECKLIST.find((item) => item.id === reportingItemId) ?? null
    : null;

  const headerLabel = !testerLoaded
    ? "Loading..."
    : testerName
      ? (
          <>
            Submitting as <strong style={{ color: "var(--fg-body)" }}>{testerName}</strong>
            {" · "}
            <button
              type="button"
              onClick={handleSignOut}
              className="underline cursor-pointer"
              style={{ color: "var(--fg-muted)", background: "transparent" }}
            >
              Sign out
            </button>
          </>
        )
      : <>Submitting <strong style={{ color: "var(--fg-body)" }}>anonymously</strong>.</>;
  const headerTitle = !testerLoaded ? "Loading..." : testerName ?? "Anonymous";

  const tabBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: "0.6rem 0",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    background: "transparent",
    color: "var(--fg-muted)",
    borderBottom: "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  };

  const tabActiveStyle: React.CSSProperties = {
    ...tabBaseStyle,
    color: "var(--fg-heading)",
    borderBottom: "2px solid var(--fg-heading)",
  };

  const iconBtnStyle: React.CSSProperties = {
    color: "var(--fg-body)",
    background: "var(--color-raised)",
    border: "1px solid var(--border-muted)",
  };

  const selectedWalletStyle: React.CSSProperties = selectedWalletVariantId
    ? iconBtnStyle
    : {
        ...iconBtnStyle,
        border: "1px solid var(--accent-red, #e05252)",
      };

  const contactLinks = COMMUNITIES.filter((item) =>
    item.label === "Telegram" ||
    item.label === "Signal" ||
    item.label === "Discord" ||
    item.label === "X / Twitter",
  );

  const readMeLinks = [
    { label: "Beta Instructions", href: "/beta/instructions" },
    { label: "Developer Guide", href: "/docs/zns-developer-guide" },
    { label: "Beta Overview", href: "/beta" },
  ];

  const sortedWalletVariants = useMemo(
    () =>
      [...WALLET_VARIANTS].sort((a, b) => {
        const byName = a.displayName.localeCompare(b.displayName);
        if (byName !== 0) return byName;
        return a.sortOrder - b.sortOrder;
      }),
    [],
  );
  const walletDownloadHref = resolveWalletDownloadHref(selectedWalletVariantId);
  const walletFaqLink = resolveWalletFaqLink(selectedWalletVariantId);

  const tooltipBoxStyle: React.CSSProperties = {
    background: "var(--home-result-primary-bg)",
    border: "1px solid var(--home-result-primary-fg)",
    boxShadow: "var(--home-result-primary-shadow)",
    color: "var(--home-result-primary-fg)",
    lineHeight: 1.45,
  };

  const tooltipArrowStyle: React.CSSProperties = {
    background: "var(--home-result-primary-bg)",
    borderColor: "var(--home-result-primary-fg)",
  };

  const tooltipActionStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid currentColor",
    color: "var(--home-result-primary-fg)",
  };

  function renderTooltip({
    message,
    positionClassName,
    arrowClassName,
    children,
  }: {
    message: string;
    positionClassName: string;
    arrowClassName: string;
    children: React.ReactNode;
  }) {
    return (
      <div
        role="status"
        data-feedback-tour
        className={`absolute z-20 w-60 rounded-lg px-3 py-2 text-xs shadow-lg transition-opacity duration-200 ${positionClassName}`}
        style={tooltipBoxStyle}
      >
        <span
          aria-hidden="true"
          className={`absolute h-3 w-3 rotate-45 ${arrowClassName}`}
          style={tooltipArrowStyle}
        />
        <p className="pr-1">{message}</p>
        <div className="mt-2 flex justify-end gap-2">{children}</div>
      </div>
    );
  }

  function toggleTooltips() {
    if (tooltipStep) {
      onTooltipClose?.();
      return;
    }
    onTooltipRestart?.();
  }

  const walletMenu = (
    <div className="flex items-center gap-2">
      <div ref={walletMenuRef} className="relative shrink-0" data-feedback-tour={tooltipStep === "wallet" ? true : undefined}>
        <button
          type="button"
          onClick={() => setWalletOpen((open) => !open)}
          aria-expanded={walletOpen}
          aria-haspopup="menu"
          className="rounded-lg px-2.5 py-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-90 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
          style={selectedWalletStyle}
        >
          {walletSummary(selectedWalletVariantId)}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 transition-transform"
            style={{ transform: walletOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {tooltipStep === "wallet" &&
          renderTooltip({
            message: "Select the wallet you are using. Change anytime.",
            positionClassName: "right-0 top-full mt-2",
            arrowClassName: "right-5 top-0 -translate-y-1/2 border-l border-t",
            children: (
              <>
                <button
                  type="button"
                  onClick={onTooltipClose}
                  className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={tooltipActionStyle}
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={onTooltipNext}
                  className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={tooltipActionStyle}
                >
                  Next
                </button>
              </>
            ),
          })}
        {walletOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-2 w-56 max-h-80 overflow-y-auto rounded-lg shadow-lg"
            style={{
              background: "var(--color-raised)",
              border: "1px solid var(--border-muted)",
            }}
          >
            {sortedWalletVariants.map((variant) => {
              const active = selectedWalletVariantId === variant.variantId;
              return (
                <button
                  key={variant.variantId}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setSelectedWalletVariantId(variant.variantId);
                    setWalletOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold transition-colors hover:opacity-80 cursor-pointer"
                  style={{
                    color: active ? "var(--fg-heading)" : "var(--fg-body)",
                    background: active ? "var(--feature-card-bg)" : "transparent",
                    borderBottom: "1px solid var(--border-muted)",
                  }}
                >
                  {variant.displayName}
                  <span className="block text-[0.68rem] font-normal" style={{ color: "var(--fg-muted)" }}>
                    {subcategoryLabel(variant.subcategory)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {walletDownloadHref ? (
        <a
          href={walletDownloadHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-2.5 py-1.5 transition-opacity hover:opacity-100 opacity-90 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
          style={iconBtnStyle}
          aria-label="Download wallet"
          title="Download wallet"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 3v11" />
            <path d="m7 10 5 4.5 5-4.5" />
            <path d="M4 18v3h16v-3" />
          </svg>
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-not-allowed"
          style={{
            ...iconBtnStyle,
            opacity: 0.45,
          }}
          aria-label="Download unavailable"
          title="Download unavailable"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 3v11" />
            <path d="m7 10 5 4.5 5-4.5" />
            <path d="M4 18v3h16v-3" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full" style={{ background: "var(--color-background, #0f1115)" }}>
      <div
        className="px-5 py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--faq-border)",
          background: "var(--color-background, #0f1115)",
        }}
      >
        <div className="flex items-center gap-3">
          {mode === "panel" && (
            <div ref={popoutTipRef} className="relative shrink-0">
              <button
                type="button"
                onClick={openInNewWindow}
                title="Open in new window"
                aria-label="Open in new window"
                className="rounded-lg p-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70"
                style={iconBtnStyle}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                  style={{ transform: "scaleX(-1)" }}
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              {tooltipStep === "popout" &&
                renderTooltip({
                  message: "Open feedback in a new window for more room while testing.",
                  positionClassName: "left-0 top-full mt-2",
                  arrowClassName: "left-2 top-0 -translate-y-1/2 border-l border-t",
                  children: (
                    <>
                      <button
                        type="button"
                        onClick={onTooltipClose}
                        className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={tooltipActionStyle}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={onTooltipNext}
                        className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={tooltipActionStyle}
                      >
                        Next
                      </button>
                    </>
                  ),
                })}
            </div>
          )}
          <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "var(--color-raised)" }}>
            <div
              className="h-full transition-[width] duration-300"
              style={{
                width: progressHydrated && total > 0 ? `${(completed / total) * 100}%` : "0%",
                background: "var(--color-accent-green)",
              }}
            />
          </div>
          <p className="text-xs shrink-0 tabular-nums" style={{ color: "var(--fg-body)" }}>
            {progressHydrated ? `${completed} / ${total}` : `0 / ${total}`}
          </p>
        </div>
      </div>

      <div className="flex px-5" style={{ borderBottom: "1px solid var(--faq-border)" }}>
        <button
          type="button"
          onClick={() => setTab("checklist")}
          style={tab === "checklist" ? tabActiveStyle : tabBaseStyle}
        >
          Checklist
        </button>
        <button
          type="button"
          onClick={() => setTab("report")}
          style={tab === "report" ? tabActiveStyle : tabBaseStyle}
        >
          Report
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-5 flex-1">
        {tab === "report" && (
          <FeedbackForm
            defaultNetwork={stage}
            checklistItem={reportingItem}
            onClearChecklistItem={() => setReportingItemId(null)}
            onOpenChecklist={() => setTab("checklist")}
            initialWallet={walletFieldValue(selectedWalletVariantId)}
            walletVariantId={selectedWalletVariantId}
          />
        )}
        {tab === "checklist" && (
          <FeedbackChecklist
            testerName={testerName}
            stage={stage}
            expandedSections={expandedSections}
            onToggleSection={handleToggleSection}
            headerAccessory={walletMenu}
            hideProgressBar
            onReport={handleReportItem}
            reportingItemId={reportingItemId}
            tooltipStep={tooltipStep}
            onTooltipNext={onTooltipNext}
            onTooltipClose={onTooltipClose}
            tooltipActionStyle={tooltipActionStyle}
          />
        )}
      </div>

      <div
        className="px-5 py-3 shrink-0"
        style={{
          borderTop: "1px solid var(--faq-border)",
          background: "var(--color-background, #0f1115)",
        }}
      >
        <div className="flex items-start gap-3">
          {mode === "panel" && onClose && (
            <div ref={collapseTipRef} className="relative shrink-0">
              <button
                type="button"
                onClick={collapsePanel}
                aria-label="Collapse feedback panel"
                title="Collapse"
                className="rounded-lg p-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70"
                style={iconBtnStyle}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
              {tooltipStep === "collapse" &&
                renderTooltip({
                  message: "Collapse the panel when you want to get back to the page.",
                  positionClassName: "bottom-full left-0 mb-2",
                  arrowClassName: "bottom-0 left-2 translate-y-1/2 border-b border-r",
                  children: (
                    <>
                      <button
                        type="button"
                        onClick={onTooltipClose}
                        className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={tooltipActionStyle}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={onTooltipNext}
                        className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={tooltipActionStyle}
                      >
                        Next
                      </button>
                    </>
                  ),
                })}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight" style={{ color: "var(--fg-heading)" }}>
              {headerTitle}
            </h2>
            {testerLoaded && testerName && (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs mt-0.5 underline cursor-pointer"
                style={{ color: "var(--fg-muted)", background: "transparent" }}
              >
                Sign out
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={toggleTooltips}
              aria-pressed={tooltipStep ? true : undefined}
              aria-label={tooltipStep ? "Hide tooltips" : "Show tooltips"}
              title={tooltipStep ? "Hide tooltips" : "Show tooltips"}
              className="rounded-lg p-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70"
              style={iconBtnStyle}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1 1.2 1.8h5.6c.2-.8.6-1.4 1.2-1.8A7 7 0 0 0 12 2Z" />
              </svg>
            </button>
            {tooltipStep === "tooltips" &&
              renderTooltip({
                message: "Use this lightbulb to show the tooltips again anytime.",
                positionClassName: "bottom-full right-0 mb-2",
                arrowClassName: "bottom-0 right-2 translate-y-1/2 border-b border-r",
                children: (
                  <button
                    type="button"
                    onClick={onTooltipClose}
                    className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                    style={tooltipActionStyle}
                  >
                    Okay
                  </button>
                ),
              })}
          </div>

          <div ref={readMeMenuRef} className="relative shrink-0" data-feedback-tour={tooltipStep === "readme" ? true : undefined}>
            <button
              type="button"
              onClick={() => setReadMeOpen((open) => !open)}
              aria-expanded={readMeOpen}
              aria-haspopup="menu"
              className="rounded-lg px-2.5 py-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
              style={iconBtnStyle}
            >
              Read
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 transition-transform"
                style={{ transform: readMeOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {tooltipStep === "readme" &&
              renderTooltip({
                message: "Use Read for instructions, beta details, wallet FAQs, and the developer guide.",
                positionClassName: "bottom-full right-0 mb-2",
                arrowClassName: "bottom-0 right-5 translate-y-1/2 border-b border-r",
                children: (
                  <>
                    <button
                      type="button"
                      onClick={onTooltipClose}
                      className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={tooltipActionStyle}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={onTooltipNext}
                      className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={tooltipActionStyle}
                    >
                      Next
                    </button>
                  </>
                ),
              })}
            {readMeOpen && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-2 w-44 overflow-hidden rounded-lg shadow-lg"
                style={{
                  background: "var(--color-raised)",
                  border: "1px solid var(--border-muted)",
                }}
              >
                <a
                  href="/beta/wallets"
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setReadMeOpen(false)}
                  className="block px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{
                    color: "var(--fg-body)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--border-muted)",
                  }}
                >
                  Wallet Guide
                </a>
                {walletFaqLink && (
                  <a
                    href={walletFaqLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setReadMeOpen(false)}
                    className="block px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                      color: "var(--fg-body)",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--border-muted)",
                    }}
                  >
                    {walletFaqLink.label}
                  </a>
                )}
                {readMeLinks.map((item, index, items) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setReadMeOpen(false)}
                    className="block px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                      color: "var(--fg-body)",
                      textDecoration: "none",
                      borderBottom: index === items.length - 1 ? "none" : "1px solid var(--border-muted)",
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div ref={contactMenuRef} className="relative shrink-0" data-feedback-tour={tooltipStep === "contact" ? true : undefined}>
            <button
              type="button"
              onClick={() => setContactOpen((open) => !open)}
              aria-expanded={contactOpen}
              aria-haspopup="menu"
              className="rounded-lg px-2.5 py-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
              style={iconBtnStyle}
            >
              Contact
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 transition-transform"
                style={{ transform: contactOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {tooltipStep === "contact" &&
              renderTooltip({
                message: "Use Contact to reach us on Telegram, Signal, Discord, or X.",
                positionClassName: "bottom-full right-0 mb-2",
                arrowClassName: "bottom-0 right-5 translate-y-1/2 border-b border-r",
                children: (
                  <>
                    <button
                      type="button"
                      onClick={onTooltipClose}
                      className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={tooltipActionStyle}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={onTooltipNext}
                      className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={tooltipActionStyle}
                    >
                      Next
                    </button>
                  </>
                ),
              })}
            {contactOpen && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-2 w-40 overflow-hidden rounded-lg shadow-lg"
                style={{
                  background: "var(--color-raised)",
                  border: "1px solid var(--border-muted)",
                }}
              >
                {contactLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    onClick={() => setContactOpen(false)}
                    className="block px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                      color: "var(--fg-body)",
                      textDecoration: "none",
                      borderBottom: item === contactLinks[contactLinks.length - 1] ? "none" : "1px solid var(--border-muted)",
                    }}
                  >
                    {item.label === "X / Twitter" ? "X" : item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
