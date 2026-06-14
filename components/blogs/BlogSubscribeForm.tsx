"use client";

import { useState } from "react";
import { BLOG_SUBSCRIPTION_OPTIONS, type BlogSubscriptionSlug } from "@/lib/blog-series";
import { submitBlogSubscription, type SubmitBlogSubscriptionResult } from "@/lib/blog-subscribers/subscribers";

export default function BlogSubscribeForm({ defaultSeries }: { defaultSeries: BlogSubscriptionSlug }) {
  const [email, setEmail] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<BlogSubscriptionSlug[]>([defaultSeries]);
  const [status, setStatus] = useState<SubmitBlogSubscriptionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (selectedSeries.length === 0) {
      setStatus({ status: "error", error: "Select at least one series." });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    const result = await submitBlogSubscription({ email, series: selectedSeries });
    setStatus(result);
    setSubmitting(false);
  }

  return (
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

      <button type="submit" className="blog-subscribe-button" disabled={submitting}>
        {submitting ? "Sending..." : "Notify me"}
      </button>
    </form>
  );
}
