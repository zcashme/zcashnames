/**
 * Beta v2 application form. Collects display name, why, focus areas, experience,
 * referral source, and one or more contact methods (email, telegram, signal, etc.).
 * Assembles fields into FormData and calls submitBetaV2Application server action on submit.
 * Uses useTransition for optimistic pending state during submission.
 */
"use client";

import { useState, useTransition } from "react";
import { submitBetaV2Application } from "@/lib/beta-v2/actions";
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

type FocusArea = "user" | "sdk";

/** Finds the first CONTACT_KINDS value not already used in the current contact rows. */
function nextUnusedKind(rows: ContactRow[]): ContactKind | null {
  return CONTACT_KINDS.find((kind) => !rows.some((row) => row.kind === kind)) ?? null;
}

function buildUid() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-raised)",
  border: "1.5px solid var(--faq-border)",
  color: "var(--fg-heading)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  paddingRight: "2rem",
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='gray' stroke-width='2'><polyline points='3 5 6 8 9 5'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.6rem center",
  backgroundSize: "0.8rem",
};

const labelStyle: React.CSSProperties = {
  color: "var(--fg-muted)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  display: "block",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--home-result-primary-bg)",
  color: "var(--home-result-primary-fg)",
  boxShadow: "var(--home-result-primary-shadow)",
};

