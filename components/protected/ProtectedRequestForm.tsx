"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import ProtectedRequestSuccessModal from "@/components/protected/ProtectedRequestSuccessModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { buildVerifyTextFieldStyle } from "@/components/ui/formFieldStyles";
import { getEmailAddressValidationMessage } from "@/lib/email-address";
import {
  PROTECTED_ACCESS_RELATIONSHIP_OPTIONS,
  PROTECTED_REQUEST_CONTACT_KINDS,
  PROTECTED_REQUEST_CONTACT_LABEL,
  PROTECTED_REQUEST_CONTACT_PLACEHOLDER,
  extractXUsernameFromEvidence,
  extractZcashMeProfileHref,
  type ProtectedAccessRelationship,
  type ProtectedRequestContactKind,
  type ProtectedRequestNameOption,
  type ProtectedRequestPayload,
} from "@/lib/protected/shared";

type ProtectedRequestFormProps = {
  returnHref?: string;
  initialName?: string | null;
  initialContactKind?: ProtectedRequestContactKind | null;
  initialContactValue?: string | null;
};

type ContactRow = {
  uid: string;
  kind: ProtectedRequestContactKind;
  value: string;
};

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RequiredAsterisk() {
  return (
    <span aria-hidden="true" className="ml-1" style={{ color: "var(--accent-red, #e05252)" }}>
      *
    </span>
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 text-sm leading-6" style={{ color: "var(--accent-red, #e05252)" }}>
      {message}
    </p>
  );
}

function sanitizeNameInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "");
}

function validateUrlValue(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function nextContactKind(rows: ContactRow[]): ProtectedRequestContactKind | null {
  return PROTECTED_REQUEST_CONTACT_KINDS.find((kind) => !rows.some((row) => row.kind === kind)) ?? null;
}

function formatZcashMeLinkLabel(href: string): string {
  return href.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function ZcashMePriorityNotice({ profileHref }: { profileHref: string }) {
  return (
    <div className="space-y-5 text-base leading-8" style={{ color: "var(--fg-body)" }}>
      <p>You’re a verified ZcashMe user from before May 2026, so you don’t need to fill out this form.</p>
      <p>
        Your access code will be sent by shielded memo to the Zcash address on your profile. Just make
        sure your address is current:{" "}
        <strong>
          <a
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-[filter] duration-200 hover:brightness-110"
            style={{ color: "var(--color-accent-interactive)" }}
          >
            {formatZcashMeLinkLabel(profileHref)}
          </a>
          {" → Menu → Edit Profile → Update Address → Request OTP → Submit OTP"}
        </strong>
        .
      </p>
      <p>
        We plan to contact you during early access, targeted for{" "}
        <strong>September 15, 2026</strong>.
      </p>
      <p>Thanks for your support.</p>
    </div>
  );
}

function categoryLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SearchableNameInput({
  id,
  value,
  onChange,
  onSelect,
  options,
  loading,
  invalid = false,
  errorMessage = null,
  locked = false,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  onSelect: (next: ProtectedRequestNameOption) => void;
  options: ProtectedRequestNameOption[];
  loading: boolean;
  invalid?: boolean;
  errorMessage?: string | null;
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shouldShowMenu =
    !locked && open && (loading || options.length > 0 || value.trim().length > 0);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <label
        htmlFor={id}
        className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--fg-muted)" }}
      >
        Name to request
        <RequiredAsterisk />
      </label>
      <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
        {locked
          ? "This request is locked to the name you selected."
          : "Search and select a non-redeemed protected name from the list."}
      </p>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onFocus={() => {
            if (!locked) setOpen(true);
          }}
          onChange={(event) => {
            if (locked) return;
            onChange(sanitizeNameInput(event.target.value));
            setOpen(true);
          }}
          placeholder="Search protected names"
          autoComplete="off"
          readOnly={locked}
          disabled={locked}
          className="w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-70"
          style={buildVerifyTextFieldStyle(invalid)}
          aria-autocomplete="list"
          aria-expanded={shouldShowMenu}
          aria-haspopup="listbox"
          aria-disabled={locked}
        />
        {locked ? null : (
          <span
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-fg-muted"
            aria-hidden="true"
          >
            <ChevronDownIcon open={shouldShowMenu} />
          </span>
        )}
        {shouldShowMenu ? (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 max-h-72 overflow-y-auto overflow-x-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-1.5 shadow-2xl"
          >
            {loading ? (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--fg-muted)" }}>
                <AnimatedLoadingLabel label="Loading names" active />
              </div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.normalizedName}
                  type="button"
                  role="option"
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  className="zns-menu-hover flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-fg-body transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg-heading">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--fg-muted)" }}>
                      {categoryLabel(option.category)}
                      {option.parentName ? ` · parent: ${option.parentName}` : ""}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]"
                    style={{
                      color: "var(--accent-green, #27b36a)",
                      background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
                    }}
                  >
                    Protected
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--fg-muted)" }}>
                No matching non-redeemed protected names.
              </div>
            )}
          </div>
        ) : null}
      </div>
      <ErrorText message={errorMessage} />
    </div>
  );
}

