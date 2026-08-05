"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import ProtectedSuggestionSuccessModal from "@/components/protected/ProtectedSuggestionSuccessModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { getEmailAddressValidationMessage } from "@/lib/email-address";
import {
  PROTECTED_NAME_CATEGORIES,
  type ProtectedSuggestionContactMethod,
  type ProtectedSuggestionOption,
  type ProtectedSuggestionOptionKind,
  type ProtectedSuggestionPayload,
  type ProtectedSuggestionType,
} from "@/lib/protected/shared";
import { CONTACT_KINDS, CONTACT_LABEL, CONTACT_PLACEHOLDER, type ContactKind } from "@/lib/types";
import { validateAddress } from "@/lib/zns/address-validation";

type ProtectedSuggestionFormProps = {
  returnHref?: string;
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

type NameValidationResult = {
  exists: boolean;
  status: string | null;
};

const NAME_ALREADY_PROTECTED_MESSAGE = "This name is already protected";
const NAME_ALREADY_SUGGESTED_MESSAGE = "This name was already suggested";
const NAME_AVAILABLE_MESSAGE = "This name is not protected yet";

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
      className="inline-flex h-9 items-center justify-center rounded-[13px] px-4 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:hover:opacity-100"
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

function SuggestionTypeToggle({
  value,
  onChange,
}: {
  value: ProtectedSuggestionType;
  onChange: (next: ProtectedSuggestionType) => void;
}) {
  const options: Array<{ value: ProtectedSuggestionType; label: string }> = [
    { value: "canonical", label: "Parent Name (e.g., zodl)" },
    { value: "variant", label: "Variant name (e.g., zodlsupport)" },
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className="inline-flex cursor-pointer items-center gap-2 text-sm"
            style={{ color: "var(--fg-heading)" }}
          >
            <input
              type="radio"
              name="protected-suggestion-type"
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full"
              style={{
                border: `2px solid ${selected ? "var(--color-accent-green)" : "var(--border-muted)"}`,
                background: selected ? "var(--color-accent-green)" : "transparent",
                boxShadow: selected ? "inset 0 0 0 2px var(--color-raised)" : "none",
              }}
              aria-hidden="true"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
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

function SearchableTextInput({
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
  strictSelection = false,
  invalid = false,
  errorMessage = null,
  onEmptyAction,
  emptyActionLabel,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  onSelect: (next: string) => void;
  options: ProtectedSuggestionOption[];
  loading: boolean;
  emptyMessage: string;
  strictSelection?: boolean;
  invalid?: boolean;
  errorMessage?: string | null;
  onEmptyAction?: (() => void) | null;
  emptyActionLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shouldShowMenu =
    open && (loading || options.length > 0 || (strictSelection && value.trim().length > 0));

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
      {label ? (
        <label
          htmlFor={id}
          className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--fg-muted)" }}
        >
          {label}
        </label>
      ) : null}
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
            onChange(event.target.value);
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
            className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-1.5 shadow-2xl"
          >
            {loading ? (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--fg-muted)" }}>
                Loading suggestions...
              </div>
            ) : options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_10%,transparent)]"
                  style={{ color: "var(--fg-body)" }}
                >
                  <span>{option.label}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--fg-muted)" }}>
                <span>{emptyMessage}</span>
                {onEmptyAction && emptyActionLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      onEmptyAction();
                      setOpen(false);
                    }}
                    className="ml-1 font-semibold underline underline-offset-2"
                    style={{ color: "var(--fg-heading)" }}
                  >
                    {emptyActionLabel}
                  </button>
                ) : null}
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
          className="flex min-h-[46px] w-full items-center justify-between gap-4 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold outline-none transition-[border-color,box-shadow]"
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
                className="flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_10%,transparent)]"
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

