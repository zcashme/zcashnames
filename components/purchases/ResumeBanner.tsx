"use client";

import { useEffect, useMemo, useState } from "react";
import type { Phase, ScanState } from "@/lib/types";
import type { ResumeSnapshot } from "@/lib/purchases/resume";
import {
  NameBadge,
  minedMessage,
  modalDescription,
  phaseHeader,
  progressFillForPhase,
  scanningStatusMessage,
  settlingStatusMessage,
} from "@/components/purchases/modalCopy";

type BannerState = {
  step?: number;
  address?: string;
  price?: string;
  priceInput?: string;
  settleState?: ScanState;
};

const FALLBACK_PHASES: Phase[] = ["input", "confirm", "scanning", "fund", "settling"];

function stateOf(snap: ResumeSnapshot): BannerState {
  return (snap.state ?? {}) as BannerState;
}

function settleStateOf(snap: ResumeSnapshot): ScanState {
  return stateOf(snap).settleState ?? "not_detected";
}

function isCompleteSnapshot(snap: ResumeSnapshot): boolean {
  if (snap.phase === "settling") return settleStateOf(snap) === "mined";
  return snap.phase === "scanning" && snap.action !== "BUY" && snap.scanState === "mined";
}

function explorerHref(snap: ResumeSnapshot): string {
  return snap.network === "testnet"
    ? `/explorer?env=testnet&name=${encodeURIComponent(snap.name)}`
    : `/explorer?name=${encodeURIComponent(snap.name)}`;
}

function progressClipPath(i: number, n: number): string {
  if (n <= 1) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  if (i === 0) return "polygon(0 0, calc(100% - 5px) 0, 100% 100%, 0 100%)";
  if (i === n - 1) return "polygon(0 0, 100% 0, 100% 100%, 5px 100%)";
  return "polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%)";
}

