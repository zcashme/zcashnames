"use client";

import { useActionState, useState } from "react";
import { saveUnsubscribePreferencesAction } from "./actions";

type PreferenceMap = Record<string, boolean>;

const SERIES_DESCRIPTIONS: Record<string, string> = {
  general: "News, announcements, and outreach.",
  builders: "Integrations, tooling, and opportunities.",
  updates: "Release notes, feature changes, and product availability.",
  launch: "Launch notes, rollout updates, and go-live communication.",
};

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
  subscribed,
  onChange,
}: {
  subscribed: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className="relative flex h-10 w-[112px] items-center rounded-full border border-zinc-700 bg-zinc-950"
      style={{ isolation: "isolate" }}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-full transition-transform duration-200"
        style={{
          transform: subscribed ? "translateX(100%)" : "translateX(0%)",
          background: subscribed
            ? "rgba(34, 197, 94, 0.2)"
            : "rgba(239, 68, 68, 0.18)",
          boxShadow: subscribed
            ? "0 0 0 1px rgba(34, 197, 94, 0.45)"
            : "0 0 0 1px rgba(239, 68, 68, 0.35)",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      <button
        type="button"
        aria-pressed={!subscribed}
        aria-label="Unsubscribe"
        onClick={() => onChange(false)}
        className="relative z-10 flex h-full w-1/2 items-center justify-center rounded-full transition-opacity duration-200"
        style={{
          color: !subscribed ? "#fca5a5" : "#71717a",
          opacity: !subscribed ? 1 : 0.75,
        }}
      >
        <ToggleIcon kind="unsubscribe" />
      </button>

      <button
        type="button"
        aria-pressed={subscribed}
        aria-label="Subscribe"
        onClick={() => onChange(true)}
        className="relative z-10 flex h-full w-1/2 items-center justify-center rounded-full transition-opacity duration-200"
        style={{
          color: subscribed ? "#86efac" : "#71717a",
          opacity: subscribed ? 1 : 0.75,
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
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Email</span>
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
          {seriesList.map((series) => (
            <label key={series} className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 px-4 py-3">
              <div className="text-left">
                <div className="text-sm font-medium capitalize text-zinc-100">{series}</div>
                <div className="text-xs text-zinc-500">
                  {SERIES_DESCRIPTIONS[series] ?? "Email updates for this series."}
                </div>
              </div>
              <div className="flex justify-center">
                <input
                  type="hidden"
                  name={`series_${series}`}
                  value={preferences[series] ? "subscribe" : "unsubscribe"}
                />
                <PreferenceToggle subscribed={preferences[series]} onChange={(next) => updateSeries(series, next)} />
              </div>
            </label>
          ))}
        </div>
      </div>

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}

      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateAll(false)}
          className="w-full rounded-full border border-red-600/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15"
        >
          Unsubscribe all
        </button>
        <button
          type="button"
          onClick={() => updateAll(true)}
          className="w-full rounded-full border border-emerald-600/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15"
        >
          Subscribe all
        </button>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save preferences"}
      </button>
    </form>
  );
}
