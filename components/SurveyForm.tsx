"use client";

import { useState } from "react";
import { submitSurvey } from "@/lib/waitlist/waitlist";

const USE_CASE_OPTIONS = [
  "Send ZEC more easily",
  "Receive ZEC more easily",
  "Buy and sell names",
  "Integrate with my app",
  "Earn referral rewards",
  "Earn affiliate rewards",
];

export default function SurveyForm({
  referralCode,
  onComplete,
  onBack,
}: {
  referralCode: string;
  onComplete: (shouldContact: boolean) => void;
  onBack: () => void;
}) {
  const [useCases, setUseCases] = useState<string[]>([]);
  const [otherUseCase, setOtherUseCase] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [wantEarlyTrial, setWantEarlyTrial] = useState<"yes" | "no" | null>(null);
  const [mayContact, setMayContact] = useState<"yes" | "no" | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleUseCase(label: string) {
    setUseCases((prev) =>
      prev.includes(label) ? prev.filter((v) => v !== label) : [...prev, label],
    );
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const { error, shouldContact } = await submitSurvey({
      referral_code: referralCode,
      use_cases: useCases.length > 0 ? useCases : null,
      other_use_case: otherUseCase || null,
      want_early_trial: wantEarlyTrial === "yes" ? true : wantEarlyTrial === "no" ? false : null,
      may_contact: mayContact === "yes" ? true : mayContact === "no" ? false : null,
      comments: questions || null,
    });
    setSubmitting(false);
    if (!error) {
      onComplete(shouldContact);
    }
  }

  const chipBtn = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="px-5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all capitalize"
      style={{
        background: selected ? "var(--home-result-primary-bg)" : "var(--color-raised)",
        color: selected ? "var(--home-result-primary-fg)" : "var(--fg-body)",
        border: selected ? "1px solid transparent" : "1px solid var(--border-muted)",
        boxShadow: selected ? "var(--home-result-primary-shadow)" : "none",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="p-8 flex flex-col gap-4 text-left">
      <h2 className="text-xl font-bold text-center" style={{ color: "var(--fg-heading)" }}>Quick survey</h2>
      <p className="text-sm text-center" style={{ color: "var(--fg-body)" }}>Help us build a better product.</p>

      <div className="flex flex-col gap-4 rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--border-muted)" }}>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-semibold shrink-0" style={{ color: "var(--fg-heading)" }}>I am interested in using ZcashNames to…</p>
            <span className="text-xs" style={{ color: "var(--fg-dim)", fontWeight: 400 }}>(select all that apply)</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {USE_CASE_OPTIONS.map((label) => {
              const selected = useCases.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleUseCase(label)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: selected ? "var(--home-result-primary-bg)" : "var(--color-raised)",
                    color: selected ? "var(--home-result-primary-fg)" : "var(--fg-body)",
                    border: selected ? "1px solid transparent" : "1px solid var(--border-muted)",
                    boxShadow: selected ? "var(--home-result-primary-shadow)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowOther((v) => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all"
              style={{
                background: showOther ? "var(--home-result-primary-bg)" : "var(--color-raised)",
                color: showOther ? "var(--home-result-primary-fg)" : "var(--fg-body)",
                border: showOther ? "1px solid transparent" : "1px solid var(--border-muted)",
                boxShadow: showOther ? "var(--home-result-primary-shadow)" : "none",
              }}
            >
              Other
            </button>
          </div>
          {showOther && (
            <input
              type="text"
              value={otherUseCase}
              onChange={(e) => setOtherUseCase(e.target.value)}
              placeholder="Tell us more…"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)", marginTop: "0.25rem" }}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>Want to try ZcashNames before launch?</p>
          <div className="flex gap-2">
            {chipBtn("Yes", wantEarlyTrial === "yes", () => setWantEarlyTrial("yes"))}
            {chipBtn("No", wantEarlyTrial === "no", () => setWantEarlyTrial("no"))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>Questions or comments?</p>
          <div className="flex gap-2">
            {chipBtn("Yes", showQuestions, () => setShowQuestions(true))}
            {chipBtn("No", !showQuestions, () => { setShowQuestions(false); setQuestions(""); })}
          </div>
          {showQuestions && (
            <textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Type here…"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors"
              style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>May we contact you?</p>
          <div className="flex gap-2">
            {chipBtn("Yes", mayContact === "yes", () => setMayContact("yes"))}
            {chipBtn("No", mayContact === "no", () => setMayContact("no"))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: "var(--home-result-secondary-bg)",
            color: "var(--home-result-secondary-fg)",
            border: "1px solid var(--home-result-secondary-border)",
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