function CompactProgress({ snapshot, complete }: { snapshot: ResumeSnapshot; complete: boolean }) {
  const phases = useMemo(() => {
    const saved = snapshot.phases?.filter(Boolean);
    if (saved?.length) return saved;
    const phaseSet = new Set<Phase>(FALLBACK_PHASES);
    phaseSet.add(snapshot.phase);
    return Array.from(phaseSet);
  }, [snapshot.phase, snapshot.phases]);

  const stateStep = stateOf(snapshot).step;
  const phaseIndex = phases.indexOf(snapshot.phase);
  const activeIndex = complete
    ? phases.length - 1
    : phaseIndex >= 0
      ? phaseIndex
      : typeof stateStep === "number"
        ? Math.max(0, Math.min(stateStep, phases.length - 1))
        : 0;

  return (
    <div className="flex min-w-[7rem] shrink-0 justify-end" aria-label={`Progress step ${activeIndex + 1} of ${phases.length}`}>
      <div className="flex max-w-full items-center gap-[3px]">
        {phases.map((step, i) => {
          const fill = complete ? 1 : progressFillForPhase(step, i, activeIndex, snapshot.scanState);
          const borderColor = fill > 0 || i === activeIndex ? "var(--fg-heading)" : "var(--border-muted)";
          return (
            <span
              key={`${step}-${i}`}
              className="relative block h-2 w-5 overflow-hidden sm:w-6"
              style={{
                clipPath: progressClipPath(i, phases.length),
                background: "transparent",
                border: `1px solid ${borderColor}`,
                transition: "border-color 450ms ease, background-color 450ms ease",
              }}
            >
              <span
                className="absolute inset-y-0 left-0 block"
                style={{
                  width: `${fill * 100}%`,
                  background: "var(--fg-heading)",
                  transition: "width 450ms ease, background-color 450ms ease",
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function LoadingEllipsis({ active }: { active: boolean }) {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setDotCount((current) => (current + 1) % 4);
    }, 450);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;
  return (
    <span className="inline-block w-[1.5em] text-left" aria-hidden="true">
      {".".repeat(dotCount)}
    </span>
  );
}

interface ResumeBannerProps {
  snapshot: ResumeSnapshot;
  hiddenByFullModal?: boolean;
  onResume: () => void;
  onDismiss: () => void;
}

export default function ResumeBanner({ snapshot, hiddenByFullModal = false, onResume, onDismiss }: ResumeBannerProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const snapshotState = stateOf(snapshot);
  const header =
    snapshot.phase === "input"
      ? <>{phaseHeader(snapshot.action, snapshot.phase)} <NameBadge name={snapshot.name} /></>
      : phaseHeader(snapshot.action, snapshot.phase);
  const isComplete = isCompleteSnapshot(snapshot);
  const isConfirm = snapshot.phase === "confirm";
  const description = isComplete
    ? minedMessage(snapshot.action === "BUY" ? "BUY" : snapshot.action, snapshot.name, snapshotState.address)
    : modalDescription(snapshot.action, snapshot.phase, snapshot.name, snapshotState);
  const copyIncludesName =
    isComplete ||
    snapshot.phase === "unlock" ||
    snapshot.phase === "input" ||
    snapshot.phase === "sign" ||
    snapshot.phase === "fund" ||
    snapshot.phase === "scanning";
  const showStandaloneName = !copyIncludesName;
  const statusDetail =
    snapshot.phase === "scanning" && !isComplete
      ? scanningStatusMessage(snapshot.action, snapshot.scanState)
      : snapshot.phase === "settling" && !isComplete
        ? settlingStatusMessage(snapshot.action, settleStateOf(snapshot))
        : null;
  const clearWarning = isConfirm
    ? "Removes this prepared request. Sent payments cannot be undone."
    : "Payment processing, if any, cannot be cancelled. Tap to confirm.";

  function handleClear() {
    if (!confirmingClear) { setConfirmingClear(true); return; }
    setConfirmingClear(false);
    onDismiss();
  }

  return (
    <div
      className="fixed bottom-5 left-5 z-[9998] w-[min(calc(100vw-2.5rem),28rem)] rounded-2xl border px-4 py-3 sm:px-5 sm:py-4"
      style={{
        background: "var(--leaders-card-bg-solid, var(--leaders-card-bg, var(--feature-card-bg)))",
        borderColor: "var(--leaders-card-border, var(--faq-border))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
        opacity: hiddenByFullModal ? 0 : 1,
        pointerEvents: hiddenByFullModal ? "none" : "auto",
        transform: hiddenByFullModal ? "translateY(1rem)" : "translateY(0)",
        transition: "opacity 320ms ease, transform 320ms ease",
      }}
      aria-hidden={hiddenByFullModal ? "true" : undefined}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span
              className="min-w-0 text-left text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
              style={{ color: isComplete ? "var(--home-result-status-positive-fg, #9de7cd)" : "var(--fg-muted)" }}
            >
              {header}
              <LoadingEllipsis active={!isComplete} />
            </span>
            {showStandaloneName && (
              <span className="shrink-0 text-right text-sm font-semibold text-fg-heading">
                <NameBadge name={snapshot.name} />
              </span>
            )}
          </div>
          <div className="h-px w-full" style={{ background: "var(--leaders-card-border, var(--faq-border))" }} />
          <div className="flex min-w-0 flex-col gap-1 text-left">
            <p className="m-0 text-sm" style={{ color: "var(--fg-muted)" }}>{description}</p>
            {statusDetail && (
              <p className="m-0 text-sm" style={{ color: "var(--fg-muted)" }}>{statusDetail}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <CompactProgress snapshot={snapshot} complete={isComplete} />
          {isComplete ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href={explorerHref(snapshot)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border-muted)",
                  color: "var(--fg-body)",
                  textDecoration: "none",
                }}
              >
                View on Explorer
              </a>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
              >
                {isConfirm ? "Abandon" : "Ignore"}
              </button>
              <button
                type="button"
                onClick={onResume}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                {isConfirm ? "Resume" : "Watch"}
              </button>
            </div>
          )}
        </div>

        {!isComplete && confirmingClear && (
          <>
            <div className="h-px w-full" style={{ background: "var(--leaders-card-border, var(--faq-border))" }} />
            <p
              className="m-0 text-right text-sm font-medium leading-relaxed"
              style={{ color: "var(--home-result-status-negative-fg, #ff8a8a)" }}
            >
              {clearWarning}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
