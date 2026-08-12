"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { defaultTextFieldStyle } from "@/components/ui/formFieldStyles";
import { submitIndexerLaunchAlert } from "@/lib/indexer-launch-alert/actions";
import {
  CONTACT_KINDS,
  CONTACT_LABEL,
  CONTACT_PLACEHOLDER,
  type ContactKind,
} from "@/lib/types";

interface ContactRow {
  uid: string;
  kind: ContactKind;
  value: string;
}

function nextUnusedKind(rows: ContactRow[]): ContactKind | null {
  return CONTACT_KINDS.find((kind) => !rows.some((row) => row.kind === kind)) ?? null;
}

function buildUid() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const inputStyle: CSSProperties = defaultTextFieldStyle;

const selectStyle: CSSProperties = {
  ...inputStyle,
};

const labelStyle: CSSProperties = {
  color: "var(--fg-muted)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  display: "block",
};

// Match /protected/suggest and careers apply form pane.
const paneStyle: CSSProperties = {
  borderColor: "var(--faq-border)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
  boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
};

// Client-side form for the indexer bug bounty launch alert signup.
// Manages dynamic contact rows (email, telegram, signal, etc.) with
// add/remove/swap-kind and a "best contact" radio. Validates that at
// least one contact is filled, then submits via server action
// (submitIndexerLaunchAlert). Renders a success state inline on ok.
export default function IndexerLaunchAlertForm() {
  const [displayName, setDisplayName] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([
    { uid: "c0", kind: "email", value: "" },
  ]);
  const [bestContactUid, setBestContactUid] = useState("c0");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const canAddMore = contacts.length < CONTACT_KINDS.length;

  function addContact() {
    const kind = nextUnusedKind(contacts);
    if (!kind) return;
    const uid = buildUid();
    setContacts((prev) => [...prev, { uid, kind, value: "" }]);
  }

  function removeContact(uid: string) {
    setContacts((prev) => {
      const next = prev.filter((row) => row.uid !== uid);
      if (uid === bestContactUid && next.length > 0) {
        setBestContactUid(next[0].uid);
      }
      return next;
    });
  }

  function updateContactValue(uid: string, value: string) {
    setContacts((prev) => prev.map((row) => (row.uid === uid ? { ...row, value } : row)));
  }

  function updateContactKind(uid: string, kind: ContactKind) {
    setContacts((prev) => {
      const current = prev.find((row) => row.uid === uid);
      if (!current || current.kind === kind) return prev;

      const collision = prev.find((row) => row.uid !== uid && row.kind === kind);
      if (!collision) {
        return prev.map((row) => (row.uid === uid ? { ...row, kind } : row));
      }

      return prev.map((row) => {
        if (row.uid === uid) return { ...row, kind };
        if (row.uid === collision.uid) return { ...row, kind: current.kind };
        return row;
      });
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || captchaOpen) return;

    const filled = contacts.filter((row) => row.value.trim().length > 0);
    if (filled.length === 0) {
      setError("Add at least one contact method.");
      return;
    }

    const best = filled.find((row) => row.uid === bestContactUid) ?? filled[0];

    setError("");
    const formData = new FormData();
    formData.set("display_name", displayName);
    formData.set("best_contact_kind", best.kind);
    formData.set("newsletter", String(newsletter));

    for (const kind of CONTACT_KINDS) {
      const row = filled.find((contact) => contact.kind === kind);
      formData.set(`contact_${kind}`, row?.value.trim() ?? "");
    }

    setPendingFormData(formData);
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (pending) return;
    setCaptchaOpen(false);
    setPendingFormData(null);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (!pendingFormData || pending) return;

    setPending(true);
    setError("");

    try {
      pendingFormData.set("captcha_token", solution.captcha_token);
      pendingFormData.set("captcha_answer", solution.captcha_answer);

      const result = await submitIndexerLaunchAlert(pendingFormData);
      if (!result.ok) {
        const captchaFailed =
          result.code === "captcha_failed" || result.error.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(result.error);
        }
        setError(result.error);
        setCaptchaOpen(false);
        setPendingFormData(null);
        return;
      }

      setCaptchaOpen(false);
      setPendingFormData(null);
      setSuccess(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Try again.";
      if (message.toLowerCase().includes("human check")) {
        throw error instanceof Error ? error : new Error(message);
      }
      setError(message);
      setCaptchaOpen(false);
      setPendingFormData(null);
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border px-5 py-8 text-center sm:px-6 sm:py-10" style={paneStyle}>
        <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
          You&apos;re on the alert list
        </h2>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
          We&apos;ll use your preferred contact method when the indexer bug bounty is posted.
          {newsletter ? " You also opted in to the newsletter." : ""}
        </p>
      </div>
    );
  }

  return (
    <>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to join the launch alert list."
        confirmLabel="Notify me when it launches"
        submitting={pending}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
        style={paneStyle}
      >
        <div className="mb-5">
          <h2
            className="text-xl font-semibold tracking-tight sm:text-[1.35rem]"
            style={{ color: "var(--fg-heading)" }}
          >
            Get an alert when the program is posted
          </h2>
          <p className="mt-2 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
            Leave your preferred contact details and we&apos;ll reach out when the indexer bug
            bounty is live. You can also separately opt in to the newsletter.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              maxLength={60}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>How to reach you</label>
            <p className="mb-2 text-xs leading-5" style={{ color: "var(--fg-muted)" }}>
              Add one or more contact methods. Mark which one you&apos;d prefer we use.
            </p>
            <div className="flex flex-col gap-2">
              {contacts.map((contact) => {
                const isBest = contact.uid === bestContactUid;
                return (
                  <div key={contact.uid} className="flex items-center gap-2">
                    {contacts.length > 1 && (
                      <label
                        className="flex shrink-0 cursor-pointer items-center justify-center"
                        title={isBest ? "Preferred contact" : "Mark as preferred"}
                        style={{ width: 24 }}
                      >
                        <input
                          type="radio"
                          name="best_contact"
                          checked={isBest}
                          onChange={() => setBestContactUid(contact.uid)}
                          className="sr-only"
                        />
                        <span
                          className="block rounded-full transition-all"
                          style={{
                            width: 14,
                            height: 14,
                            border: `2px solid ${isBest ? "var(--color-accent-interactive)" : "var(--border-muted)"}`,
                            background: isBest ? "var(--color-accent-interactive)" : "transparent",
                            boxShadow: isBest ? "inset 0 0 0 2px var(--color-raised)" : "none",
                          }}
                        />
                      </label>
                    )}
                    <select
                      value={contact.kind}
                      onChange={(e) => updateContactKind(contact.uid, e.target.value as ContactKind)}
                      className="zns-themed-select cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ ...selectStyle, minWidth: 130 }}
                    >
                      {CONTACT_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {CONTACT_LABEL[kind]}
                        </option>
                      ))}
                    </select>
                    <input
                      type={contact.kind === "email" ? "email" : "text"}
                      value={contact.value}
                      onChange={(e) => updateContactValue(contact.uid, e.target.value)}
                      placeholder={CONTACT_PLACEHOLDER[contact.kind]}
                      maxLength={200}
                      className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={inputStyle}
                    />
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(contact.uid)}
                        aria-label="Remove this contact"
                        className="zns-hover-accent cursor-pointer px-1 text-2xl leading-none opacity-60 transition-[color,opacity] duration-200 hover:opacity-100"
                        style={{ color: "var(--fg-body)" }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {canAddMore && (
              <button
                type="button"
                onClick={addContact}
                className="zns-hover-accent mt-2 cursor-pointer text-xs font-semibold"
                style={{ color: "var(--fg-body)" }}
              >
                + Add another contact method
              </button>
            )}
          </div>

          <div>
            <label
              className="flex cursor-pointer items-start gap-3 text-sm"
              style={{ color: "var(--fg-body)" }}
            >
              <span
                className="relative mt-0.5 flex shrink-0 items-center justify-center rounded"
                style={{
                  width: 16,
                  height: 16,
                  background: newsletter ? "var(--checkbox-accent)" : "var(--color-surface)",
                  border: `1.5px solid ${newsletter ? "var(--checkbox-accent)" : "var(--border-muted)"}`,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
                />
                {newsletter && (
                  <svg
                    viewBox="0 0 10 8"
                    width="10"
                    height="8"
                    fill="none"
                    stroke="var(--checkbox-check-color, #1a1a1a)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ pointerEvents: "none" }}
                  >
                    <path d="M1 4l2.5 2.5L9 1" />
                  </svg>
                )}
              </span>
              <span className="leading-6">Sign me up for the newsletter too.</span>
            </label>
          </div>

          {error ? (
            <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || captchaOpen}
            className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            {pending ? (
              <AnimatedLoadingLabel label="Submitting" active />
            ) : captchaOpen ? (
              "Complete check…"
            ) : (
              "Notify me when it launches"
            )}
          </button>

          <p className="text-center text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
            We&apos;ll only use this to contact you about the program launch and, if selected,
            newsletter updates.
          </p>
        </div>
      </form>
    </>
  );
}
