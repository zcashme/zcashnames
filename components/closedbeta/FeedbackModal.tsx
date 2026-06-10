"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";
import FeedbackPanelBody from "./FeedbackPanelBody";

interface Props {
  network: "mainnet" | "testnet";
  initialTesterName?: string | null;
}

const PANEL_WIDTH_PX = 440;
const PANEL_BREAKPOINT_PX = 900; // below this, panel goes full-width
type TooltipStep =
  | "popout"
  | "report"
  | "checkbox"
  | "wallet"
  | "readme"
  | "contact"
  | "collapse"
  | "tooltips";

function nextTooltipStep(step: TooltipStep | null): TooltipStep | null {
  switch (step) {
    case "popout":
      return "report";
    case "report":
      return "checkbox";
    case "checkbox":
      return "wallet";
    case "wallet":
      return "readme";
    case "readme":
      return "contact";
    case "contact":
      return "collapse";
    case "collapse":
      return "tooltips";
    default:
      return null;
  }
}

function closeTooltipStep(step: TooltipStep | null): TooltipStep | null {
  if (!step || step === "tooltips") return null;
  return "tooltips";
}

export default function FeedbackModal({ network, initialTesterName }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [tooltipStep, setTooltipStep] = useState<TooltipStep | null>(null);
  const [hasShownTooltipSequence, setHasShownTooltipSequence] = useState(false);
  const proximity = usePointerProximity<HTMLButtonElement>({
    radius: 170,
    maxScaleBoost: 0.06,
    maxShadowOpacity: 0.16,
  });

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(`(min-width: ${PANEL_BREAKPOINT_PX}px)`);
    setIsWide(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!open || hasShownTooltipSequence) return;
    setHasShownTooltipSequence(true);
    setTooltipStep("popout");
  }, [open, hasShownTooltipSequence]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const stage = network;

  const primaryBtnStyle: React.CSSProperties = {
    background: "var(--home-result-primary-bg)",
    color: "var(--home-result-primary-fg)",
    boxShadow: "var(--home-result-primary-shadow)",
  };

  function openPanel() {
    setOpen(true);
  }

  return (
    <>
      {/* Floating launcher — hidden while the panel is open */}
      {!open && (
        <div
          className="fixed bottom-5 right-5 z-[9999]"
          onPointerMove={proximity.handlePointerMove}
          onPointerLeave={proximity.handlePointerLeave}
        >
          <button
            ref={(node) => proximity.register("feedback-launcher", node)}
            type="button"
            onClick={openPanel}
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-[transform,box-shadow] duration-150"
            style={{
              ...primaryBtnStyle,
              transform: "translateZ(0) scale(var(--prox-scale, 1))",
              boxShadow: "0 16px 34px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
            Submit Feedback
          </button>
        </div>
      )}

      {mounted &&
        createPortal(
          <aside
            aria-label="Beta feedback panel"
            aria-hidden={!open}
            className="fixed top-0 right-0 z-[9998]"
            style={{
              height: "100dvh",
              width: isWide ? `${PANEL_WIDTH_PX}px` : "100vw",
              background: "var(--color-background, #0f1115)",
              borderLeft: "1px solid var(--faq-border)",
              boxShadow: "-12px 0 32px rgba(0,0,0,0.35)",
              transform: open ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            <FeedbackPanelBody
              mode="panel"
              stage={stage}
              initialTesterName={initialTesterName}
              onClose={() => setOpen(false)}
              tooltipStep={tooltipStep}
              onTooltipNext={() => setTooltipStep((step) => nextTooltipStep(step))}
              onTooltipClose={() => setTooltipStep((step) => closeTooltipStep(step))}
              onTooltipRestart={() => setTooltipStep("popout")}
            />
          </aside>,
          document.body,
        )}
    </>
  );
}
