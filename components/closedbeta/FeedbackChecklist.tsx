"use client";

import { Fragment, useMemo, type CSSProperties } from "react";
import { BETA_CHECKLIST, type ChecklistItem } from "@/lib/beta/checklist";
import { useChecklistProgress, type ChecklistStage } from "./useChecklistProgress";

export type SubListId = "user" | "developer";
type TooltipStep = "popout" | "report" | "checkbox" | "readme" | "contact" | "collapse";

interface Props {
  /** Current tester's display name, or null if anonymous. */
  testerName: string | null;
  /** Active beta stage — testnet/mainnet progress is tracked separately. */
  stage: ChecklistStage;
  /** Tester's stated focus areas from beta_testers.focus_areas. Drives ordering. */
  focus?: ("user" | "sdk")[];
  /** Which sub-lists are currently expanded. Owned by the parent so state survives tab switches. */
  expandedSubLists: Record<SubListId, boolean>;
  /** Called when the user clicks a sub-list header. Parent decides accordion behavior. */
  onToggleSubList: (id: SubListId) => void;
  /** Expanded state for nested section headers. Owned by the parent so it survives tab switches. */
  expandedSections: Record<string, boolean>;
  /** Called when the user clicks a nested section header. */
  onToggleSection: (section: string) => void;
  /** Hide the inline progress bar (e.g. when a parent renders one above the tabs). */
  hideProgressBar?: boolean;
  /** Called when the user clicks the per-item report arrow. */
  onReport?: (itemId: string) => void;
  /** ID of the item currently linked to the active report, if any. */
  reportingItemId?: string | null;
  /** Open the standalone popout window. Hidden in popout mode (parent passes undefined). */
  onOpenPopout?: () => void;
  /** Current panel onboarding tooltip step. */
  tooltipStep?: TooltipStep | null;
  /** Advances the panel onboarding tooltip sequence. */
  onTooltipNext?: () => void;
  /** Closes the panel onboarding tooltip sequence. */
  onTooltipClose?: () => void;
  /** Shared tooltip button style from the parent panel. */
  tooltipActionStyle?: CSSProperties;
}

interface SubListDef {
  id: SubListId;
  label: string;
  items: ChecklistItem[];
}

const USER_ITEMS = BETA_CHECKLIST.filter((i) => i.group === "user" || i.group === "both");
const DEV_ITEMS = BETA_CHECKLIST.filter((i) => i.group === "developer" || i.group === "both");

export interface ChecklistExpansionDefaults {
  subLists: Record<SubListId, boolean>;
  sections: Record<string, boolean>;
}

/** Pure helper: which checklist groups and nested sections should start expanded. */
export function initialChecklistExpansion(focus?: ("user" | "sdk")[]): ChecklistExpansionDefaults {
  const sdkOnly = focus?.length === 1 && focus[0] === "sdk";
  if (sdkOnly) {
    return {
      subLists: { user: false, developer: true },
      sections: {},
    };
  }

  return {
    subLists: { user: true, developer: false },
    sections: { "Passcode Authorization": true },
  };
}