export default function BetaV2ApplicationForm() {
  const [displayName, setDisplayName] = useState("");
  const [why, setWhy] = useState("");
  const [focusUser, setFocusUser] = useState(false);
  const [focusSdk, setFocusSdk] = useState(false);
  const [experience, setExperience] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([
    { uid: "c0", kind: "email", value: "" },
  ]);
  const [bestContactUid, setBestContactUid] = useState("c0");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

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

  /**
   * Swaps kinds between two rows when the user selects a kind already in use by
   * another row — avoids collisions without needing a dedicated "swap" UX.
   */
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

  /** Validates, assembles FormData, and calls submitBetaV2Application server action. */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const filled = contacts.filter((row) => row.value.trim().length > 0);
    if (filled.length === 0) {
      setError("Add at least one contact method.");
      return;
    }
    if (!focusUser && !focusSdk) {
      setError("Pick at least one thing you want to test.");
      return;
    }

    const best = filled.find((row) => row.uid === bestContactUid) ?? filled[0];
    const focus: FocusArea[] = [];
    if (focusUser) focus.push("user");
    if (focusSdk) focus.push("sdk");

    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("display_name", displayName);
      formData.set("why", why);
      formData.set("focus_areas", focus.join(","));
      formData.set("experience", experience);
      formData.set("referral_source", referralSource);
      formData.set("best_contact_kind", best.kind);

      for (const kind of CONTACT_KINDS) {
        const row = filled.find((contact) => contact.kind === kind);
        formData.set(`contact_${kind}`, row?.value.trim() ?? "");
      }

      try {
        const result = await submitBetaV2Application(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSuccess(true);
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  if (success) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
        }}
      >
        <span
          className="flex items-center justify-center w-14 h-14 rounded-full"
          style={{
            background: "var(--color-accent-green-light)",
            color: "var(--color-accent-green)",
          }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 className="text-xl font-bold" style={{ color: "var(--fg-heading)" }}>
          Application received
        </h2>
        <p className="text-sm" style={{ color: "var(--fg-body)", lineHeight: 1.7 }}>
          Thanks for applying. We&apos;ll reach out through your preferred contact method if
          there&apos;s a fit for this beta round.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-6 md:p-8 flex flex-col gap-5"
      style={{
        background: "var(--feature-card-bg)",
        border: "1px solid var(--faq-border)",
      }}
    >
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
        <p className="text-xs mb-2" style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}>
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
                        border: `2px solid ${isBest ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                        background: isBest ? "var(--color-accent-green)" : "transparent",
                        boxShadow: isBest ? "inset 0 0 0 2px var(--color-raised)" : "none",
                      }}
                    />
                  </label>
                )}
                <select
                  value={contact.kind}
                  onChange={(e) => updateContactKind(contact.uid, e.target.value as ContactKind)}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none"
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
                    className="cursor-pointer px-1 text-2xl leading-none opacity-60 hover:opacity-100"
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
            className="mt-2 cursor-pointer text-xs font-semibold underline"
            style={{ color: "var(--fg-body)" }}
          >
            + Add another contact method
          </button>
        )}
      </div>

      <div>
        <label style={labelStyle}>
          Why do you want to join? <span style={{ color: "var(--accent-red, #e05252)" }}>*</span>
        </label>
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={4}
          minLength={20}
          maxLength={2000}
          required
          placeholder="Tell us what you want to test and why this next wallet-connected beta matters to you."
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
        <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
          {why.length} / 2000
        </p>
      </div>

      <div>
        <label style={labelStyle}>
          What do you want to test? <span style={{ color: "var(--accent-red, #e05252)" }}>*</span>
        </label>
        <p className="text-xs mb-2" style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}>
          Pick one or both.
        </p>
        <div className="flex flex-col gap-2">
          <label
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
            style={{
              background: focusUser ? "var(--color-raised)" : "transparent",
              border: `1.5px solid ${focusUser ? "var(--color-accent-green)" : "var(--faq-border)"}`,
            }}
          >
            <span
              className="relative flex items-center justify-center shrink-0 rounded mt-0.5"
              style={{
                width: 18,
                height: 18,
                background: focusUser ? "var(--color-accent-green)" : "var(--color-surface)",
                border: `1.5px solid ${focusUser ? "var(--color-accent-green)" : "var(--border-muted)"}`,
              }}
            >
              <input
                type="checkbox"
                checked={focusUser}
                onChange={(e) => setFocusUser(e.target.checked)}
                className="absolute inset-0 opacity-0 cursor-pointer m-0"
              />
              {focusUser && (
                <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="var(--color-background, #1a1a1a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 4l2.5 2.5L9 1" />
                </svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug" style={{ color: "var(--fg-heading)" }}>
                Wallet and market flows
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}>
                Resolve names in wallet, buy names, list them for sale, complete sales, receive proceeds, and send ZEC to names.
              </p>
            </div>
          </label>

          <label
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
            style={{
              background: focusSdk ? "var(--color-raised)" : "transparent",
              border: `1.5px solid ${focusSdk ? "var(--color-accent-green)" : "var(--faq-border)"}`,
            }}
          >
            <span
              className="relative flex items-center justify-center shrink-0 rounded mt-0.5"
              style={{
                width: 18,
                height: 18,
                background: focusSdk ? "var(--color-accent-green)" : "var(--color-surface)",
                border: `1.5px solid ${focusSdk ? "var(--color-accent-green)" : "var(--border-muted)"}`,
              }}
            >
              <input
                type="checkbox"
                checked={focusSdk}
                onChange={(e) => setFocusSdk(e.target.checked)}
                className="absolute inset-0 opacity-0 cursor-pointer m-0"
              />
              {focusSdk && (
                <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="var(--color-background, #1a1a1a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 4l2.5 2.5L9 1" />
                </svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug" style={{ color: "var(--fg-heading)" }}>
                SDK and wallet resolution
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)", lineHeight: 1.55 }}>
                Programmatic resolution, wallet integrations, and app-side verification using the SDK and JSON-RPC.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Zcash / development experience</label>
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="A sentence or two about your background"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Where did you hear about this?</label>
        <input
          type="text"
          value={referralSource}
          onChange={(e) => setReferralSource(e.target.value)}
          maxLength={2000}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
      </div>

      {error && (
        <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full py-3 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={primaryBtnStyle}
      >
        {pending ? "Submitting..." : "Submit application"}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
        We&apos;ll only contact you about this beta round. No spam.
      </p>
    </form>
  );
}