function useSuggestionOptions(
  kind: ProtectedSuggestionOptionKind,
  query: string,
  refreshKey = 0,
  enabled = true,
) {
  const [options, setOptions] = useState<ProtectedSuggestionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadOptions() {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/protected/suggestions/options?${new URLSearchParams({
            kind,
            q: query,
          }).toString()}`,
          { cache: "no-store", signal: controller.signal },
        );

        const payload = (await response.json()) as {
          ok?: boolean;
          options?: ProtectedSuggestionOption[];
        };

        if (!response.ok || !payload.ok) {
          throw new Error("Failed to load suggestions.");
        }

        setOptions(payload.options ?? []);
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
  }, [enabled, kind, query, refreshKey]);

  return { options, isLoading };
}

export default function ProtectedSuggestionForm({
  returnHref = "/protected",
}: ProtectedSuggestionFormProps) {
  const initialContact = useMemo(
    () => ({ uid: crypto.randomUUID(), kind: "email" as const, value: "" }),
    [],
  );
  const [name, setName] = useState("");
  const [suggestionType, setSuggestionType] = useState<ProtectedSuggestionType>("canonical");
  const [canonicalInput, setCanonicalInput] = useState("");
  const [selectedCanonicalName, setSelectedCanonicalName] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([""]);
  const [contacts, setContacts] = useState<ContactRow[]>([initialContact]);
  const [preferredContactUid, setPreferredContactUid] = useState<string>(initialContact.uid);
  const [unifiedAddress, setUnifiedAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameStatusMessage, setNameStatusMessage] = useState<string | null>(null);
  const [nameStatusTone, setNameStatusTone] = useState<"success" | "error" | null>(null);
  const [canonicalError, setCanonicalError] = useState<string | null>(null);
  const [showCanonicalDropdown, setShowCanonicalDropdown] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [unifiedAddressError, setUnifiedAddressError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [canonicalOptionsRefreshKey, setCanonicalOptionsRefreshKey] = useState(0);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameShakeTick, setNameShakeTick] = useState(0);
  const [unifiedAddressShakeTick, setUnifiedAddressShakeTick] = useState(0);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [suggestionTypeConfirmed, setSuggestionTypeConfirmed] = useState(false);
  const [canonicalConfirmed, setCanonicalConfirmed] = useState(false);
  const [categoryConfirmed, setCategoryConfirmed] = useState(false);
  const [reasonConfirmed, setReasonConfirmed] = useState(false);
  const [evidenceConfirmed, setEvidenceConfirmed] = useState(false);
  const { options: canonicalOptions, isLoading: isCanonicalLoading } =
    useSuggestionOptions("canonical", canonicalInput, canonicalOptionsRefreshKey);
  const variantCanonicalQuery = useMemo(
    () =>
      suggestionType === "variant" && nameConfirmed
        ? sanitizeNameInput(name.trim()).toLowerCase()
        : "",
    [name, nameConfirmed, suggestionType],
  );
  const {
    options: variantCanonicalSuggestions,
    isLoading: isVariantCanonicalSuggestionsLoading,
  } = useSuggestionOptions(
    "canonical",
    variantCanonicalQuery,
    canonicalOptionsRefreshKey,
    suggestionType === "variant" && nameConfirmed,
  );

  const filledEvidenceLinks = useMemo(
    () => evidenceLinks.map((entry) => entry.trim()).filter(Boolean),
    [evidenceLinks],
  );
  const allEvidenceLinksValid =
    filledEvidenceLinks.length > 0 && filledEvidenceLinks.every(validateUrlValue);

  const filledContacts = useMemo(
    () => contacts.map((contact) => ({ ...contact, value: contact.value.trim() })).filter((contact) => contact.value),
    [contacts],
  );
  const visibleVariantCanonicalSuggestions = useMemo(
    () =>
      variantCanonicalSuggestions.filter(
        (option, index, options) =>
          options.findIndex(
            (candidate) => candidate.value.toLowerCase() === option.value.toLowerCase(),
          ) === index,
      ),
    [variantCanonicalSuggestions],
  );

  function resetStepsAfterCanonicalChange() {
    setCategory("");
    setCategoryConfirmed(false);
    setReasonConfirmed(false);
    setEvidenceConfirmed(false);
  }

  function handleCanonicalInputChange(next: string) {
    setCanonicalInput(next);
    setSelectedCanonicalName(null);
    setCanonicalError(null);
    setErrorMessage(null);
    setCanonicalConfirmed(false);
    resetStepsAfterCanonicalChange();
  }

  function selectCanonicalOption(next: ProtectedSuggestionOption) {
    setCanonicalInput(next.value);
    setSelectedCanonicalName(next.value);
    setCanonicalError(null);
    setErrorMessage(null);
    setCanonicalConfirmed(true);
    setCategory(next.category ?? "");
    setCategoryConfirmed(Boolean(next.category));
    setReasonConfirmed(false);
    setEvidenceConfirmed(false);
  }

  function closeSuccessModal() {
    if (typeof window !== "undefined") {
      window.location.assign("/protected/suggest");
    }
  }

  function resetForm() {
    const nextInitialContact = { uid: crypto.randomUUID(), kind: "email" as const, value: "" };
    setName("");
    setSuggestionType("canonical");
    setCanonicalInput("");
    setSelectedCanonicalName(null);
    setCategory("");
    setReason("");
    setEvidenceLinks([""]);
    setContacts([nextInitialContact]);
    setPreferredContactUid(nextInitialContact.uid);
    setUnifiedAddress("");
    setErrorMessage(null);
    setNameError(null);
    setNameStatusMessage(null);
    setNameStatusTone(null);
    setCanonicalError(null);
    setShowCanonicalDropdown(false);
    setContactError(null);
    setUnifiedAddressError(null);
    setSubmittedName(null);
    setSuccessModalOpen(false);
    setNameConfirmed(false);
    setSuggestionTypeConfirmed(false);
    setCanonicalConfirmed(false);
    setCategoryConfirmed(false);
    setReasonConfirmed(false);
    setEvidenceConfirmed(false);
    setCanonicalOptionsRefreshKey((current) => current + 1);
  }

  function updateEvidenceLink(index: number, nextValue: string) {
    setEvidenceLinks((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? nextValue : entry)),
    );
    setErrorMessage(null);
    setEvidenceConfirmed(false);
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

  async function validateProtectedName(nameValue: string): Promise<NameValidationResult> {
    const response = await fetch(
      `/api/protected/view?${new URLSearchParams({
        page: "1",
        pageSize: "1",
        searchMode: "exact",
        search: nameValue.toLowerCase(),
        redeemedOnly: "false",
        underReviewOnly: "false",
      }).toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("Failed to validate name.");
    }

    const payload = (await response.json()) as {
      rows?: Array<{ status?: string | null }>;
      totalCount?: number;
    };
    const firstStatus = payload.rows?.[0]?.status ?? null;
    return {
      exists: (payload.totalCount ?? 0) > 0,
      status: firstStatus,
    };
  }

  async function advanceNameStep(): Promise<boolean> {
    if (isCheckingName) return false;

    const sanitizedName = sanitizeNameInput(name.trim());
    setErrorMessage(null);

    if (!sanitizedName) {
      setNameError("Enter a name to review.");
      setNameStatusMessage("Enter a name to review.");
      setNameStatusTone("error");
      setNameShakeTick((current) => current + 1);
      return false;
    }

    if (sanitizedName !== name.trim()) {
      setName(sanitizedName);
    }

    setIsCheckingName(true);
    setNameStatusMessage(null);
    setNameStatusTone(null);
    try {
      const result = await validateProtectedName(sanitizedName);
      if (result.exists) {
        const duplicateMessage =
          result.status === "protected"
            ? NAME_ALREADY_PROTECTED_MESSAGE
            : NAME_ALREADY_SUGGESTED_MESSAGE;
        setNameError(duplicateMessage);
        setNameStatusMessage(duplicateMessage);
        setNameStatusTone("error");
        setNameShakeTick((current) => current + 1);
        setNameConfirmed(false);
        return false;
      }

      setNameError(null);
      setNameStatusMessage(NAME_AVAILABLE_MESSAGE);
      setNameStatusTone("success");
      setNameConfirmed(true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate name.";
      setErrorMessage(message);
      setNameConfirmed(false);
      setNameStatusMessage(null);
      setNameStatusTone(null);
      return false;
    } finally {
      setIsCheckingName(false);
    }
  }

  function advanceSuggestionTypeStep() {
    setErrorMessage(null);
    setSuggestionTypeConfirmed(true);
    if (suggestionType === "canonical") {
      setCanonicalConfirmed(true);
    }
  }

  function advanceCanonicalStep() {
    if (suggestionType !== "variant") {
      setCanonicalConfirmed(true);
      return true;
    }

    if (!selectedCanonicalName || canonicalInput.trim() !== selectedCanonicalName) {
      setCanonicalError("A canonical name must be selected from the dropdown list.");
      return false;
    }

    setCanonicalError(null);
    setCanonicalConfirmed(true);
    return true;
  }

  function advanceCategoryStep() {
    if (!category) {
      setErrorMessage("Select a valid category.");
      setCategoryConfirmed(false);
      return false;
    }

    setErrorMessage(null);
    setCategoryConfirmed(true);
    return true;
  }

  function advanceReasonStep() {
    if (!categoryConfirmed && !advanceCategoryStep()) {
      return false;
    }

    if (!reason.trim()) {
      setErrorMessage("Explain why this name should be protected.");
      setReasonConfirmed(false);
      setEvidenceConfirmed(false);
      return false;
    }

    if (!filledEvidenceLinks.every(validateUrlValue)) {
      setErrorMessage("Evidence links must start with http:// or https://.");
      setReasonConfirmed(false);
      setEvidenceConfirmed(false);
      return false;
    }

    setErrorMessage(null);
    setReasonConfirmed(true);
    setEvidenceConfirmed(true);
    return true;
  }

  const showSuggestionType = nameConfirmed;
  const showCanonical =
    showSuggestionType && suggestionTypeConfirmed && suggestionType === "variant";
  const canonicalReady =
    suggestionType !== "variant" || canonicalConfirmed;
  const showCategory = showSuggestionType && suggestionTypeConfirmed && canonicalReady;
  const showReason = showCategory && categoryConfirmed;
  const showEvidence = showReason;
  const showOptionalFields = showReason && reasonConfirmed;
  const showSubmit = showOptionalFields;
  const nameStepDisabled =
    isCheckingName
    || name.trim().length === 0
    || nameStatusMessage === NAME_ALREADY_PROTECTED_MESSAGE;
  const canonicalStepDisabled =
    canonicalInput.trim().length === 0
    || !selectedCanonicalName
    || canonicalInput.trim() !== selectedCanonicalName;
  const reasonStepDisabled = reason.trim().length === 0;
  const totalSteps = suggestionType === "variant" ? 6 : 5;
  const activeNextAction =
    !nameConfirmed
      ? (() => void advanceNameStep())
      : !suggestionTypeConfirmed
        ? advanceSuggestionTypeStep
        : showCanonical && !canonicalConfirmed
          ? advanceCanonicalStep
          : !categoryConfirmed
            ? advanceCategoryStep
            : !reasonConfirmed
            ? advanceReasonStep
              : null;
  const activeNextDisabled =
    !nameConfirmed
      ? nameStepDisabled
      : !suggestionTypeConfirmed
        ? false
        : showCanonical && !canonicalConfirmed
          ? canonicalStepDisabled
          : !categoryConfirmed
            ? category.trim().length === 0
            : !reasonConfirmed
              ? reasonStepDisabled
              : false;
  let currentStep = 1;
  if (nameConfirmed) currentStep = 2;
  if (suggestionTypeConfirmed) currentStep = 3;
  if (suggestionType === "variant" && canonicalConfirmed) currentStep = 4;
  if (suggestionType === "canonical" && categoryConfirmed) currentStep = 4;
  if (suggestionType === "variant" && categoryConfirmed) currentStep = 5;
  if (showSubmit) currentStep = totalSteps;

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
    if (isSubmitting || isCheckingName) return;

    const nameStepValid = nameConfirmed || (await advanceNameStep());
    if (!nameStepValid) return;

    if (!suggestionTypeConfirmed) {
      advanceSuggestionTypeStep();
      return;
    }

    if (suggestionType === "variant" && !canonicalConfirmed && !advanceCanonicalStep()) {
      return;
    }

    if (!categoryConfirmed && !advanceCategoryStep()) {
      return;
    }

    if (!reasonConfirmed && !advanceReasonStep()) {
      return;
    }

    const sanitizedName = sanitizeNameInput(name.trim());
    const nextContactError = validateOptionalContacts();
    const nextUnifiedAddressError = validateOptionalUnifiedAddress();
    const nextCanonicalError =
      suggestionType === "variant" && !selectedCanonicalName
        ? "The parent name must be submitted before its variants."
        : null;

    setErrorMessage(null);
    setContactError(nextContactError);
    setUnifiedAddressError(nextUnifiedAddressError);
    setCanonicalError(nextCanonicalError);

    if (!sanitizedName) {
      setNameError("Enter a name to review.");
      setNameShakeTick((current) => current + 1);
      return;
    }

    if (sanitizedName !== name.trim()) {
      setName(sanitizedName);
    }

    if (nameError) {
      setNameShakeTick((current) => current + 1);
      return;
    }

    if (nextCanonicalError) {
      return;
    }

    if (!category) {
      setErrorMessage("Select a valid category.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("Explain why this name should be protected.");
      return;
    }

    if (!filledEvidenceLinks.every(validateUrlValue)) {
      setErrorMessage("Evidence links must start with http:// or https://.");
      return;
    }

    if (nextContactError) {
      return;
    }

    if (nextUnifiedAddressError) {
      setUnifiedAddressShakeTick((current) => current + 1);
      return;
    }

    const payload: ProtectedSuggestionPayload = {
      suggestionType,
      name: sanitizedName,
      parentName: suggestionType === "variant" ? selectedCanonicalName : null,
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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/protected/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        const message = result.error || "Failed to submit suggestion.";
        if (message.includes("already")) {
          setNameError(NAME_ALREADY_SUGGESTED_MESSAGE);
          setNameStatusMessage(NAME_ALREADY_SUGGESTED_MESSAGE);
          setNameStatusTone("error");
          setNameShakeTick((current) => current + 1);
          throw new Error(message);
        }
        if (message.includes("Unified Address")) {
          setUnifiedAddressError(message);
          setUnifiedAddressShakeTick((current) => current + 1);
          throw new Error(message);
        }
        throw new Error(message);
      }

      setSubmittedName(payload.name);
      setCanonicalOptionsRefreshKey((current) => current + 1);
      setSuccessModalOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit suggestion.";
      if (!message.includes("already") && !message.includes("Unified Address")) {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <ProtectedSuggestionSuccessModal
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
        aria-label="Protected suggestion form"
        className="w-full rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="protected-suggestion-name"
              className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Name to protect
              <RequiredAsterisk />
            </label>
            <div className="relative">
              <input
                id="protected-suggestion-name"
                type="text"
                value={name}
                onChange={(event) => {
                  const sanitized = sanitizeNameInput(event.target.value);
                  setName(sanitized);
                  setNameError(null);
                  setNameStatusMessage(null);
                  setNameStatusTone(null);
                  setErrorMessage(null);
                  setNameConfirmed(false);
                  setSuggestionType("canonical");
                  setSuggestionTypeConfirmed(false);
                  setCanonicalConfirmed(false);
                  setShowCanonicalDropdown(false);
                  setCategoryConfirmed(false);
                  setReasonConfirmed(false);
                  setEvidenceConfirmed(false);
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  const pasted = event.clipboardData.getData("text");
                  const sanitized = sanitizeNameInput(pasted);
                  if (!sanitized) return;
                  setName((current) => sanitizeNameInput(current + sanitized));
                  setNameError(null);
                  setNameStatusMessage(null);
                  setNameStatusTone(null);
                  setErrorMessage(null);
                  setNameConfirmed(false);
                  setSuggestionType("canonical");
                  setSuggestionTypeConfirmed(false);
                  setCanonicalConfirmed(false);
                  setShowCanonicalDropdown(false);
                  setCategoryConfirmed(false);
                  setReasonConfirmed(false);
                  setEvidenceConfirmed(false);
                }}
                placeholder="Letters and numbers only"
                className={`w-full rounded-2xl px-4 py-2.5 text-sm outline-none ${nameShakeTick ? "form-shake" : ""}`}
                style={fieldStyle(!!nameError)}
                autoComplete="off"
              />
            </div>
            <div className="mt-2 min-h-[1.5rem] pl-4" aria-live="polite">
              {isCheckingName ? (
                <p className="text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                  <AnimatedLoadingLabel
                    label="Checking protected names for duplicates"
                    active
                  />
                </p>
              ) : nameStatusMessage ? (
                <p
                  className="text-xs leading-6"
                  style={{
                    color:
                      nameStatusTone === "success"
                        ? "var(--color-accent-green)"
                        : "var(--accent-red, #e05252)",
                  }}
                >
                  {nameStatusMessage}
                </p>
              ) : null}
            </div>
          </div>

          {showSuggestionType ? (
            <div>
              <label
                className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Suggestion type
                <RequiredAsterisk />
              </label>
              <SuggestionTypeToggle
                value={suggestionType}
                onChange={(next) => {
                  setSuggestionType(next);
                  setCanonicalInput("");
                  setSelectedCanonicalName(null);
                  setCanonicalError(null);
                  setErrorMessage(null);
                  setSuggestionTypeConfirmed(false);
                  setCanonicalConfirmed(false);
                  setShowCanonicalDropdown(false);
                  setCategory("");
                  setCategoryConfirmed(false);
                  setReasonConfirmed(false);
                  setEvidenceConfirmed(false);
                  setSuggestionTypeConfirmed(true);
                  if (next === "canonical") {
                    setCanonicalConfirmed(true);
                  }
                }}
              />
            </div>
          ) : null}

          {showCanonical ? (
            <div>
              {!isVariantCanonicalSuggestionsLoading && visibleVariantCanonicalSuggestions.length > 0 ? (
                <div className="mt-3">
                  <p
                    className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Associated with
                  </p>
                  {!showCanonicalDropdown ? (
                    <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                      <button
                        type="button"
                        onClick={() => setShowCanonicalDropdown(true)}
                        className="font-semibold underline underline-offset-2"
                        style={{ color: "var(--fg-body)" }}
                      >
                        Not seeing the right name?
                      </button>
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {visibleVariantCanonicalSuggestions.map((option) => {
                      const selected = selectedCanonicalName === option.value;

                      return (
                        <button
                          key={`variant-canonical-suggestion-${option.value}`}
                          type="button"
                          onClick={() => selectCanonicalOption(option)}
                          className="inline-flex min-h-9 items-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors"
                          style={{
                            borderColor: selected
                              ? "var(--color-accent-green)"
                              : "color-mix(in srgb, var(--fg-heading) 16%, var(--faq-border))",
                            background: selected
                              ? "color-mix(in srgb, var(--color-accent-green) 12%, var(--color-bg-elevated))"
                              : "var(--color-bg-elevated)",
                            color: selected ? "var(--fg-heading)" : "var(--fg-body)",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {showCanonicalDropdown ? (
                <div className="mt-3">
                  <SearchableTextInput
                    id="protected-suggestion-canonical"
                    label=""
                    description="If no parent name exists, go back to step 1 to suggest the name for protection first."
                    placeholder="Select canonical name"
                    value={canonicalInput}
                    onChange={handleCanonicalInputChange}
                    onSelect={(next) =>
                      selectCanonicalOption(
                        canonicalOptions.find((option) => option.value === next)
                        ?? { value: next, label: next },
                      )
                    }
                    options={canonicalOptions}
                    loading={isCanonicalLoading}
                    emptyMessage="No matching parent names."
                    onEmptyAction={() => {
                      setCanonicalInput("");
                      setSelectedCanonicalName(null);
                      setCanonicalError(null);
                      setErrorMessage(null);
                    }}
                    emptyActionLabel="Reset search"
                    strictSelection
                    invalid={!!canonicalError}
                    errorMessage={canonicalError}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {showCategory ? (
            <DropdownField
              id="protected-suggestion-category"
              label="Category *"
              description="Select the category that applies to the submitted name."
              placeholder="Select category"
              value={category}
              options={CATEGORY_OPTIONS}
              onSelect={(next) => {
                setCategory(next);
                setErrorMessage(null);
                setCategoryConfirmed(true);
                setReasonConfirmed(false);
                setEvidenceConfirmed(false);
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
                htmlFor="protected-suggestion-reason"
                className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--fg-muted)" }}
              >
                Why should this name be protected?
                <RequiredAsterisk />
              </label>
              <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                Explain the risk of impersonation, phishing, fraud, abuse, or public confusion. For
                a variant, explain its relationship to the canonical name.
              </p>
              <textarea
                id="protected-suggestion-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrorMessage(null);
                  setReasonConfirmed(false);
                  setEvidenceConfirmed(false);
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
                        className="cursor-pointer px-1 text-2xl leading-none opacity-60 hover:opacity-100"
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
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--fg-body)" }}
              >
                <PlusIcon />
                <span className="underline">Add another link</span>
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
                            name="protected-suggestion-preferred-contact"
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
                          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none"
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
                            className="cursor-pointer px-1 text-2xl leading-none opacity-60 hover:opacity-100"
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
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                    style={{ color: "var(--fg-body)" }}
                  >
                    <PlusIcon />
                    <span className="underline">Add another contact method</span>
                  </button>
                ) : null}
                <ErrorText message={contactError} />
              </div>

              <div>
                <label
                  htmlFor="protected-suggestion-unified-address"
                  className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Zcash Unified Address
                </label>
                <p className="mb-2 text-xs leading-6" style={{ color: "var(--fg-muted)" }}>
                  We may reward you with ZEC if we approve your suggestion.
                </p>
                <input
                  id="protected-suggestion-unified-address"
                  type="text"
                  value={unifiedAddress}
                  onChange={(event) => {
                    setUnifiedAddress(event.target.value);
                    setUnifiedAddressError(null);
                  }}
                  placeholder="u1..."
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none ${unifiedAddressShakeTick ? "form-shake" : ""}`}
                  style={fieldStyle(!!unifiedAddressError)}
                  autoComplete="off"
                />
                <ErrorText message={unifiedAddressError} />
              </div>
            </>
          ) : null}

          {showSuggestionType && errorMessage ? (
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
            <span>Step {currentStep} of {totalSteps}</span>
            {showSubmit ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || isCheckingName}
                className="inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                {isSubmitting ? (
                  <AnimatedLoadingLabel label="Submitting" active />
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

      <style jsx>{`
        .form-shake {
          animation: protected-form-shake 0.32s ease-in-out;
        }

        @keyframes protected-form-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-7px);
          }
          40% {
            transform: translateX(7px);
          }
          60% {
            transform: translateX(-5px);
          }
          80% {
            transform: translateX(5px);
          }
        }
      `}</style>
    </>
  );
}
