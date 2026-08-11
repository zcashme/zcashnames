"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import ProtectedDisputeSuccessModal from "@/components/protected/ProtectedDisputeSuccessModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { getEmailAddressValidationMessage } from "@/lib/email-address";
import {
  PROTECTED_NAME_CATEGORIES,
  type ProtectedDisputeNameOption,
  type ProtectedDisputeNameStatus,
  type ProtectedDisputePayload,
  type ProtectedSuggestionContactMethod,
} from "@/lib/protected/shared";
import { CONTACT_KINDS, CONTACT_LABEL, CONTACT_PLACEHOLDER, type ContactKind } from "@/lib/types";
import { validateAddress } from "@/lib/zns/address-validation";

type ProtectedDisputeFormProps = {
  returnHref?: string;
  /** Prefill / auto-select name (from ?name= on the dispute page). */
  initialName?: string | null;
};

type ContactRow = {
  uid: string;
  kind: ContactKind;
  value: string;
};

type SelectOption = {
  value: string;
  label: string;
  hint?: string;
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

function InlineStepButton({
  onClick,
  disabled = false,
  label = "Next",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center rounded-[13px] px-4 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100"
      style={{
        background: disabled
          ? "color-mix(in srgb, var(--leaders-card-border) 22%, transparent)"
          : "var(--home-result-primary-bg)",
        color: disabled ? "var(--fg-muted)" : "var(--home-result-primary-fg)",
        boxShadow: disabled ? "none" : "var(--home-result-primary-shadow)",
      }}
    >
      {label}
    </button>
  );
}

function RequiredAsterisk() {
  return (
    <span aria-hidden="true" className="ml-1" style={{ color: "var(--accent-red, #e05252)" }}>
      *
    </span>
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

function nextContactKind(rows: ContactRow[]): ContactKind | null {
  return CONTACT_KINDS.find((kind) => !rows.some((row) => row.kind === kind)) ?? null;
}

function categoryLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status: string): string {
  if (status === "protected") return "Protected";
  if (status === "rejected") return "Rejected";
  return status.replaceAll("_", " ");
}

function getStatusStyle(status: string) {
  if (status === "protected") {
    return {
      color: "var(--accent-green, #27b36a)",
      background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
    };
  }

  if (status === "rejected") {
    return {
      color: "var(--accent-red, #e05252)",
      background: "color-mix(in srgb, var(--accent-red, #e05252) 12%, transparent)",
    };
  }

  return {
    color: "var(--fg-muted)",
    background: "color-mix(in srgb, var(--fg-muted) 12%, transparent)",
  };
}

const CATEGORY_OPTIONS: SelectOption[] = [
  {
    value: "person",
    label: "Person",
    hint: "Individuals, founders, developers, public figures",
  },
  {
    value: "organization",
    label: "Organization",
    hint: "Companies, nonprofits, governments, institutions, media",
  },
  {
    value: "brand",
    label: "Brand",
    hint: "Product names, service names, exchanges, wallets",
  },
  {
    value: "technology",
    label: "Technology",
    hint: "Protocols, tokens, software, infrastructure, projects",
  },
  {
    value: "community",
    label: "Community",
    hint: "Community roles, groups, shared terms",
  },
  {
    value: "abuse",
    label: "Abuse",
    hint: "Slurs, profanity, abusive terms",
  },
  {
    value: "other",
    label: "Other",
    hint: "Cases that do not fit another category",
  },
];

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="mt-2 text-sm leading-6"
      style={{ color: "var(--accent-red, #e05252)" }}
    >
      {message}
    </p>
  );
}

function fieldStyle(invalid: boolean) {
  return {
    background: "var(--verify-input-fill)",
    border: invalid
      ? "1.5px solid var(--accent-red, #e05252)"
      : "1.5px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
    color: "var(--fg-heading)",
  };
}

