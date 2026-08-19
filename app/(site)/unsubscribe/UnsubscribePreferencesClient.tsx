"use client";

import { useActionState, useState } from "react";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { saveUnsubscribePreferencesAction } from "./actions";

type PreferenceMap = Record<string, boolean>;

const SERIES_DESCRIPTIONS: Record<string, string> = {
  general: "News and outreach.",
  users: "Launches, releases, early access.",
  builders: "Integrations, tooling, and opportunities.",
  waitlist: "Emails we send to the verified waitlist.",
};

function PreferenceCheckbox({
  series,
  subscribed,
  onChange,
}: {
  series: string;
  subscribed: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors"
      style={{
        background: subscribed ? "var(--color-raised)" : "transparent",
        border: `1.5px solid ${subscribed ? "var(--color-accent-green)" : "var(--faq-border)"}`,
      }}
    >
      <span
        className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded"
        style={{
          background: subscribed ? "var(--color-accent-green)" : "var(--color-surface)",
          border: `1.5px solid ${subscribed ? "var(--color-accent-green)" : "var(--border-muted)"}`,
        }}
      >
        <input
          type="checkbox"
          checked={subscribed}
          onChange={(event) => onChange(event.target.checked)}
          className="absolute inset-0 m-0 cursor-pointer opacity-0"
        />
        {subscribed ? (
          <svg
            viewBox="0 0 10 8"
            width="10"
            height="8"
            fill="none"
            stroke="var(--color-background, #1a1a1a)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 4l2.5 2.5L9 1" />
          </svg>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold capitalize leading-snug" style={{ color: "var(--fg-heading)" }}>
          {series}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}>
          {SERIES_DESCRIPTIONS[series] ?? "Email updates for this series."}
        </p>
      </div>
    </label>
  );
}

export default function UnsubscribePreferencesClient({
  token,
  email,
  seriesList,
  initialPreferences,
}: {
  token: string;
  email: string;
  seriesList: string[];
  initialPreferences: PreferenceMap;
}) {
  const [state, formAction, pending] = useActionState(saveUnsubscribePreferencesAction, {
    ok: true,
    message: "",
    confirmationRequested: [] as string[],
  });
  const [preferences, setPreferences] = useState<PreferenceMap>(initialPreferences);

  function updateAll(next: boolean) {
    setPreferences(Object.fromEntries(seriesList.map((series) => [series, next])) as PreferenceMap);
  }

  function updateSeries(series: string, next: boolean) {
    setPreferences((current) => ({
      ...current,
      [series]: next,
    }));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      <div className="flex flex-col gap-2">
        {seriesList.map((series) => (
          <div key={series}>
            <input
              type="hidden"
              name={`series_${series}`}
              value={preferences[series] ? "subscribe" : "unsubscribe"}
            />
            <PreferenceCheckbox
              series={series}
              subscribed={Boolean(preferences[series])}
              onChange={(next) => updateSeries(series, next)}
            />
          </div>
        ))}
      </div>

      {state.message ? (
        <p
          className="text-sm leading-6"
          style={{ color: state.ok ? "var(--fg-body)" : "var(--accent-red, #e05252)" }}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => updateAll(false)}
            className="cursor-pointer bg-transparent p-0 text-xs font-semibold transition-colors hover:text-[var(--color-accent-interactive)]"
            style={{ color: "var(--fg-body)" }}
          >
            Unsubscribe all
          </button>
          <button
            type="button"
            onClick={() => updateAll(true)}
            className="cursor-pointer bg-transparent p-0 text-xs font-semibold transition-colors hover:text-[var(--color-accent-interactive)]"
            style={{ color: "var(--fg-body)" }}
          >
            Subscribe all
          </button>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          {pending ? <AnimatedLoadingLabel label="Saving" active /> : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
