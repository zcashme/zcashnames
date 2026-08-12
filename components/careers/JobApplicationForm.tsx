"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { defaultTextFieldStyle } from "@/components/ui/formFieldStyles";
import type { CareerJob } from "@/lib/careers";
import { submitCareerApplication } from "@/lib/careers/actions";

const inputStyle: CSSProperties = defaultTextFieldStyle;

const labelStyle: CSSProperties = {
  color: "var(--fg-muted)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  display: "block",
};

export default function JobApplicationForm({ job }: { job: CareerJob }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [screening, setScreening] = useState<Record<string, string>>(
    Object.fromEntries(job.screeningQuestions.map((question) => [question.id, ""])),
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  function setAnswer(id: string, value: string) {
    setScreening((current) => ({ ...current, [id]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || captchaOpen) return;
    setError("");
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (pending) return;
    setCaptchaOpen(false);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (pending) return;

    setPending(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("linkedin_url", linkedinUrl);
      formData.set("portfolio_url", portfolioUrl);
      formData.set("resume_url", resumeUrl);
      formData.set("cover_note", coverNote);
      formData.set("captcha_token", solution.captcha_token);
      formData.set("captcha_answer", solution.captcha_answer);

      for (const question of job.screeningQuestions) {
        formData.set(`screening_${question.id}`, screening[question.id] ?? "");
      }

      const result = await submitCareerApplication(job.slug, formData);
      if (!result.ok) {
        const captchaFailed =
          result.code === "captcha_failed" || result.error.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(result.error);
        }
        setError(result.error);
        setCaptchaOpen(false);
        return;
      }

      setCaptchaOpen(false);
      setSuccess(true);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.";

      if (message.toLowerCase().includes("human check")) {
        throw submitError instanceof Error ? submitError : new Error(message);
      }

      setError(message);
      setCaptchaOpen(false);
    } finally {
      setPending(false);
    }
  }

  // Match /protected/suggest form pane (filled surface + soft elevation).
  const paneStyle: CSSProperties = {
    borderColor: "var(--faq-border)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
    boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
  };

  if (success) {
    return (
      <div className="rounded-2xl border px-5 py-8 text-center sm:px-6 sm:py-10" style={paneStyle}>
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
          Application received
        </h2>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
          Thanks for applying to {job.title}. We&apos;ll review your application and follow up using
          the email address you provided.
        </p>
      </div>
    );
  }

  return (
    <>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to submit your job application."
        confirmLabel="Submit application"
        submitting={pending}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
        style={paneStyle}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={200}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={50}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              maxLength={400}
              placeholder="https://"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Portfolio or GitHub URL</label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              maxLength={400}
              placeholder="https://"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Resume URL</label>
            <input
              type="url"
              value={resumeUrl}
              onChange={(event) => setResumeUrl(event.target.value)}
              maxLength={400}
              placeholder="https://"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="mt-5">
          <label style={labelStyle}>Why are you a fit for this role?</label>
          <textarea
            value={coverNote}
            onChange={(event) => setCoverNote(event.target.value)}
            rows={6}
            maxLength={4000}
            required
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
            style={inputStyle}
          />
        </div>

        {job.screeningQuestions.length > 0 && (
          <div className="mt-6 flex flex-col gap-5">
            {job.screeningQuestions.map((question) => (
              <div key={question.id}>
                <label style={labelStyle}>
                  {question.prompt}
                  {question.required ? " *" : ""}
                </label>
                <textarea
                  value={screening[question.id] ?? ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  rows={4}
                  maxLength={question.maxLength ?? 2000}
                  required={question.required}
                  placeholder={question.placeholder}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-5 text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || captchaOpen}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          {pending ? (
            <AnimatedLoadingLabel label="Submitting" active />
          ) : captchaOpen ? (
            "Complete check…"
          ) : (
            "Submit application"
          )}
        </button>

        <p className="mt-4 text-center text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
          Applications are reviewed on a rolling basis. If there&apos;s a fit, we&apos;ll be in touch.
        </p>
      </form>
    </>
  );
}
