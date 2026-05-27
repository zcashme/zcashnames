"use client";

import { ACTION_LABELS } from "@/lib/types";
import type { ResumeSnapshot } from "@/lib/purchases/resume";

interface ResumeReplacementDialogProps {
  existing: ResumeSnapshot;
  onCancel: () => void;
  onContinue: () => void;
}

export default function ResumeReplacementDialog({
  existing,
  onCancel,
  onContinue,
}: ResumeReplacementDialogProps) {
  const action = ACTION_LABELS[existing.action].toLowerCase();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl"
        style={{
          background: "var(--leaders-card-bg-solid, var(--leaders-card-bg, var(--feature-card-bg)))",
          borderColor: "var(--leaders-card-border, var(--faq-border))",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-replacement-title"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 id="resume-replacement-title" className="text-base font-semibold text-fg-heading">
              Replace ongoing process?
            </h2>
            <p className="m-0 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
              Starting a new action will replace your {action} for{" "}
              <code className="rounded-md border px-1.5 py-0.5 font-mono text-[0.88em]">{existing.name}</code>.
              This does not cancel payments being processed, if any.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: "var(--color-brand-orange, #f59e0b)", color: "var(--button-primary-fg, #111)" }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
