"use client";

import { useMemo, useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import { BLOG_SUBSCRIPTION_OPTIONS, type BlogSubscriptionSlug } from "@/lib/blog-series";
import { submitBlogSubscription, type SubmitBlogSubscriptionResult } from "@/lib/blog-subscribers/subscribers";

const ACTION_INSET_PX = 4;

function formatSeriesList(names: string[]): string {
  if (names.length === 0) return "our blogs";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function buildSubscribeBody(selectedSeries: readonly BlogSubscriptionSlug[]): string {
  const titles = BLOG_SUBSCRIPTION_OPTIONS.filter((option) =>
    selectedSeries.includes(option.slug),
  ).map((option) => option.title);

  return `Get new posts from ${formatSeriesList(titles)} by email.`;
}

export default function BlogSubscribeForm({
  defaultSeries,
}: {
  defaultSeries: BlogSubscriptionSlug;
}) {
  const [email, setEmail] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<BlogSubscriptionSlug[]>([defaultSeries]);
  const [status, setStatus] = useState<SubmitBlogSubscriptionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const orderedSeries = useMemo(
    () => [
      ...BLOG_SUBSCRIPTION_OPTIONS.filter((option) => option.slug === defaultSeries),
      ...BLOG_SUBSCRIPTION_OPTIONS.filter((option) => option.slug !== defaultSeries),
    ],
    [defaultSeries],
  );

  const body = useMemo(() => buildSubscribeBody(selectedSeries), [selectedSeries]);
  const hasInput = email.trim().length > 0;

  function toggleSeries(series: BlogSubscriptionSlug) {
    setSelectedSeries((current) => {
      if (current.includes(series)) {
        const next = current.filter((item) => item !== series);
        return next.length === 0 ? [defaultSeries] : next;
      }
      return [...current, series];
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || captchaOpen) return;
    if (selectedSeries.length === 0) {
      setStatus({ status: "error", error: "Select at least one series." });
      return;
    }
    setStatus(null);
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (submitting) return;
    setCaptchaOpen(false);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (submitting) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const result = await submitBlogSubscription({
        email,
        series: selectedSeries,
        captcha_token: solution.captcha_token,
        captcha_answer: solution.captcha_answer,
      });

      if (result.status === "error") {
        const captchaFailed =
          result.code === "captcha_failed" || result.error.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(result.error);
        }
        setStatus(result);
        setCaptchaOpen(false);
        return;
      }

      setStatus(result);
      setCaptchaOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      if (message.toLowerCase().includes("human check")) {
        throw error instanceof Error ? error : new Error(message);
      }
      setStatus({ status: "error", error: message });
      setCaptchaOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const buttonLabel = submitting ? "Sending…" : captchaOpen ? "Complete check…" : "Notify me";

  return (
    <>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to subscribe."
        confirmLabel="Notify me"
        submitting={submitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <form onSubmit={onSubmit} className="blog-subscribe-form">
        <p className="blog-subscribe-body">{body}</p>

        <label className="blog-subscribe-field">
          <span className="sr-only">Email</span>
          <span className="blog-subscribe-field-shell">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="blog-subscribe-input"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <span
              className="blog-subscribe-actions"
              style={{
                top: ACTION_INSET_PX,
                right: ACTION_INSET_PX,
                bottom: ACTION_INSET_PX,
              }}
            >
              <button
                type="submit"
                className="blog-subscribe-button"
                disabled={submitting || captchaOpen || !hasInput}
                data-ready={String(hasInput && !submitting && !captchaOpen)}
              >
                {buttonLabel}
              </button>
            </span>
          </span>
        </label>

        <fieldset className="blog-subscribe-field blog-subscribe-series-group">
          <legend className="sr-only">Series</legend>
          <div className="blog-subscribe-checkboxes">
            {orderedSeries.map((option) => {
              const checked = selectedSeries.includes(option.slug);
              return (
                <label key={option.slug} className="blog-subscribe-checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSeries(option.slug)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {status?.status === "error" ? <p className="blog-subscribe-error">{status.error}</p> : null}
        {status?.status === "submitted" ? <p className="blog-subscribe-success">{status.message}</p> : null}
        {status?.status === "resent" ? <p className="blog-subscribe-success">{status.message}</p> : null}
        {status?.status === "already" ? <p className="blog-subscribe-success">{status.message}</p> : null}
      </form>
    </>
  );
}
