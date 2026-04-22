"use client";

import { useEffect, useRef, useState } from "react";
import FeedbackForm from "./FeedbackForm";
import FeedbackChecklist, { initialChecklistExpansion, type SubListId } from "./FeedbackChecklist";
import { useChecklistProgress } from "@/components/hooks/useChecklistProgress";
import {
  getCurrentTesterFocus,
  getCurrentTesterName,
  signOutBetaTester,
} from "@/lib/beta/actions";
import { BETA_CHECKLIST } from "@/lib/beta/checklist";
import { COMMUNITIES } from "@/lib/zns/brand";

// Shared body for both the docked side panel (FeedbackModal) and the standalone
// popout window (/closedbeta/feedback). Same tabs, same banner, same bottom
// progress bar — only the surrounding container differs.
//
// `mode` controls the affordances in the header:
//   - "panel"  : collapse button (left), docs link, popout button
//   - "popout" : no collapse button, no popout button (we're already in it)

type Tab = "checklist" | "report";
export type TooltipStep = "popout" | "report" | "checkbox" | "readme" | "contact" | "collapse";

export interface FeedbackPanelBodyProps {
  /** Active stage from the home page network toggle. */
  stage: "testnet" | "mainnet";
  mode: "panel" | "popout";
  /** Pre-loaded tester name (server-rendered for popout, lazy for panel). */
  initialTesterName?: string | null;
  /** Pre-loaded focus areas. Same lazy/eager rule as testerName. */
  initialFocus?: ("user" | "sdk")[];
  /** Panel-mode only: collapses the side dock. */
  onClose?: () => void;
  /** Panel-mode only: current onboarding tooltip step. */
  tooltipStep?: TooltipStep | null;
  /** Advances the panel onboarding tooltip sequence. */
  onTooltipNext?: () => void;
  /** Closes the panel onboarding tooltip sequence. */
  onTooltipClose?: () => void;
  /** Restarts the panel onboarding tooltip sequence. */
  onTooltipRestart?: () => void;
}

