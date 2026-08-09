"use client";

import { useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import { BLOG_SUBSCRIPTION_OPTIONS, type BlogSubscriptionSlug } from "@/lib/blog-series";
import { submitBlogSubscription, type SubmitBlogSubscriptionResult } from "@/lib/blog-subscribers/subscribers";

export default function BlogSubscribeForm({ defaultSeries }: { defaultSeries: BlogSubscriptionSlug }) {
  const [email, setEmail] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<BlogSubscriptionSlug[]>([defaultSeries]);
  const [status, setStatus] = useState<SubmitBlogSubscriptionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const orderedSeries = [
    ...BLOG_SUBSCRIPTION_OPTIONS.filter((option) => option.slug === defaultSeries),
    ...BLOG_SUBSCRIPTION_OPTIONS.filter((option) => option.slug !== defaultSeries),
  ];

  function toggleSeries(series: BlogSubscriptionSlug) {
    setSelectedSeries((current) => {
      if (current.includes(series)) {
        return current.filter((item) => item !== series);
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
        <fieldset className="blog-subscribe-field blog-subscribe-series-group">
          <span>Series</span>
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
                  <span>{option.title}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="blog-subscribe-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="blog-subscribe-input"
            placeholder="you@example.com"
            required
          />
        </label>

        {status?.status === "error" ? <p className="blog-subscribe-error">{status.error}</p> : null}
        {status?.status === "submitted" ? <p className="blog-subscribe-success">{status.message}</p> : null}
        {status?.status === "resent" ? <p className="blog-subscribe-success">{status.message}</p> : null}
        {status?.status === "already" ? <p className="blog-subscribe-success">{status.message}</p> : null}

        <button type="submit" className="blog-subscribe-button" disabled={submitting || captchaOpen}>
          {submitting ? "Sending..." : captchaOpen ? "Complete check…" : "Notify me"}
        </button>
      </form>
    </>
  );
}
