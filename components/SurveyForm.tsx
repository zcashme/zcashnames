"use client";

import { useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { submitSurvey } from "@/lib/waitlist/waitlist";

// Post-waitlist survey form. Collects four data points: use-case preferences
// (multi-select chips), early-access interest, free-text questions, and contact
// consent. On submit, serializes to submitSurvey() server action and calls
// onComplete(shouldContact) so the parent waitlist flow can advance or redirect.

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
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleUseCase(label: string) {
    setUseCases((prev) =>
      prev.includes(label) ? prev.filter((v) => v !== label) : [...prev, label],
    );
  }

  function handleSubmit() {
    if (submitting || captchaOpen) return;
    setErrorMessage(null);
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (submitting) return;
    setCaptchaOpen(false);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, shouldContact, code } = await submitSurvey({
        referral_code: referralCode,
        use_cases: useCases.length > 0 ? useCases : null,
        other_use_case: otherUseCase || null,
        want_early_trial: wantEarlyTrial === "yes" ? true : wantEarlyTrial === "no" ? false : null,
        may_contact: mayContact === "yes" ? true : mayContact === "no" ? false : null,
        comments: questions || null,
        captcha_token: solution.captcha_token,
        captcha_answer: solution.captcha_answer,
      });

      if (error) {
        const captchaFailed =
          code === "captcha_failed" || error.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(error);
        }
        setErrorMessage(error);
        setCaptchaOpen(false);
        return;
      }

      setCaptchaOpen(false);
      onComplete(shouldContact);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      if (message.toLowerCase().includes("human check")) {
        throw error instanceof Error ? error : new Error(message);
      }
      setErrorMessage(message);
      setCaptchaOpen(false);
    } finally {
      setSubmitting(false);
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
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to submit the survey."
        confirmLabel="Submit survey"
        submitting={submitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
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
          <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>Want to try Zcash Names before launch?</p>
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

      {errorMessage ? (
        <p className="text-center text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
          {errorMessage}
        </p>
      ) : null}

      <div className="flex gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || captchaOpen}
          className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
            opacity: submitting || captchaOpen ? 0.5 : 1,
          }}
        >
          {submitting ? (
            <AnimatedLoadingLabel label="Submitting" active />
          ) : captchaOpen ? (
            "Complete check…"
          ) : (
            "Submit"
          )}
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