export default function FeedbackPanelBody({
  stage,
  mode,
  initialTesterName,
  initialFocus,
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

  const [testerName, setTesterName] = useState<string | null>(initialTesterName ?? null);
  const [testerLoaded, setTesterLoaded] = useState(initialTesterName !== undefined);
  const [focus, setFocus] = useState<("user" | "sdk")[]>(initialFocus ?? []);
  const popoutTipRef = useRef<HTMLDivElement>(null);
  const collapseTipRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const readMeMenuRef = useRef<HTMLDivElement>(null);

  // Lifted out of FeedbackChecklist so it survives tab switches (the checklist
  // tab body unmounts when the user switches to Report).
  const initialExpansion = initialChecklistExpansion(initialFocus);
  const [expandedSubLists, setExpandedSubLists] = useState<Record<SubListId, boolean>>(
    initialExpansion.subLists,
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    initialExpansion.sections,
  );
  // Tracks whether the async tester data has been applied; we only sync from
  // late-loading data once, then leave the user's manual choice alone.
  const focusInitialized = useRef(initialFocus !== undefined);
  const expansionTouched = useRef(false);

  function handleToggleSubList(id: SubListId) {
    expansionTouched.current = true;
    setExpandedSubLists((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleToggleSection(section: string) {
    expansionTouched.current = true;
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  const { hydrated: progressHydrated, completed, total } = useChecklistProgress(testerName, stage);

  // Lazy hydration for panel mode (popout passes both as props server-side).
  useEffect(() => {
    if (testerLoaded) return;
    let cancelled = false;
    Promise.all([getCurrentTesterName(), getCurrentTesterFocus()])
      .then(([name, f]) => {
        if (cancelled) return;
        setTesterName(name);
        setFocus(f);
        setTesterLoaded(true);
        // Seed the expansion default exactly once, but only if the
        // user hasn't manually toggled anything yet.
        if (!focusInitialized.current) {
          focusInitialized.current = true;
          if (!expansionTouched.current) {
            const defaults = initialChecklistExpansion(f);
            setExpandedSubLists(defaults.subLists);
            setExpandedSections(defaults.sections);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setTesterLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [testerLoaded]);

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
      /* swallow — we're about to reload anyway */
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  const reportingItem = reportingItemId
    ? BETA_CHECKLIST.find((i) => i.id === reportingItemId) ?? null
    : null;

  const subline = !testerLoaded
    ? "Loading…"
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

  const contactLinks = COMMUNITIES.filter((item) =>
    item.label === "Telegram" ||
    item.label === "Signal" ||
    item.label === "Discord" ||
    item.label === "X / Twitter",
  );

  const readMeLinks = [
    { label: "Instructions", href: "/closedbeta" },
    { label: "User Guide", href: "/closedbeta#userguide" },
    { label: "Developer Guide", href: "/docs/zns-developer-guide" },
  ];

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
        <div className="mt-2 flex justify-end gap-2">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full" style={{ background: "var(--feature-card-bg)" }}>
      {/* Header */}
      {false && (
        <>
        {/* Collapse button — panel mode only */}
        {mode === "panel" && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse feedback panel"
            title="Collapse"
            className="shrink-0 rounded-lg p-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70"
            style={iconBtnStyle}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight capitalize" style={{ color: "var(--fg-heading)" }}>
            {stage} Feedback
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
            {subline}
          </p>
        </div>

        <a
          href="/closedbeta"
          target="_blank"
          rel="noopener noreferrer"
          title="Open the beta instructions in a new tab"
          aria-label="Read Me"
          className="shrink-0 rounded-lg px-2.5 py-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70 inline-flex items-center text-xs font-semibold whitespace-nowrap"
          style={{ ...iconBtnStyle, textDecoration: "none" }}
        >
          Read Me
        </a>

        {mode === "panel" && (
          <button
            type="button"
            onClick={openInNewWindow}
            title="Open in new window"
            aria-label="Open in new window"
            className="shrink-0 rounded-lg p-1.5 cursor-pointer transition-opacity hover:opacity-100 opacity-70"
            style={iconBtnStyle}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        )}
        </>
      )}

      {/* "Reporting on" banner */}
      {false && tab === "report" && reportingItem && (
        <div className="px-5 pb-3">
          {reportingItem ? (
            <div
              className="flex items-start gap-3 rounded-lg px-3 py-2.5"
              style={{
                background: "var(--color-accent-green-light)",
                border: "1px solid var(--color-accent-green)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-accent-green)" }} aria-hidden="true">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "var(--color-accent-green)" }}>
                  Reporting on
                </p>
                <p className="text-sm font-semibold leading-snug" style={{ color: "var(--fg-heading)" }}>
                  {reportingItem!.section ? `${reportingItem!.section}, ${reportingItem!.label}` : reportingItem!.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportingItemId(null)}
                aria-label="Clear linked checklist item"
                title="Clear"
                className="shrink-0 text-xl leading-none opacity-60 hover:opacity-100 cursor-pointer"
                style={{ color: "var(--fg-body)" }}
              >
                &times;
              </button>
            </div>
          ) : (
            <div
              className="flex items-start gap-3 rounded-lg px-3 py-2.5"
              style={{
                background: "var(--home-error-bg, rgba(224,82,82,0.12))",
                border: "1px solid var(--accent-red, #e05252)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent-red, #e05252)" }} aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-red, #e05252)" }}>
                  No item selected
                </p>
                <p className="text-sm leading-snug" style={{ color: "var(--fg-heading)" }}>
                  Pick a checklist item to report on.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("checklist")}
                  className="text-xs mt-1 underline cursor-pointer"
                  style={{ color: "var(--fg-body)" }}
                >
                  &larr; Open the Checklist tab
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checklist progress */}
      <div
        className="px-5 py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--faq-border)",
          background: "var(--feature-card-bg)",
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
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

      {/* Tabs */}
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

      {/* Body */}
      <div className="overflow-y-auto px-5 py-5 flex-1">
        {tab === "report" && (
          <FeedbackForm
            defaultNetwork={stage}
            checklistItem={reportingItem}
            onClearChecklistItem={() => setReportingItemId(null)}
            onOpenChecklist={() => setTab("checklist")}
          />
        )}
        {tab === "checklist" && (
          <FeedbackChecklist
            testerName={testerName}
            stage={stage}
            focus={focus}
            expandedSubLists={expandedSubLists}
            onToggleSubList={handleToggleSubList}
            expandedSections={expandedSections}
            onToggleSection={handleToggleSection}
            hideProgressBar
            onReport={handleReportItem}
            reportingItemId={reportingItemId}
            onOpenPopout={mode === "panel" ? openInNewWindow : undefined}
            tooltipStep={tooltipStep}
            onTooltipNext={onTooltipNext}
            onTooltipClose={onTooltipClose}
            tooltipActionStyle={tooltipActionStyle}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="px-5 py-3 shrink-0"
        style={{
          borderTop: "1px solid var(--faq-border)",
          background: "var(--feature-card-bg)",
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
                    <button
                      type="button"
                      onClick={onTooltipClose}
                      className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={tooltipActionStyle}
                    >
                      Close
                    </button>
                  ),
                })}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight capitalize" style={{ color: "var(--fg-heading)" }}>
              {stage} Feedback
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
              {subline}
            </p>
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
              Read Me
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
                message: "Use Read Me for instructions, guides, and these tips.",
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
                {readMeLinks.map((item) => (
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
                      borderBottom: "1px solid var(--border-muted)",
                    }}
                  >
                    {item.label}
                  </a>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setReadMeOpen(false);
                    onTooltipRestart?.();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold transition-colors hover:opacity-80 cursor-pointer"
                  style={{
                    color: "var(--fg-body)",
                    background: "transparent",
                  }}
                >
                  Show Tooltips
                </button>
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
