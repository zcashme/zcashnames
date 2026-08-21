"use client";

import { useActionState, useState } from "react";
import { isValidEmailAddress } from "@/lib/email-address";
import { requestPreferencesLinkAction } from "./actions";

const ACTION_INSET_PX = 4;

export default function RequestPreferencesLinkClient() {
  const [state, formAction, pending] = useActionState(requestPreferencesLinkAction, {
    ok: true,
    message: "",
  });
  const [email, setEmail] = useState("");
  const emailIsValid = isValidEmailAddress(email);
  const submitReady = emailIsValid && !pending;

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[36rem] flex-col gap-3">
      <div className="relative">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 w-full rounded-2xl border bg-transparent py-3 pl-4 pr-[7.5rem] text-base outline-none transition-colors placeholder:text-fg-muted"
          style={{ borderColor: "var(--faq-border)", color: "var(--fg-heading)" }}
        />
        <span
          className="absolute flex items-center"
          style={{
            top: ACTION_INSET_PX,
            right: ACTION_INSET_PX,
            bottom: ACTION_INSET_PX,
          }}
        >
          <button
            type="submit"
            disabled={!submitReady}
            className="inline-flex h-[calc(100%-2px)] shrink-0 cursor-pointer items-center justify-center rounded-[13px] px-4 text-sm font-semibold leading-none transition-[transform,box-shadow] duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              background: submitReady
                ? "var(--home-result-primary-bg)"
                : "color-mix(in srgb, var(--leaders-card-border, var(--faq-border)) 22%, transparent)",
              color: submitReady
                ? "var(--home-result-primary-fg)"
                : "var(--fg-muted)",
              boxShadow: submitReady ? "var(--home-result-primary-shadow)" : "none",
            }}
          >
            {pending ? "Sending..." : "Send link"}
          </button>
        </span>
      </div>
      {state.message ? (
        <p
          className="text-center text-sm leading-6"
          style={{ color: state.ok ? "var(--fg-body)" : "var(--accent-red, #e05252)" }}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