export default function FeedbackChecklist({
  testerName,
  stage,
  focus,
  expandedSubLists,
  onToggleSubList,
  expandedSections,
  onToggleSection,
  hideProgressBar,
  onReport,
  reportingItemId,
  onOpenPopout,
  tooltipStep,
  onTooltipNext,
  onTooltipClose,
  tooltipActionStyle,
}: Props) {
  const { state, hydrated, completed, total, toggle, saveStatus } = useChecklistProgress(testerName, stage);

  // Derive ordering from focus. SDK-only testers see Developer first.
  // The "both" items appear in BOTH sub-lists but share state via item.id —
  // ticking one instance updates the other immediately.
  const sdkOnly = focus?.length === 1 && focus[0] === "sdk";
  const subLists: SubListDef[] = sdkOnly
    ? [
        { id: "developer", label: "Developer experience", items: DEV_ITEMS },
        { id: "user", label: "User experience", items: USER_ITEMS },
      ]
    : [
        { id: "user", label: "User experience", items: USER_ITEMS },
        { id: "developer", label: "Developer experience", items: DEV_ITEMS },
      ];

  // Per-sublist counts for the chevron header.
  const subListCounts = useMemo(() => {
    const counts: Record<SubListId, { done: number; total: number }> = {
      user: { done: 0, total: 0 },
      developer: { done: 0, total: 0 },
    };
    for (const item of USER_ITEMS) {
      counts.user.total += 1;
      if (state[item.id]) counts.user.done += 1;
    }
    for (const item of DEV_ITEMS) {
      counts.developer.total += 1;
      if (state[item.id]) counts.developer.done += 1;
    }
    return counts;
  }, [state]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, { done: number; total: number }> = {};
    for (const item of USER_ITEMS) {
      if (!item.section) continue;
      counts[item.section] ??= { done: 0, total: 0 };
      counts[item.section].total += 1;
      if (state[item.id]) counts[item.section].done += 1;
    }
    return counts;
  }, [state]);

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

      <div className="flex flex-col gap-3">
        {subLists.map((sub, index) => {
          const isOpen = !!expandedSubLists[sub.id];
          const counts = subListCounts[sub.id];
          return (
            <Fragment key={sub.id}>
              {index > 0 && (
                <div
                  className="my-1"
                  style={{ borderTop: "1px solid var(--faq-border)" }}
                  aria-hidden="true"
                />
              )}
              <section>
              <button
                type="button"
                onClick={() => onToggleSubList(sub.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 py-2 cursor-pointer transition-opacity hover:opacity-80"
                style={{ color: "var(--fg-muted)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 transition-transform shrink-0"
                  style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-heading)" }}>
                  {sub.label}
                </span>
                <span className="text-xs ml-auto" style={{ color: "var(--fg-muted)" }}>
                  {counts.done} / {counts.total}
                </span>
              </button>

              {isOpen && (
                <ul className="flex flex-col gap-1.5 mt-2">
                  {sub.items.map((item, index) => {
                    const checked = !!state[item.id];
                    const isReporting = reportingItemId === item.id;
                    const showSection = !!item.section && item.section !== sub.items[index - 1]?.section;
                    const sectionExpanded = !item.section || !!expandedSections[item.section];
                    const sectionCount = item.section ? sectionCounts[item.section] : undefined;
                    const isGeneralFeedbackItem = sub.id === "user" && item.id === "ux-e1";
                    const showReportTooltip = tooltipStep === "report" && isGeneralFeedbackItem;
                    const showCheckboxTooltip = tooltipStep === "checkbox" && isGeneralFeedbackItem;
                    return (
                      <Fragment key={`${sub.id}-${item.id}`}>
                        {showSection && (
                          <li className="pt-3 first:pt-0 pb-1">
                            <button
                              type="button"
                              onClick={() => onToggleSection(item.section!)}
                              aria-expanded={!!expandedSections[item.section!]}
                              className="flex w-full items-center gap-2 pl-4 pr-2 py-1 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
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
                                <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
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
                        {/* Checkbox — own clickable area, only marks complete */}
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

                        {/* Label area — clicking activates "Reporting on" for this item. */}
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
                              {item.label}
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          ) : (
                            <p
                              className="text-sm leading-snug"
                              style={{
                                color: checked ? "var(--fg-muted)" : "var(--fg-body)",
                                textDecoration: checked ? "line-through" : "none",
                              }}
                            >
                              {item.label}
                            </p>
                          )}
                          {item.hint && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}>
                              {item.hint}
                            </p>
                          )}
                        </div>

                        {/* Per-item save indicator */}
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
              )}
              </section>
            </Fragment>
          );
        })}
      </div>

      <p className="text-xs text-center" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
        Progress is saved {testerName ? "to your account and to this device" : "to this device only (sign in with your invite code to sync)"}.
      </p>
    </div>
  );
}
