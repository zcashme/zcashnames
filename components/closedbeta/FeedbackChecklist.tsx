/**
 * Beta tester checklist UI. Renders a single user-experience checklist with
 * optional nested section headers. State is persisted via useChecklistProgress
 * and supports per-item reporting plus the onboarding tooltip tour.
 */
"use client";

import Link from "next/link";
import { Fragment, useMemo, type CSSProperties } from "react";
import { BETA_CHECKLIST } from "@/lib/beta/checklist";
import { useChecklistProgress, type ChecklistStage } from "@/components/hooks/useChecklistProgress";

type TooltipStep =
  | "popout"
  | "report"
  | "checkbox"
  | "wallet"
  | "readme"
  | "contact"
  | "collapse"
  | "tooltips";

interface Props {
  testerName: string | null;
  stage: ChecklistStage;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  headerAccessory?: React.ReactNode;
  hideProgressBar?: boolean;
  onReport?: (itemId: string) => void;
  reportingItemId?: string | null;
  tooltipStep?: TooltipStep | null;
  onTooltipNext?: () => void;
  onTooltipClose?: () => void;
  tooltipActionStyle?: CSSProperties;
}

export interface ChecklistExpansionDefaults {
  sections: Record<string, boolean>;
}

export function initialChecklistExpansion(): ChecklistExpansionDefaults {
  return {
    sections: { "Wallet Flows": true },
  };
}

