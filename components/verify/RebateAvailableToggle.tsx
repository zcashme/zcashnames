"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import RebateConsentModal from "@/components/verify/RebateConsentModal";

type RebateAvailableToggleProps = {
  enabled: boolean;
  savedAddress: string | null;
  name: string;
  paymentAddress: string;
  verifyToken: string;
  rowId: string;
  onEnabled: (unifiedAddress: string) => void;
  onDisabled: () => void;
};

export default function RebateAvailableToggle({
  enabled,
  savedAddress,
  name,
  paymentAddress,
  verifyToken,
  rowId,
  onEnabled,
  onDisabled,
}: RebateAvailableToggleProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const storageKey = `noir-rebate-address:${rowId}`;
  const rememberedAddress =
    savedAddress
    || (typeof window === "undefined" ? "" : window.localStorage.getItem(storageKey) || "");

  async function handleConsent(nextAddress: string) {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/waitlist/rebate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verifyToken,
          rowId,
          unifiedAddress: nextAddress,
        }),
      });
      const payload = (await response.json()) as
        | { ok: true; rebate?: { unifiedAddress?: string } }
        | { ok: false; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Could not save rebate details.",
        );
      }
      const next = payload.rebate?.unifiedAddress || nextAddress;
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Ignore storage failures; the in-memory card state still prefills.
      }
      onEnabled(next);
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save rebate details.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/waitlist/rebate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verifyToken,
          rowId,
          enabled: false,
        }),
      });
      const payload = (await response.json()) as { ok: true } | { ok: false; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Could not turn rebate off.",
        );
      }
      onDisabled();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not turn rebate off.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={submitting}
          onClick={() => {
            if (submitting) return;
            setErrorMessage("");
            if (enabled) {
              void handleDisable();
              return;
            }
            setModalOpen(true);
          }}
          className="inline-flex h-[46px] shrink-0 cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-l-none rounded-r-full border border-l-0 px-4 text-sm font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--fg-heading)] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
            background: "transparent",
          }}
        >
          <span>Rebate</span>
          <span
            className="relative h-6 w-10 shrink-0 rounded-full"
            style={{
              background: enabled
                ? "var(--color-accent-green)"
                : "color-mix(in srgb, var(--fg-muted) 35%, transparent)",
            }}
            aria-hidden="true"
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] duration-200"
              style={{ left: enabled ? "1.15rem" : "0.15rem" }}
            />
          </span>
        </button>

      {modalOpen && typeof document !== "undefined"
        ? createPortal(
            <RebateConsentModal
              name={name}
              paymentAddress={paymentAddress}
              initialAddress={rememberedAddress}
              submitting={submitting}
              errorMessage={errorMessage}
              onCancel={() => {
                if (submitting) return;
                setModalOpen(false);
                setErrorMessage("");
              }}
              onConsent={(address) => void handleConsent(address)}
            />,
            document.body,
          )
        : null}
    </>
  );
}
