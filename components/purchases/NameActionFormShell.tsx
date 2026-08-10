"use client";

import { useState, type ReactNode } from "react";
import NameActionForm from "@/components/purchases/NameActionForm";
import NameActionFeatureChips from "@/components/purchases/NameActionFeatureChips";
import type { Action, NameAvailabilityState, Network, ResolveName } from "@/lib/types";

type NameActionFormShellProps = {
  action: Action;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  returnHref: string;
  featureChips: string[];
  availability: NameAvailabilityState;
  /** Status row left content (badge, price) — rendered by the server page. */
  statusLeft: ReactNode;
  /** Hero section body below chips (title, description). */
  heroBody: ReactNode;
  /** Content when the action is not allowed (server-rendered denial card). */
  denial: ReactNode | null;
  formAllowed: boolean;
};

/**
 * Owns form-success state so the top for-sale Share chip can hide when the
 * footer Share appears on successful completion.
 */
export default function NameActionFormShell({
  action,
  name,
  network,
  resolveResult,
  returnHref,
  featureChips,
  availability,
  statusLeft,
  heroBody,
  denial,
  formAllowed,
}: NameActionFormShellProps) {
  const [formSuccess, setFormSuccess] = useState(false);

  return (
    <>
      <div className="name-action-status-row mb-4">
        <div className="name-action-status-left flex min-w-0 flex-wrap items-center gap-2.5">
          {statusLeft}
        </div>
        <NameActionFeatureChips
          chips={featureChips}
          placement="inline"
          name={name}
          network={network}
          availability={availability}
          hideShare={formSuccess}
        />
      </div>

      <section
        className="w-full rounded-t-2xl border border-b-0 px-6 py-8 sm:px-8 sm:py-10"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
        }}
      >
        <div className="grid gap-4">
          <NameActionFeatureChips
            chips={featureChips}
            placement="hero"
            name={name}
            network={network}
            availability={availability}
            hideShare={formSuccess}
          />
          {heroBody}
        </div>
      </section>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
          style={{ background: "var(--faq-border)" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-[-1rem] z-10 block h-8 w-px"
          style={{ background: "var(--faq-border)" }}
        />
        {formAllowed ? (
          <NameActionForm
            action={action}
            name={name}
            network={network}
            resolveResult={resolveResult}
            returnHref={returnHref}
            onSuccessChange={setFormSuccess}
          />
        ) : (
          denial
        )}
      </div>
    </>
  );
}
