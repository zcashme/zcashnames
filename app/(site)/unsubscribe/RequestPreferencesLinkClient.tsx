"use client";

import { useActionState } from "react";
import { requestPreferencesLinkAction } from "./actions";

export default function RequestPreferencesLinkClient() {
  const [state, formAction, pending] = useActionState(requestPreferencesLinkAction, {
    ok: true,
    message: "",
  });

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-3 text-left">
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
        />
      </label>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Email me a new link"}
      </button>
    </form>
  );
}