function SearchableNameInput({
  id,
  label,
  description,
  placeholder,
  value,
  onChange,
  onSelect,
  options,
  loading,
  emptyMessage,
  invalid = false,
  errorMessage = null,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  onSelect: (next: ProtectedDisputeNameOption) => void;
  options: ProtectedDisputeNameOption[];
  loading: boolean;
  emptyMessage: string;
  invalid?: boolean;
  errorMessage?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shouldShowMenu =
    open && (loading || options.length > 0 || value.trim().length > 0);

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
        {label}
        <RequiredAsterisk />
      </label>
      <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
        {description}
      </p>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(sanitizeNameInput(event.target.value));
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-2xl px-4 py-2.5 pr-11 text-sm outline-none"
          style={fieldStyle(invalid)}
          aria-autocomplete="list"
          aria-expanded={shouldShowMenu}
          aria-haspopup="listbox"
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-fg-muted"
          aria-hidden="true"
        >
          <ChevronDownIcon open={shouldShowMenu} />
        </span>
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
                  key={`${option.normalizedName}-${option.status}`}
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
                    style={getStatusStyle(option.status)}
                  >
                    {getStatusLabel(option.status)}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--fg-muted)" }}>
                {emptyMessage}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <ErrorText message={errorMessage} />
    </div>
  );
}