export default function FeedbackChecklist({
  testerName,
  stage,
  expandedSections,
  onToggleSection,
  headerAccessory,
  hideProgressBar,
  onReport,
  reportingItemId,
  tooltipStep,
  onTooltipNext,
  onTooltipClose,
  tooltipActionStyle,
}: Props) {
  const { state, hydrated, completed, total, toggle, saveStatus } = useChecklistProgress(testerName, stage);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, { done: number; total: number }> = {};
    for (const item of BETA_CHECKLIST) {
      if (!item.section) continue;
      counts[item.section] ??= { done: 0, total: 0 };
      counts[item.section].total += 1;
      if (state[item.id]) counts[item.section].done += 1;
    }
    return counts;
  }, [state]);

  const visibleSectionCount = useMemo(
    () => new Set(BETA_CHECKLIST.map((item) => item.section).filter(Boolean)).size,
    [],
  );

  const tooltipBoxStyle: CSSProperties = {
    background: "var(--home-result-primary-bg)",
    border: "1px solid var(--home-result-primary-fg)",
    boxShadow: "var(--home-result-primary-shadow)",
    color: "var(--home-result-primary-fg)",
    lineHeight: 1.45,
  };

  const tooltipArrowStyle: CSSProperties = {
    background: "var(--home-result-primary-bg)",
    borderColor: "var(--home-result-primary-fg)",
  };

  const fallbackTooltipActionStyle: CSSProperties = {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid currentColor",
    color: "var(--home-result-primary-fg)",
  };

  function renderTooltip({
    message,
    positionClassName,
    arrowClassName,
  }: {
    message: string;
    positionClassName: string;
    arrowClassName: string;
  }) {
    const actionStyle = tooltipActionStyle ?? fallbackTooltipActionStyle;
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
          <button
            type="button"
            onClick={onTooltipClose}
            className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={actionStyle}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onTooltipNext}
            className="rounded-lg px-2 py-1 text-[0.68rem] font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={actionStyle}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!hideProgressBar && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
              Progress
            </p>
            <p className="text-xs" style={{ color: "var(--fg-body)" }}>
              {hydrated ? `${completed} / ${total}` : `0 / ${total}`}
            </p>
          </div>

          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--color-raised)" }}>
            <div
              className="h-full transition-[width] duration-300"
              style={{
                width: hydrated && total > 0 ? `${(completed / total) * 100}%` : "0%",
                background: "var(--color-accent-green)",
              }}
            />
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-heading)" }}>
            User experience
          </span>
          {headerAccessory}
        </div>
        <ul className="flex flex-col gap-1.5">
          {BETA_CHECKLIST.map((item, index) => {
            const checked = !!state[item.id];
            const isReporting = reportingItemId === item.id;
            const showSection =
              visibleSectionCount > 1 &&
              !!item.section &&
              item.section !== BETA_CHECKLIST[index - 1]?.section;
            const sectionExpanded = !item.section || !!expandedSections[item.section];
            const sectionCount = item.section ? sectionCounts[item.section] : undefined;
            const isGeneralFeedbackItem = item.id === "ux-e1";
            const showReportTooltip = tooltipStep === "report" && isGeneralFeedbackItem;
            const showCheckboxTooltip = tooltipStep === "checkbox" && isGeneralFeedbackItem;

            return (
              <Fragment key={item.id}>
                {showSection && (
                  <li className="pt-3 pb-1">
                    <button
                      type="button"
                      onClick={() => onToggleSection(item.section!)}
                      aria-expanded={!!expandedSections[item.section!]}
                      className="flex w-full items-center gap-2 py-1 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3 h-3 transition-transform shrink-0"
                        style={{ transform: expandedSections[item.section!] ? "rotate(0deg)" : "rotate(-90deg)" }}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span>{item.section}</span>
                      {sectionCount && (
                        <span className="text-xs ml-auto" style={{ color: "var(--fg-muted)" }}>
                          {sectionCount.done} / {sectionCount.total}
                        </span>
                      )}
                    </button>
                  </li>
                )}
                {sectionExpanded && (
                  <li
                    className={`flex items-stretch rounded-lg overflow-visible transition-colors ${item.section ? "ml-4" : ""}`}
                    style={{
                      background: isReporting
                        ? "var(--color-accent-green-light)"
                        : checked
                          ? "var(--color-raised)"
                          : "transparent",
                      border: `1px solid ${isReporting ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                    }}
                  >
                    <label
                      className="relative flex items-start shrink-0 pl-3 pr-2 py-2.5 cursor-pointer"
                      aria-label={`Mark complete: ${item.label}`}
                      onClick={(e) => e.stopPropagation()}
                      data-feedback-tour={showCheckboxTooltip ? true : undefined}
                    >
                      <span
                        className="relative flex items-center justify-center shrink-0 rounded mt-0.5"
                        style={{
                          width: 18,
                          height: 18,
                          background: checked ? "var(--color-accent-green)" : "var(--color-surface)",
                          border: `1.5px solid ${checked ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(item.id)}
                          className="absolute inset-0 opacity-0 cursor-pointer m-0"
                        />
                        {checked && (
                          <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="var(--color-background, #1a1a1a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M1 4l2.5 2.5L9 1" />
                          </svg>
                        )}
                      </span>
                      {showCheckboxTooltip &&
                        renderTooltip({
                          message: "Tap the checkbox when you complete the step.",
                          positionClassName: "left-0 top-full mt-2",
                          arrowClassName: "left-4 top-0 -translate-y-1/2 border-l border-t",
                        })}
                    </label>

                    <div
                      className="flex-1 min-w-0 px-1 py-2.5 relative"
                      onClick={() => onReport?.(item.id)}
                      role={onReport ? "button" : undefined}
                      tabIndex={onReport ? 0 : undefined}
                      aria-pressed={onReport ? isReporting : undefined}
                      aria-label={onReport ? `Report on: ${item.label}` : undefined}
                      onKeyDown={(e) => {
                        if (!onReport) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onReport(item.id);
                        }
                      }}
                      style={{ cursor: onReport ? "pointer" : "default" }}
                    >
                      {item.link ? (
                        <a
                          href={item.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm leading-snug underline cursor-pointer"
                          style={{
                            color: checked ? "var(--fg-muted)" : "var(--fg-body)",
                            textDecoration: checked ? "line-through" : "underline",
                          }}
                        >
                          <span>{item.label}</span>
                          {item.badge && <ChecklistBadgeLink itemLabel={item.label} href={item.badge.href} label={item.badge.label} />}
                        </a>
                      ) : (
                        <p
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-snug"
                          style={{
                            color: checked ? "var(--fg-muted)" : "var(--fg-body)",
                          }}
                        >
                          <span style={{ textDecoration: checked ? "line-through" : "none" }}>{item.label}</span>
                          {item.badge && <ChecklistBadgeLink itemLabel={item.label} href={item.badge.href} label={item.badge.label} />}
                        </p>
                      )}
                      {item.hint && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}>
                          {item.hint}
                        </p>
                      )}
                    </div>

                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{ width: 22 }}
                      aria-live="polite"
                    >
                      {saveStatus[item.id] === "saving" && (
                        <span
                          className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
                          style={{
                            borderColor: "var(--border-muted)",
                            borderTopColor: "var(--fg-muted)",
                          }}
                          aria-label="Saving"
                          title="Saving"
                        />
                      )}
                      {saveStatus[item.id] === "saved" && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--color-accent-green)" }}
                          aria-label="Saved"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </div>

                    {onReport && (
                      <div
                        className="relative shrink-0 flex"
                        data-feedback-tour={showReportTooltip ? true : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => onReport(item.id)}
                          aria-label={`Report on: ${item.label}`}
                          title="Report on this item"
                          aria-pressed={isReporting}
                          className="shrink-0 flex items-center justify-center px-3 cursor-pointer transition-colors"
                          style={{
                            color: isReporting ? "var(--color-accent-green)" : "var(--fg-muted)",
                            borderLeft: `1px solid ${isReporting ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (isReporting) return;
                            e.currentTarget.style.color = "var(--fg-heading)";
                            e.currentTarget.style.background = "var(--color-raised)";
                          }}
                          onMouseLeave={(e) => {
                            if (isReporting) return;
                            e.currentTarget.style.color = "var(--fg-muted)";
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                            <path d="M5 12h14" />
                            <path d="M13 6l6 6-6 6" />
                          </svg>
                        </button>
                        {showReportTooltip &&
                          renderTooltip({
                            message: "Select an item to report on.",
                            positionClassName: "right-0 top-full mt-2",
                            arrowClassName: "right-4 top-0 -translate-y-1/2 border-l border-t",
                          })}
                      </div>
                    )}
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
        Progress is saved {testerName ? "to your account and to this device" : "to this device only (sign in with your invite code to sync)"}.
      </p>
    </div>
  );
}

function ChecklistBadgeLink({
  href,
  label,
  itemLabel,
}: {
  href: string;
  label: string;
  itemLabel: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${itemLabel}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className="inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-85"
      style={{
        borderColor: "color-mix(in srgb, var(--color-accent-green) 45%, transparent)",
        color: "var(--color-accent-green)",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}