function ContactKindField({
  id,
  value,
  onSelect,
  invalid = false,
}: {
  id: string;
  value: ProtectedRequestContactKind;
  onSelect: (next: ProtectedRequestContactKind) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeLabel = PROTECTED_REQUEST_CONTACT_LABEL[value];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-[11rem] flex-1">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="zns-focus-field flex min-h-[46px] w-full items-center justify-between gap-4 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold outline-none transition-[border-color,box-shadow]"
        style={buildVerifyTextFieldStyle(invalid)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Contact method"
      >
        <span style={{ color: "var(--fg-heading)" }}>{activeLabel}</span>
        <span className="pointer-events-none flex shrink-0 items-center text-fg-muted" aria-hidden="true">
          <ChevronDownIcon open={open} />
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-1.5 shadow-2xl"
        >
          {PROTECTED_REQUEST_CONTACT_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="option"
              onClick={() => {
                onSelect(kind);
                setOpen(false);
              }}
              className="zns-menu-hover flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left text-fg-body transition-colors"
            >
              <span className="block text-sm font-semibold text-fg-heading">
                {PROTECTED_REQUEST_CONTACT_LABEL[kind]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RelationshipField({
  value,
  onSelect,
}: {
  value: ProtectedAccessRelationship;
  onSelect: (next: ProtectedAccessRelationship) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeLabel =
    PROTECTED_ACCESS_RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.label
    ?? "Select your relationship to this name";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <label
        htmlFor="protected-request-relationship"
        className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--fg-muted)" }}
      >
        Your relationship to this name
        <RequiredAsterisk />
      </label>
      <div className="relative">
        <button
          id="protected-request-relationship"
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="zns-focus-field flex min-h-[46px] w-full items-center justify-between gap-4 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold outline-none transition-[border-color,box-shadow]"
          style={buildVerifyTextFieldStyle()}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span style={{ color: "var(--fg-heading)" }}>{activeLabel}</span>
          <span className="pointer-events-none flex shrink-0 items-center text-fg-muted" aria-hidden="true">
            <ChevronDownIcon open={open} />
          </span>
        </button>
        {open ? (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-1.5 shadow-2xl"
          >
            {PROTECTED_ACCESS_RELATIONSHIP_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                className="zns-menu-hover flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left text-fg-body transition-colors"
              >
                <span className="block text-sm font-semibold text-fg-heading">{option.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useRequestNameOptions(query: string) {
  const [options, setOptions] = useState<ProtectedRequestNameOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/protected/requests/options?${new URLSearchParams({
            q: query,
          }).toString()}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to load names.");
        }

        const payload = (await response.json()) as {
          options?: ProtectedRequestNameOption[];
        };
        if (!controller.signal.aborted) {
          setOptions(payload.options ?? []);
        }
      } catch {
        if (controller.signal.aborted) return;
        setOptions([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => controller.abort();
  }, [query]);

  return { options, isLoading };
}

export default function ProtectedRequestForm({
  returnHref = "/protected",
  initialName = null,
  initialContactKind = null,
  initialContactValue = null,
}: ProtectedRequestFormProps) {
  void returnHref;
  const prefilledName = (initialName ?? "").trim();
  const prefilledContactKind = initialContactKind;
  const prefilledContactValue = (initialContactValue ?? "").trim();
  const initialContact = useMemo(
    () => {
      if (prefilledContactKind && prefilledContactValue) {
        return {
          uid: crypto.randomUUID(),
          kind: prefilledContactKind,
          value: prefilledContactValue,
        };
      }
      return { uid: crypto.randomUUID(), kind: "email" as const, value: "" };
    },
    [prefilledContactKind, prefilledContactValue],
  );
  const [nameInput, setNameInput] = useState(prefilledName);
  const [selectedName, setSelectedName] = useState<ProtectedRequestNameOption | null>(null);
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([initialContact]);
  const [preferredContactUid, setPreferredContactUid] = useState<string>(initialContact.uid);
  const [relationship, setRelationship] =
    useState<ProtectedAccessRelationship>("personal_or_public_name");
  const [supportingLink, setSupportingLink] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ProtectedRequestPayload | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const { options: nameOptions, isLoading: isNameLoading } = useRequestNameOptions(nameInput);

  const filledContacts = useMemo(
    () =>
      contacts
        .map((contact) => ({ ...contact, value: contact.value.trim() }))
        .filter((contact) => contact.value),
    [contacts],
  );

  function applyContactsForName(next: ProtectedRequestNameOption) {
    if (next.zmPriorityClaim) {
      const profileHref =
        extractZcashMeProfileHref(next.evidence)
        ?? (prefilledContactKind === "other" && prefilledContactValue
          ? prefilledContactValue
          : `https://zcash.me/${next.normalizedName}`);
      const otherUid = crypto.randomUUID();
      const emailUid = crypto.randomUUID();
      setContacts([
        { uid: otherUid, kind: "other", value: profileHref },
        { uid: emailUid, kind: "email", value: "" },
      ]);
      setPreferredContactUid(otherUid);
      return;
    }

    const ensHandle =
      next.ensPriorityClaim ? extractXUsernameFromEvidence(next.evidence) : null;

    if (ensHandle) {
      const xUid = crypto.randomUUID();
      const emailUid = crypto.randomUUID();
      setContacts([
        { uid: xUid, kind: "x", value: ensHandle },
        { uid: emailUid, kind: "email", value: "" },
      ]);
      setPreferredContactUid(xUid);
      return;
    }

    if (prefilledContactKind && prefilledContactValue) {
      const prefillUid = crypto.randomUUID();
      const emailUid = crypto.randomUUID();
      setContacts(
        prefilledContactKind === "email"
          ? [{ uid: prefillUid, kind: "email", value: prefilledContactValue }]
          : [
              { uid: prefillUid, kind: prefilledContactKind, value: prefilledContactValue },
              { uid: emailUid, kind: "email", value: "" },
            ],
      );
      setPreferredContactUid(prefillUid);
      return;
    }

    const emailUid = crypto.randomUUID();
    setContacts([{ uid: emailUid, kind: "email", value: "" }]);
    setPreferredContactUid(emailUid);
  }

  function selectNameOption(next: ProtectedRequestNameOption) {
    setNameInput(next.value);
    setSelectedName(next);
    setNameError(null);
    setErrorMessage(null);
    applyContactsForName(next);
  }

  useEffect(() => {
    if (hasAppliedPrefill || !prefilledName || isNameLoading) return;

    const match =
      nameOptions.find(
        (option) =>
          option.value.toLowerCase() === prefilledName.toLowerCase()
          || option.normalizedName.toLowerCase() === prefilledName.toLowerCase()
          || option.label.toLowerCase() === prefilledName.toLowerCase(),
      ) ?? null;

    if (!match) {
      setHasAppliedPrefill(true);
      setNameError("Select a non-redeemed protected name from the list.");
      return;
    }

    selectNameOption(match);
    setHasAppliedPrefill(true);
  }, [hasAppliedPrefill, prefilledName, isNameLoading, nameOptions]);

  function handleNameInputChange(next: string) {
    setNameInput(next);
    setSelectedName(null);
    setNameError(null);
    setErrorMessage(null);
  }

  function closeSuccessModal() {
    if (typeof window !== "undefined") {
      window.location.assign("/protected/request");
    }
  }

  function addContact() {
    const kind = nextContactKind(contacts);
    if (!kind) return;
    const uid = crypto.randomUUID();
    setContacts((current) => [...current, { uid, kind, value: "" }]);
    if (!preferredContactUid) {
      setPreferredContactUid(uid);
    }
  }

  function removeContact(uid: string) {
    setContacts((current) => {
      const next = current.filter((contact) => contact.uid !== uid);
      const fallbackUid = next[0]?.uid ?? "";
      if (preferredContactUid === uid) {
        setPreferredContactUid(fallbackUid);
      }
      return next.length > 0 ? next : [{ uid: crypto.randomUUID(), kind: "email", value: "" }];
    });
    setContactError(null);
  }

  function updateContactKind(uid: string, nextKind: ProtectedRequestContactKind) {
    setContacts((current) =>
      current.map((contact) =>
        contact.uid === uid ? { ...contact, kind: nextKind, value: "" } : contact,
      ),
    );
    setContactError(null);
  }

  function updateContactValue(uid: string, nextValue: string) {
    setContacts((current) =>
      current.map((contact) =>
        contact.uid === uid ? { ...contact, value: nextValue } : contact,
      ),
    );
    setContactError(null);
  }

  function validateContacts(): string | null {
    if (filledContacts.length === 0) {
      return "Add at least one contact method.";
    }

    const seenKinds = new Set<string>();
    let hasEmail = false;

    for (const contact of filledContacts) {
      if (seenKinds.has(contact.kind)) {
        return "Each contact method can only be listed once.";
      }
      seenKinds.add(contact.kind);

      if (contact.value.length > 200) {
        return "Contact details must be 200 characters or less.";
      }

      if (contact.kind === "email") {
        hasEmail = true;
        const emailValidationMessage = getEmailAddressValidationMessage(contact.value);
        if (emailValidationMessage) {
          return emailValidationMessage;
        }
      }
    }

    if (!hasEmail) {
      return "Add an email contact method so we can follow up.";
    }

    return null;
  }

  function handleSubmit() {
    if (isSubmitting || captchaOpen) return;
    if (selectedName?.zmPriorityClaim) return;

    if (!selectedName || nameInput.trim() !== selectedName.value) {
      setNameError("Select a non-redeemed protected name from the list.");
      return;
    }

    const nextContactError = validateContacts();
    setContactError(nextContactError);
    setErrorMessage(null);

    if (nextContactError) {
      return;
    }

    const trimmedSupportingLink = supportingLink.trim();
    if (trimmedSupportingLink && !validateUrlValue(trimmedSupportingLink)) {
      setErrorMessage("Supporting link must start with http:// or https://.");
      return;
    }

    if (additionalContext.trim().length > 400) {
      setErrorMessage("Additional context must be 400 characters or less.");
      return;
    }

    const preferred =
      filledContacts.find((contact) => contact.uid === preferredContactUid) ?? filledContacts[0];

    const payload: ProtectedRequestPayload = {
      name: selectedName.value,
      normalizedName: selectedName.normalizedName,
      contactMethods: filledContacts.map((contact) => ({
        kind: contact.kind,
        value: contact.value,
        preferred: contact.uid === preferred.uid,
      })),
      relationship,
      supportingLink: trimmedSupportingLink || null,
      additionalContext: additionalContext.trim() || null,
    };

    setPendingPayload(payload);
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (isSubmitting) return;
    setCaptchaOpen(false);
    setPendingPayload(null);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (!pendingPayload || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/protected/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingPayload,
          captcha_token: solution.captcha_token,
          captcha_answer: solution.captcha_answer,
        }),
      });

      const payload = (await response.json()) as
        | {
            ok: true;
            request: { referenceNumber?: string };
          }
        | { ok: false; error?: string; code?: string };

      if (!response.ok || !payload.ok) {
        const message =
          "error" in payload && payload.error
            ? payload.error
            : "Access request could not be submitted.";
        const captchaFailed =
          ("code" in payload && payload.code === "captcha_failed")
          || message.toLowerCase().includes("human check");

        if (captchaFailed) {
          throw new Error(message);
        }

        setErrorMessage(message);
        setCaptchaOpen(false);
        setPendingPayload(null);
        return;
      }

      setSubmittedName(pendingPayload.name);
      setReferenceNumber(payload.request.referenceNumber ?? null);
      setSuccessModalOpen(true);
      setCaptchaOpen(false);
      setPendingPayload(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Access request could not be submitted.";

      if (message.toLowerCase().includes("human check")) {
        throw error;
      }

      setErrorMessage(message);
      setCaptchaOpen(false);
      setPendingPayload(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to submit your protected name access request."
        confirmLabel="Submit request"
        submitting={isSubmitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <ProtectedRequestSuccessModal
        isOpen={successModalOpen && !!submittedName}
        name={submittedName ?? ""}
        referenceNumber={referenceNumber}
        onClose={closeSuccessModal}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        aria-label="Protected access request form"
        className="w-full rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div className="space-y-5">
          {selectedName?.zmPriorityClaim && prefilledName ? null : (
            <SearchableNameInput
              id="protected-request-name"
              value={nameInput}
              onChange={handleNameInputChange}
              onSelect={selectNameOption}
              options={nameOptions}
              loading={isNameLoading}
              invalid={!!nameError}
              errorMessage={nameError}
              locked={Boolean(prefilledName)}
            />
          )}

          {selectedName?.zmPriorityClaim ? (
            <ZcashMePriorityNotice
              profileHref={
                extractZcashMeProfileHref(selectedName.evidence)
                ?? `https://zcash.me/${selectedName.normalizedName}`
              }
            />
          ) : null}

          {!prefilledName || hasAppliedPrefill ? (
            <>
          <div>
            <label
              className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Preferred contact method(s)
              <RequiredAsterisk />
            </label>
            <p className="mb-3 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
              Add one or more contact methods and mark which one you prefer we use first.
              <br />
              We will use these to verify your identity.
            </p>
            <div className="flex flex-col gap-3">
              {contacts.map((contact) => {
                const isPreferred = contact.uid === preferredContactUid;
                return (
                  <div key={contact.uid} className="flex items-center gap-2">
                    <label
                      className="flex shrink-0 cursor-pointer items-center justify-center"
                      title={isPreferred ? "Preferred contact" : "Mark as preferred"}
                      style={{ width: 24 }}
                    >
                      <input
                        type="radio"
                        name="protected-request-preferred-contact"
                        checked={isPreferred}
                        onChange={() => setPreferredContactUid(contact.uid)}
                        className="sr-only"
                      />
                      <span
                        className="block rounded-full transition-all"
                        style={{
                          width: 14,
                          height: 14,
                          border: `2px solid ${isPreferred ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                          background: isPreferred ? "var(--color-accent-green)" : "transparent",
                          boxShadow: isPreferred ? "inset 0 0 0 2px var(--color-raised)" : "none",
                        }}
                      />
                    </label>
                    <ContactKindField
                      id={`protected-request-contact-kind-${contact.uid}`}
                      value={contact.kind}
                      onSelect={(next) => updateContactKind(contact.uid, next)}
                      invalid={!!contactError}
                    />
                    <input
                      type={contact.kind === "email" ? "email" : "text"}
                      value={contact.value}
                      onChange={(event) => updateContactValue(contact.uid, event.target.value)}
                      placeholder={PROTECTED_REQUEST_CONTACT_PLACEHOLDER[contact.kind]}
                      maxLength={200}
                      className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={buildVerifyTextFieldStyle(!!contactError)}
                    />
                    {contacts.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeContact(contact.uid)}
                        aria-label="Remove this contact method"
                        className="zns-hover-accent cursor-pointer px-1 text-2xl leading-none opacity-60 hover:opacity-100"
                        style={{ color: "var(--fg-body)" }}
                      >
                        &times;
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {contacts.length < PROTECTED_REQUEST_CONTACT_KINDS.length ? (
              <button
                type="button"
                onClick={addContact}
                className="zns-hover-accent mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--fg-body)", marginLeft: "2rem" }}
              >
                <PlusIcon />
                <span>Add another contact method</span>
              </button>
            ) : null}
            <ErrorText message={contactError} />
          </div>

          <RelationshipField value={relationship} onSelect={setRelationship} />

          <div>
            <label
              htmlFor="protected-request-supporting-link"
              className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Supporting link
            </label>
            <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
              Optional on first submission. Examples: official website, public profile, or
              organization page.
            </p>
            <input
              id="protected-request-supporting-link"
              type="url"
              value={supportingLink}
              onChange={(event) => {
                setSupportingLink(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="https://example.com"
              maxLength={240}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={buildVerifyTextFieldStyle()}
            />
          </div>

          <div>
            <label
              htmlFor="protected-request-additional-context"
              className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Additional context
            </label>
            <textarea
              id="protected-request-additional-context"
              value={additionalContext}
              onChange={(event) => {
                setAdditionalContext(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="Tell us anything that may help us review your request."
              maxLength={400}
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                ...buildVerifyTextFieldStyle(),
                resize: "vertical",
              }}
            />
            <p className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
              {additionalContext.length}/400 characters
            </p>
          </div>

          {errorMessage ? (
            <p className="text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
              {errorMessage}
            </p>
          ) : null}

          {selectedName?.zmPriorityClaim ? null : (
          <button
            type="submit"
            disabled={isSubmitting || captchaOpen}
            className="inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            {isSubmitting ? (
              <AnimatedLoadingLabel label="Submitting" active />
            ) : captchaOpen ? (
              "Complete check…"
            ) : (
              "Submit access request"
            )}
          </button>
          )}
            </>
          ) : (
            <AnimatedLoadingLabel label="Loading name" active />
          )}
        </div>
      </form>
    </>
  );
}