function DropdownField({
  id,
  label,
  description,
  placeholder,
  value,
  options,
  onSelect,
  invalid = false,
  errorMessage = null,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  onSelect: (next: string) => void;
  invalid?: boolean;
  errorMessage?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeLabel = options.find((option) => option.value === value)?.label ?? placeholder;

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
        {label}
      </label>
      <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
        {description}
      </p>
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="zns-focus-field flex min-h-[46px] w-full items-center justify-between gap-4 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold outline-none transition-[border-color,box-shadow]"
          style={fieldStyle(invalid)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span style={{ color: value ? "var(--fg-heading)" : "var(--fg-muted)" }}>
            {activeLabel}
          </span>
          <span className="pointer-events-none flex shrink-0 items-center text-fg-muted" aria-hidden="true">
            <ChevronDownIcon open={open} />
          </span>
        </button>
        {open ? (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-1.5 shadow-2xl"
          >
            {options.map((option) => (
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
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg-heading">{option.label}</span>
                  {option.hint ? (
                    <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--fg-muted)" }}>
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <ErrorText message={errorMessage} />
    </div>
  );
}

function NameDetailsCard({ selected }: { selected: ProtectedDisputeNameOption }) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "Normalized name", value: selected.normalizedName },
    { label: "Parent name", value: selected.parentName ?? "—" },
    { label: "Category", value: categoryLabel(selected.category) },
    { label: "Redeemed", value: selected.redeemed ? "Yes" : "No" },
    { label: "Current reason", value: selected.reason?.trim() || "—" },
    { label: "Protected", value: formatTimestamp(selected.protectedAt) },
  ];

  if (selected.status === "rejected") {
    fields.push(
      { label: "Rejected", value: formatTimestamp(selected.rejectedAt) },
      { label: "Rejected reason", value: selected.rejectedReason?.trim() || "—" },
    );
  }

  fields.push(
    { label: "Updated", value: formatTimestamp(selected.updatedAt) },
    { label: "Created", value: formatTimestamp(selected.createdAt) },
  );

  return (
    <div
      className="rounded-2xl border px-4 py-4 sm:px-5 sm:py-5"
      style={{
        borderColor: "color-mix(in srgb, var(--faq-border) 88%, transparent)",
        background:
          "color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent)",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--fg-muted)" }}
          >
            Selected name
          </p>
          <p className="mt-1 text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
            {selected.label}
          </p>
        </div>
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em]"
          style={getStatusStyle(selected.status)}
        >
          {getStatusLabel(selected.status)}
        </span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt
              className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--fg-muted)" }}
            >
              {field.label}
            </dt>
            <dd
              className="mt-1 break-words text-sm leading-6"
              style={{ color: "var(--fg-body)" }}
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function useDisputeNameOptions(query: string, refreshKey = 0) {
  const [options, setOptions] = useState<ProtectedDisputeNameOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/protected/disputes/options?${new URLSearchParams({
            q: query,
          }).toString()}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to load names.");
        }

        const payload = (await response.json()) as {
          options?: ProtectedDisputeNameOption[];
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
  }, [query, refreshKey]);

  return { options, isLoading };
}

export default function ProtectedDisputeForm({
  returnHref = "/protected",
  initialName = null,
}: ProtectedDisputeFormProps) {
  void returnHref;
  const prefilledName = (initialName ?? "").trim();
  const initialContact = useMemo(
    () => ({ uid: crypto.randomUUID(), kind: "email" as const, value: "" }),
    [],
  );
  const [nameInput, setNameInput] = useState(prefilledName);
  const [selectedName, setSelectedName] = useState<ProtectedDisputeNameOption | null>(null);
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([""]);
  const [contacts, setContacts] = useState<ContactRow[]>([initialContact]);
  const [preferredContactUid, setPreferredContactUid] = useState<string>(initialContact.uid);
  const [unifiedAddress, setUnifiedAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [unifiedAddressError, setUnifiedAddressError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<ProtectedDisputePayload | null>(null);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [optionsRefreshKey, setOptionsRefreshKey] = useState(0);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [categoryConfirmed, setCategoryConfirmed] = useState(false);
  const [reasonConfirmed, setReasonConfirmed] = useState(false);

  const { options: nameOptions, isLoading: isNameLoading } = useDisputeNameOptions(
    nameInput,
    optionsRefreshKey,
  );

  const filledEvidenceLinks = useMemo(
    () => evidenceLinks.map((entry) => entry.trim()).filter(Boolean),
    [evidenceLinks],
  );
  const allEvidenceLinksValid =
    filledEvidenceLinks.length === 0 || filledEvidenceLinks.every(validateUrlValue);

  const filledContacts = useMemo(
    () =>
      contacts
        .map((contact) => ({ ...contact, value: contact.value.trim() }))
        .filter((contact) => contact.value),
    [contacts],
  );

  const disputeStatus: ProtectedDisputeNameStatus | null = selectedName?.status ?? null;
  const reasonLabel =
    disputeStatus === "protected"
      ? "Why shouldn't this name be protected?"
      : "Why should this name be protected?";
  const reasonHint =
    disputeStatus === "protected"
      ? "Explain why protection is unnecessary, incorrect, or harmful. Include context that supports unprotecting this name."
      : "Explain the risk of impersonation, phishing, fraud, abuse, or public confusion. Include context that supports protecting this name.";

  function resetStepsAfterNameChange() {
    setCategory("");
    setCategoryConfirmed(false);
    setReason("");
    setReasonConfirmed(false);
    setEvidenceLinks([""]);
  }

  function selectNameOption(next: ProtectedDisputeNameOption) {
    setNameInput(next.value);
    setSelectedName(next);
    setNameError(null);
    setErrorMessage(null);
    setNameConfirmed(true);
    setCategory(next.category);
    setCategoryConfirmed(Boolean(next.category));
    setReason("");
    setReasonConfirmed(false);
    setEvidenceLinks([""]);
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
      setNameError("Select a non-redeemed protected or rejected name from the list.");
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
    setNameConfirmed(false);
    resetStepsAfterNameChange();
  }

  function closeSuccessModal() {
    if (typeof window !== "undefined") {
      window.location.assign("/protected/dispute");
    }
  }

  function updateEvidenceLink(index: number, nextValue: string) {
    setEvidenceLinks((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? nextValue : entry)),
    );
    setErrorMessage(null);
  }

  function addEvidenceLink() {
    setEvidenceLinks((current) => [...current, ""]);
  }

  function removeEvidenceLink(index: number) {
    setEvidenceLinks((current) => current.filter((_, entryIndex) => entryIndex !== index));
  }

  function addContact() {
    const kind = nextContactKind(contacts);
    if (!kind) return;
    const uid = crypto.randomUUID();
    setContacts((current) => [...current, { uid, kind, value: "" }]);
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

  function updateContactKind(uid: string, nextKind: ContactKind) {
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

  function validateOptionalContacts(): string | null {
    const seenKinds = new Set<string>();

    for (const contact of filledContacts) {
      if (seenKinds.has(contact.kind)) {
        return "Each contact method can only be listed once.";
      }
      seenKinds.add(contact.kind);

      if (contact.value.length > 200) {
        return "Contact details must be 200 characters or less.";
      }

      if (contact.kind === "email") {
        const emailValidationMessage = getEmailAddressValidationMessage(contact.value);
        if (emailValidationMessage) {
          return emailValidationMessage;
        }
      }
    }

    return null;
  }

  function validateOptionalUnifiedAddress(): string | null {
    const trimmedAddress = unifiedAddress.trim();
    if (!trimmedAddress) return null;

    const addressValidation = validateAddress(trimmedAddress);
    if (addressValidation.status !== "unified") {
      return addressValidation.warning || "Enter a valid Zcash Unified Address.";
    }

    return null;
  }

  function advanceNameStep(): boolean {
    setErrorMessage(null);

    if (!selectedName || nameInput.trim() !== selectedName.value) {
      setNameError("Select a non-redeemed protected or rejected name from the list.");
      setNameConfirmed(false);
      return false;
    }

    setNameError(null);
    setNameConfirmed(true);
    if (selectedName.category && !category) {
      setCategory(selectedName.category);
    }
    return true;
  }

  function advanceCategoryStep(): boolean {
    if (!category || !PROTECTED_NAME_CATEGORIES.includes(category as (typeof PROTECTED_NAME_CATEGORIES)[number])) {
      setErrorMessage("Select a valid category.");
      setCategoryConfirmed(false);
      return false;
    }

    setErrorMessage(null);
    setCategoryConfirmed(true);
    return true;
  }

  function advanceReasonStep(): boolean {
    if (!categoryConfirmed && !advanceCategoryStep()) {
      return false;
    }

    if (!reason.trim()) {
      setErrorMessage(
        disputeStatus === "protected"
          ? "Explain why this name shouldn't be protected."
          : "Explain why this name should be protected.",
      );
      setReasonConfirmed(false);
      return false;
    }

    if (!allEvidenceLinksValid) {
      setErrorMessage("Evidence links must start with http:// or https://.");
      setReasonConfirmed(false);
      return false;
    }

    setErrorMessage(null);
    setReasonConfirmed(true);
    return true;
  }

  const showDetails = nameConfirmed && !!selectedName;
  const showCategory = showDetails;
  const showReason = showCategory && categoryConfirmed;
  const showEvidence = showReason;
  const showOptionalFields = showReason && reasonConfirmed;
  const showSubmit = showOptionalFields;

  const nameStepDisabled =
    !selectedName || nameInput.trim().length === 0 || nameInput.trim() !== selectedName.value;
  const reasonStepDisabled = reason.trim().length === 0;
  const totalSteps = 4;

  const activeNextAction =
    !nameConfirmed
      ? advanceNameStep
      : !categoryConfirmed
        ? advanceCategoryStep
        : !reasonConfirmed
          ? advanceReasonStep
          : null;

  const activeNextDisabled =
    !nameConfirmed
      ? nameStepDisabled
      : !categoryConfirmed
        ? category.trim().length === 0
        : !reasonConfirmed
          ? reasonStepDisabled
          : false;

  let currentStep = 1;
  if (nameConfirmed) currentStep = 2;
  if (categoryConfirmed) currentStep = 3;
  if (showSubmit) currentStep = 4;

  function handleStepAdvance() {
    if (showSubmit) {
      void handleSubmit();
      return;
    }

    if (!activeNextAction || activeNextDisabled) return;
    activeNextAction();
  }

  function handleFormKeyDown(event: ReactKeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.tagName === "TEXTAREA") return;
    if (target.tagName !== "INPUT") return;
    if (!["text", "email", "url", "search"].includes((target as HTMLInputElement).type)) {
      return;
    }

    event.preventDefault();
    handleStepAdvance();
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    if (!nameConfirmed && !advanceNameStep()) return;
    if (!categoryConfirmed && !advanceCategoryStep()) return;
    if (!reasonConfirmed && !advanceReasonStep()) return;

    if (!selectedName) {
      setNameError("Select a non-redeemed protected or rejected name from the list.");
      return;
    }

    const nextContactError = validateOptionalContacts();
    const nextUnifiedAddressError = validateOptionalUnifiedAddress();

    setErrorMessage(null);
    setContactError(nextContactError);
    setUnifiedAddressError(nextUnifiedAddressError);

    if (!category) {
      setErrorMessage("Select a valid category.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage(
        disputeStatus === "protected"
          ? "Explain why this name shouldn't be protected."
          : "Explain why this name should be protected.",
      );
      return;
    }

    if (!allEvidenceLinksValid) {
      setErrorMessage("Evidence links must start with http:// or https://.");
      return;
    }

    if (nextContactError) {
      return;
    }

    if (nextUnifiedAddressError) {
      return;
    }

    const payload: ProtectedDisputePayload = {
      name: selectedName.value,
      normalizedName: selectedName.normalizedName,
      parentName: selectedName.parentName,
      category,
      reason: reason.trim(),
      evidenceLinks: filledEvidenceLinks,
      contactMethods: filledContacts.map((contact) => ({
        kind: contact.kind,
        value: contact.value.trim(),
        preferred: contact.uid === preferredContactUid,
      })) as ProtectedSuggestionContactMethod[],
      unifiedAddress: unifiedAddress.trim() || null,
    };

    setErrorMessage(null);
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
      const response = await fetch("/api/protected/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingPayload,
          captcha_token: solution.captcha_token,
          captcha_answer: solution.captcha_answer,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
      };

      if (!response.ok || !result.ok) {
        const message = result.error || "Failed to submit dispute.";
        const captchaFailed =
          result.code === "captcha_failed" || message.toLowerCase().includes("human check");

        if (captchaFailed) {
          throw new Error(message);
        }

        if (message.includes("Unified Address")) {
          setUnifiedAddressError(message);
        } else {
          setErrorMessage(message);
        }

        setCaptchaOpen(false);
        setPendingPayload(null);
        return;
      }

      setSubmittedName(pendingPayload.name);
      setOptionsRefreshKey((current) => current + 1);
      setCaptchaOpen(false);
      setPendingPayload(null);
      setSuccessModalOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit dispute.";

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
        description="Complete this quick check to submit your protected name dispute."
        confirmLabel="Submit dispute"
        submitting={isSubmitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <ProtectedDisputeSuccessModal
        isOpen={successModalOpen && !!submittedName}
        name={submittedName ?? ""}
        onClose={closeSuccessModal}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleStepAdvance();
        }}
        onKeyDown={handleFormKeyDown}
        aria-label="Protected dispute form"
        className="w-full rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div className="space-y-5">
          <SearchableNameInput
            id="protected-dispute-name"
            label="Name to dispute"
            description="Search and select a non-redeemed protected or rejected name from the list."
            placeholder="Search protected or rejected names"
            value={nameInput}
            onChange={handleNameInputChange}
            onSelect={selectNameOption}
            options={nameOptions}
            loading={isNameLoading}
            emptyMessage="No matching non-redeemed protected or rejected names."
            invalid={!!nameError}
            errorMessage={nameError}
          />

          {showDetails && selectedName ? <NameDetailsCard selected={selectedName} /> : null}

          {showCategory ? (
            <DropdownField
              id="protected-dispute-category"
              label="Category *"
              description="Confirm or update the category for reevaluation."
              placeholder="Select category"
              value={category}
              options={CATEGORY_OPTIONS}
              onSelect={(next) => {
                setCategory(next);
                setErrorMessage(null);
                setCategoryConfirmed(true);
                setReasonConfirmed(false);
              }}
            />
          ) : null}

          {showReason ? (
            <div>
              <div
                aria-hidden="true"
                className="mb-5 border-t"
                style={{ borderColor: "color-mix(in srgb, var(--faq-border) 72%, transparent)" }}
              />
              <label
                htmlFor="protected-dispute-reason"
                className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--fg-muted)" }}
              >
                {reasonLabel}
                <RequiredAsterisk />
              </label>
              <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                {reasonHint}
              </p>
              <textarea
                id="protected-dispute-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrorMessage(null);
                  setReasonConfirmed(false);
                }}
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  ...fieldStyle(false),
                  resize: "vertical",
                }}
              />
            </div>
          ) : null}

          {showEvidence ? (
            <div>
              <label
                className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Evidence links (optional)
              </label>
              <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                Add official websites, public profiles, technical documentation, abuse reports, news
                reports, or other supporting sources.
              </p>
              <div className="flex flex-col gap-3">
                {evidenceLinks.map((link, index) => (
                  <div key={`evidence-${index}`} className="flex items-center gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(event) => updateEvidenceLink(index, event.target.value)}
                      placeholder="https://"
                      className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={fieldStyle(false)}
                    />
                    {evidenceLinks.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeEvidenceLink(index)}
                        aria-label="Remove evidence link"
                        className="zns-hover-accent cursor-pointer px-1 text-2xl leading-none opacity-60 hover:opacity-100"
                        style={{ color: "var(--fg-body)" }}
                      >
                        &times;
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addEvidenceLink}
                className="zns-hover-accent mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--fg-body)" }}
              >
                <PlusIcon />
                <span>Add another link</span>
              </button>
              {filledEvidenceLinks.length > 0 && !allEvidenceLinksValid ? (
                <ErrorText message="Evidence links must start with http:// or https://." />
              ) : null}
            </div>
          ) : null}

          {showOptionalFields ? (
            <>
              <div>
                <div
                  aria-hidden="true"
                  className="mb-5 border-t"
                  style={{ borderColor: "color-mix(in srgb, var(--faq-border) 72%, transparent)" }}
                />
                <label
                  className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Contact method(s)
                </label>
                <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                  We may contact you if we need more information.
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
                            name="protected-dispute-preferred-contact"
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
                        <select
                          value={contact.kind}
                          onChange={(event) =>
                            updateContactKind(contact.uid, event.target.value as ContactKind)
                          }
                          className="zns-themed-select cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none"
                          style={{ ...fieldStyle(!!contactError), minWidth: 130 }}
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
                          onChange={(event) => updateContactValue(contact.uid, event.target.value)}
                          placeholder={CONTACT_PLACEHOLDER[contact.kind]}
                          maxLength={200}
                          className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                          style={fieldStyle(!!contactError)}
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
                {contacts.length < CONTACT_KINDS.length ? (
                  <button
                    type="button"
                    onClick={addContact}
                    className="zns-hover-accent mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                    style={{ color: "var(--fg-body)" }}
                  >
                    <PlusIcon />
                    <span>Add another contact method</span>
                  </button>
                ) : null}
                <ErrorText message={contactError} />
              </div>

              <div>
                <label
                  htmlFor="protected-dispute-unified-address"
                  className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Zcash Unified Address
                </label>
                <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                  We may reward you with ZEC if we accept your dispute.
                </p>
                <input
                  id="protected-dispute-unified-address"
                  type="text"
                  value={unifiedAddress}
                  onChange={(event) => {
                    setUnifiedAddress(event.target.value);
                    setUnifiedAddressError(null);
                  }}
                  placeholder="u1..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={fieldStyle(!!unifiedAddressError)}
                  autoComplete="off"
                />
                <ErrorText message={unifiedAddressError} />
              </div>
            </>
          ) : null}

          {showDetails && errorMessage ? (
            <p className="text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
              {errorMessage}
            </p>
          ) : null}

          <div
            className="flex items-center justify-between gap-3 border-t pt-4 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--faq-border) 72%, transparent)",
              color: "var(--fg-muted)",
            }}
          >
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            {showSubmit ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || captchaOpen}
                className="inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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
                  "Submit for review"
                )}
              </button>
            ) : activeNextAction ? (
              <InlineStepButton onClick={activeNextAction} disabled={activeNextDisabled} />
            ) : null}
          </div>
        </div>
      </form>
    </>
  );
}
