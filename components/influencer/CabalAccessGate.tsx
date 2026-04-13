"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { unlockCabal, type CabalAccessState } from "@/app/(site)/cabal/actions";
import { InfluencerHeaderTitle } from "@/components/influencer/InfluencerDeck";

const INITIAL_STATE: CabalAccessState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Checking" : "Enter"}
    </button>
  );
}

export default function CabalAccessGate({ deckTitle }: { deckTitle: string }) {
  const [state, formAction] = useActionState(unlockCabal, INITIAL_STATE);

  return (
    <main className="influencer-shell influencer-gate-shell" aria-label="Cabal access">
      <InfluencerHeaderTitle title={deckTitle} />
      <form className="influencer-gate" action={formAction}>
        <p className="influencer-gate-kicker">Private Deck</p>
        <h1>Enter your invite password</h1>
        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        <SubmitButton />
        {state.error ? (
          <p className="influencer-gate-error" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>
    </main>
  );
}
