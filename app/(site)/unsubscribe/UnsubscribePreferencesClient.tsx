"use client";

import { useActionState, useMemo, useState } from "react";
import {
  EMAIL_SUBSCRIPTION_SERIES,
  EMAIL_SUBSCRIPTION_SERIES_DESCRIPTIONS,
  type EmailSubscriptionSeries,
} from "@/lib/email/subscription-series";
import { saveUnsubscribePreferencesAction } from "./actions";

type PreferenceMap = Record<EmailSubscriptionSeries, boolean>;
type ToggleValue = boolean | "mixed";

function allSubscribed(values: PreferenceMap): boolean {
  return EMAIL_SUBSCRIPTION_SERIES.every((series) => values[series]);
}

function allUnsubscribed(values: PreferenceMap): boolean {
  return EMAIL_SUBSCRIPTION_SERIES.every((series) => !values[series]);
}

function ToggleIcon({
  kind,
}: {
  kind: "subscribe" | "unsubscribe";
}) {
  if (kind === "subscribe") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 13 4 4L19 7" />
      </svg>
    );
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function PreferenceToggle({
  value,
  onChange,
}: {
  value: ToggleValue;
  onChange: (next: boolean) => void;
}) {
  const highlightTransform =
    value === "mixed" ? "translateX(50%) scaleX(0.12)" : value ? "translateX(100%)" : "translateX(0%)";

  return (
    <div
      className="relative flex h-10 w-[112px] items-center rounded-full border border-zinc-700 bg-zinc-950"
      style={{ isolation: "isolate" }}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-full transition-transform duration-200"
        style={{
          transform: highlightTransform,
          background:
            value === "mixed"
              ? "rgba(244, 183, 40, 0.18)"
              : value
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(239, 68, 68, 0.18)",
          boxShadow:
            value === "mixed"
              ? "0 0 0 1px rgba(244, 183, 40, 0.35)"
              : value
                ? "0 0 0 1px rgba(34, 197, 94, 0.45)"
                : "0 0 0 1px rgba(239, 68, 68, 0.35)",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      <button
        type="button"
        aria-pressed={value === false}
        aria-label="Unsubscribe"
        onClick={() => onChange(false)}
        className="relative z-10 flex h-full w-1/2 items-center justify-center rounded-full transition-opacity duration-200"
        style={{
          color: value === false ? "#fca5a5" : value === "mixed" ? "#f4b728" : "#71717a",
          opacity: value === false || value === "mixed" ? 1 : 0.75,
        }}
      >
        <ToggleIcon kind="unsubscribe" />
      </button>

      <button
        type="button"
        aria-pressed={value === true}
        aria-label="Subscribe"
        onClick={() => onChange(true)}
        className="relative z-10 flex h-full w-1/2 items-center justify-center rounded-full transition-opacity duration-200"
        style={{
          color: value === true ? "#86efac" : value === "mixed" ? "#f4b728" : "#71717a",
          opacity: value === true || value === "mixed" ? 1 : 0.75,
        }}
      >
        <ToggleIcon kind="subscribe" />
      </button>
    </div>
  );
}

export default function UnsubscribePreferencesClient({
  token,
  email,
  initialPreferences,
}: {
  token: string;
  email: string;
  initialPreferences: PreferenceMap;
}) {
  const [state, formAction, pending] = useActionState(saveUnsubscribePreferencesAction, {
    ok: true,
    message: "",
    confirmationRequested: [] as EmailSubscriptionSeries[],
  });
  const [preferences, setPreferences] = useState<PreferenceMap>(initialPreferences);

  const allValue = useMemo<ToggleValue>(() => {
    if (allSubscribed(preferences)) return true;
    if (allUnsubscribed(preferences)) return false;
    return "mixed";
  }, [preferences]);

  function updateAll(next: boolean) {
    setPreferences(
      Object.fromEntries(EMAIL_SUBSCRIPTION_SERIES.map((series) => [series, next])) as PreferenceMap,
    );
  }

  function updateSeries(series: EmailSubscriptionSeries, next: boolean) {
    setPreferences((current) => ({
      ...current,
      [series]: next,
    }));
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Email
        </span>
        <input
          type="email"
          value={email}
          readOnly
          disabled
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 opacity-90"
        />
      </label>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70">
        <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center border-b border-zinc-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <div>Preferences</div>
          <div className="text-center">Subscribe</div>
        </div>
        <div className="divide-y divide-zinc-800">
          <label className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 px-4 py-3">
            <div className="text-left">
              <div className="text-sm font-medium text-zinc-100">All</div>
              <div className="text-xs text-zinc-500">
                {allValue === "mixed"
                  ? "Mixed state across your current series selections."
                  : "Apply to every series."}
              </div>
            </div>
            <div className="flex justify-center">
              <PreferenceToggle value={allValue} onChange={updateAll} />
            </div>
          </label>

          {EMAIL_SUBSCRIPTION_SERIES.map((series) => (
            <label
              key={series}
              className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 px-4 py-3"
            >
              <div className="text-left">
                <div className="text-sm font-medium capitalize text-zinc-100">{series}</div>
                <div className="text-xs text-zinc-500">
                  {EMAIL_SUBSCRIPTION_SERIES_DESCRIPTIONS[series]}
                </div>
              </div>
              <div className="flex justify-center">
                <input
                  type="hidden"
                  name={`series_${series}`}
                  value={preferences[series] ? "subscribe" : "unsubscribe"}
                />
                <PreferenceToggle
                  value={preferences[series]}
                  onChange={(next) => updateSeries(series, next)}
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save preferences"}
      </button>
    </form>
  );
}
