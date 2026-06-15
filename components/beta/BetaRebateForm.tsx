"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { submitBetaRebateClaim, type BetaRebateDefaults } from "@/lib/beta/actions";
import { validateAddress } from "@/lib/zns/address-validation";
import {
  defaultSubcategory,
  defaultWalletChoice,
  getWalletVariant,
  getWalletVariantsForPlatform,
  walletChoiceIsValid,
  type WalletChoice,
  type WalletDeviceChoice,
  type WalletSubcategory,
} from "@/lib/wallets/catalog";

type Props = {
  defaults: BetaRebateDefaults;
};

type WalletRow = {
  device: WalletDeviceChoice;
  subcategory: WalletSubcategory | "";
  choice: WalletChoice | "other";
  otherName: string;
};

type SelectOption = {
  value: string;
  label: string;
};

const inputStyle: CSSProperties = {
  background: "transparent",
  color: "var(--fg-heading)",
};

const labelStyle: CSSProperties = {
  color: "var(--fg-muted)",
  fontSize: "0.72rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  display: "block",
};

const primaryBtnStyle: CSSProperties = {
  background: "var(--home-result-primary-bg)",
  color: "var(--home-result-primary-fg)",
  boxShadow: "var(--home-result-primary-shadow)",
};

const fieldClassName =
  "w-full rounded-2xl border border-border-muted bg-transparent px-4 py-3 text-sm text-fg-heading outline-none transition-[border-color,box-shadow] placeholder:text-fg-muted focus:border-fg-heading focus:[box-shadow:0_0_0_1px_var(--fg-heading)]";

const readOnlyFieldClassName =
  "w-full rounded-2xl border border-border-muted bg-transparent px-4 py-3 text-sm text-fg-muted outline-none";

const fileFieldClassName =
  "block w-full rounded-2xl border border-border-muted bg-transparent px-4 py-3 text-sm text-fg-heading outline-none transition-[border-color,box-shadow] file:mr-3 file:rounded-full file:border file:border-border-muted file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-fg-body focus:border-fg-heading focus:[box-shadow:0_0_0_1px_var(--fg-heading)]";

const ACTION_OPTIONS: SelectOption[] = [
  { value: "CLAIM", label: "CLAIM" },
  { value: "BUY", label: "BUY" },
  { value: "OTHER", label: "Other" },
];

const OUTCOME_OPTIONS: SelectOption[] = [
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
];

const DEVICE_OPTIONS: SelectOption[] = [
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "browser", label: "Browser" },
  { value: "not_sure", label: "Not sure yet" },
];

function captureClientEnv(): string {
  if (typeof window === "undefined") return "";
  try {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const form = w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
    const parts: string[] = [`${w}x${h}`, `dpr=${dpr}`, `form=${form}`];
    const orient = window.screen?.orientation?.type;
    if (orient) parts.push(`orient=${orient}`);
    const lang = navigator.languages?.[0] ?? navigator.language;
    if (lang) parts.push(`lang=${lang}`);
    return parts.join(" ").slice(0, 200);
  } catch {
    return "";
  }
}

function walletOptionsFor(device: WalletDeviceChoice, subcategory: WalletSubcategory | "") {
  if (device === "not_sure" || !subcategory) return [];
  return getWalletVariantsForPlatform(device, subcategory);
}

function walletWarning(choice: WalletChoice | "other"): string | null {
  if (choice === "other" || choice === "not_sure") return null;
  return getWalletVariant(choice)?.warning ?? null;
}

function buildInitialWallet(defaults: BetaRebateDefaults): WalletRow {
  const device = defaults.walletDevice;
  const subcategory = device === "not_sure" ? "" : defaults.walletSubcategory;
  const choice =
    defaults.walletChoice === "other" ||
    defaults.walletChoice === "not_sure" ||
    (device !== "not_sure" && subcategory && walletChoiceIsValid(device, subcategory, defaults.walletChoice))
      ? defaults.walletChoice
      : device === "not_sure"
        ? "not_sure"
        : defaultWalletChoice(device, subcategory || defaultSubcategory(device));

  return {
    device,
    subcategory,
    choice,
    otherName: defaults.walletOtherName,
  };
}

export default function BetaRebateForm({ defaults }: Props) {
  const initialWallet = useMemo(() => buildInitialWallet(defaults), [defaults]);
  const [address, setAddress] = useState("");
  const [actionType, setActionType] = useState<"CLAIM" | "BUY" | "OTHER">("CLAIM");
  const [outcome, setOutcome] = useState<"success" | "failure">("success");
  const [txid, setTxid] = useState("");
  const [wallet, setWallet] = useState<WalletRow>(initialWallet);
  const [notes, setNotes] = useState("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const addressValidation = useMemo(() => validateAddress(address), [address]);
  const addressError =
    address.trim() && addressValidation.status !== "unified"
      ? addressValidation.warning || "Enter a valid unified Zcash address."
      : "";
  const selectedWalletOptions = useMemo(
    () => walletOptionsFor(wallet.device, wallet.subcategory),
    [wallet.device, wallet.subcategory],
  );
  const selectedWalletWarning = useMemo(() => walletWarning(wallet.choice), [wallet.choice]);

  function updateWalletDevice(device: WalletDeviceChoice) {
    const subcategory = defaultSubcategory(device);
    setWallet({
      device,
      subcategory,
      choice: defaultWalletChoice(device, subcategory),
      otherName: "",
    });
  }

  function updateWalletSubcategory(subcategory: WalletSubcategory) {
    setWallet((current) => {
      if (current.device === "not_sure") return current;
      const choice = walletChoiceIsValid(current.device, subcategory, current.choice)
        ? current.choice
        : defaultWalletChoice(current.device, subcategory);
      return {
        ...current,
        subcategory,
        choice,
        otherName: choice === "other" ? current.otherName : "",
      };
    });
  }

  function updateWalletChoice(choice: WalletChoice | "other") {
    setWallet((current) => ({
      ...current,
      choice,
      otherName: choice === "other" ? current.otherName : "",
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (addressValidation.status !== "unified") {
      setError(addressValidation.warning || "Enter a valid unified Zcash address.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.set("address", address);
    formData.set("action_type", actionType);
    formData.set("outcome", outcome);
    formData.set("txid", txid);
    formData.set("wallet_device", wallet.device);
    formData.set("wallet_subcategory", wallet.subcategory);
    formData.set("wallet_choice", wallet.choice);
    if (wallet.choice !== "other" && wallet.choice !== "not_sure") {
      formData.set("wallet_variant_id", wallet.choice);
    }
    if (wallet.choice === "other") {
      formData.set("wallet_other_name", wallet.otherName);
    }
    formData.set("notes", notes);
    formData.set("client_env", captureClientEnv());

    const file = fileRef.current?.files?.[0];
    if (file) formData.append("attachment", file);

    const result = await submitBetaRebateClaim(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess("Rebate request saved.");
    setAddress("");
    setActionType("CLAIM");
    setOutcome("success");
    setTxid("");
    setWallet(initialWallet);
    setNotes("");
    setAttachmentName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const platformOptions: SelectOption[] =
    wallet.device === "not_sure"
      ? [{ value: "", label: "No platform" }]
      : wallet.device === "mobile"
        ? [
            { value: "ios", label: "iOS" },
            { value: "android", label: "Android" },
          ]
        : wallet.device === "desktop"
          ? [
              { value: "pc", label: "Windows" },
              { value: "mac", label: "Mac" },
              { value: "linux", label: "Linux" },
            ]
          : [{ value: "chrome", label: "Chrome" }];

  const walletChoiceOptions: SelectOption[] =
    wallet.device === "not_sure"
      ? [{ value: "not_sure", label: "Choose wallet" }]
      : [
          ...selectedWalletOptions.map((option) => ({
            value: option.variantId,
            label: option.displayName,
          })),
          { value: "other", label: "Other" },
          { value: "not_sure", label: "Choose wallet" },
        ];

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[24px] border px-5 py-5 sm:px-6 sm:py-6"
      style={{
        borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 58%, transparent), color-mix(in srgb, var(--faq-border) 14%, transparent))",
        boxShadow: "0 18px 38px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label style={labelStyle}>
            Tester <span style={{ color: "var(--accent-red, #e05252)" }}>*</span>
          </label>
          <input
            value={defaults.displayName ?? "Shared mainnet"}
            readOnly
            aria-readonly="true"
            className={readOnlyFieldClassName}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Stage <span style={{ color: "var(--accent-red, #e05252)" }}>*</span>
          </label>
          <input
            value={defaults.stage}
            readOnly
            aria-readonly="true"
            className={`${readOnlyFieldClassName} capitalize`}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rebate-address" style={labelStyle}>
            Zcash address <span style={{ color: "var(--accent-red, #e05252)" }}>*</span>
          </label>
          <input
            id="rebate-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={fieldClassName}
            style={inputStyle}
            placeholder="u1..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={addressError ? true : undefined}
            required
          />
          <p
            className="mt-2 text-xs"
            style={{ color: addressError ? "var(--home-result-status-negative-fg)" : "var(--fg-muted)", lineHeight: 1.5 }}
          >
            {addressError || "Unified Zcash address only."}
          </p>
        </div>
        <div>
          <label htmlFor="rebate-txid" style={labelStyle}>
            Transaction ID <span style={{ color: "var(--accent-red, #e05252)" }}>*</span>
          </label>
          <input
            id="rebate-txid"
            value={txid}
            onChange={(event) => setTxid(event.target.value)}
            className={fieldClassName}
            style={inputStyle}
            placeholder="Required"
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label style={labelStyle}>Wallet</label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,8rem)_minmax(0,8rem)_minmax(0,1fr)]">
          <RebateSelectField
            id="rebate-wallet-device"
            value={wallet.device}
            onChange={(value) => updateWalletDevice(value as WalletDeviceChoice)}
            options={DEVICE_OPTIONS}
          />
          <RebateSelectField
            id="rebate-wallet-platform"
            value={wallet.subcategory}
            onChange={(value) => updateWalletSubcategory(value as WalletSubcategory)}
            options={platformOptions}
            disabled={wallet.device === "not_sure"}
          />
          <RebateSelectField
            id="rebate-wallet-choice"
            value={wallet.choice}
            onChange={(value) => updateWalletChoice(value as WalletChoice | "other")}
            options={walletChoiceOptions}
            disabled={wallet.device !== "not_sure" && !wallet.subcategory}
          />
        </div>

        {selectedWalletWarning && (
          <p
            className="mt-2 text-center text-xs font-medium"
            style={{ color: "var(--accent-red, #e05252)", lineHeight: 1.45 }}
          >
            {selectedWalletWarning.split("\n").map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        )}

        {wallet.choice === "other" && wallet.device !== "not_sure" ? (
          <div className="mt-2">
            <label htmlFor="rebate-wallet-other" style={labelStyle}>
              {wallet.device.charAt(0).toUpperCase() + wallet.device.slice(1)} wallet name
            </label>
            <input
              id="rebate-wallet-other"
              type="text"
              value={wallet.otherName}
              onChange={(event) => setWallet((current) => ({ ...current, otherName: event.target.value }))}
              maxLength={200}
              required
              placeholder="Wallet name"
              className={fieldClassName}
              style={inputStyle}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rebate-action" style={labelStyle}>Action type</label>
          <RebateSelectField
            id="rebate-action"
            value={actionType}
            onChange={(value) => setActionType(value as "CLAIM" | "BUY" | "OTHER")}
            options={ACTION_OPTIONS}
          />
        </div>
        <div>
          <label htmlFor="rebate-outcome" style={labelStyle}>Outcome</label>
          <RebateSelectField
            id="rebate-outcome"
            value={outcome}
            onChange={(value) => setOutcome(value as "success" | "failure")}
            options={OUTCOME_OPTIONS}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="rebate-notes" style={labelStyle}>Notes</label>
        <textarea
          id="rebate-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={`${fieldClassName} min-h-32`}
          style={inputStyle}
          placeholder="What happened, what you paid for, and anything we should verify."
        />
      </div>

      <div className="mt-4">
        <label htmlFor="rebate-attachment" style={labelStyle}>Picture</label>
        <input
          ref={fileRef}
          id="rebate-attachment"
          type="file"
          accept="image/*"
          className={fileFieldClassName}
          style={inputStyle}
          onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? "")}
          required
        />
        <p className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
          One image, up to 5 MB. {attachmentName ? `Selected: ${attachmentName}` : "Attach the proof screenshot."}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-medium" style={{ color: "var(--home-result-status-negative-fg)" }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 text-sm font-medium" style={{ color: "var(--home-result-status-positive-fg)" }}>
          {success}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs leading-relaxed" style={{ color: "var(--fg-muted)" }}>
          We&rsquo;ll review your request and follow up using your beta application contact.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-[18px] px-5 py-3 text-sm font-semibold transition-opacity"
          style={{
            ...primaryBtnStyle,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "progress" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "Submit rebate"}
        </button>
      </div>
    </form>
  );
}

function RebateSelectField({
  id,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeOption = options.find((option) => option.value === value) ?? options[0];

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
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={`flex min-h-[50px] w-full items-center justify-between gap-4 rounded-2xl border bg-transparent pl-4 pr-5 text-left text-sm font-semibold outline-none transition-[border-color,box-shadow] ${
          disabled
            ? "cursor-not-allowed border-border-muted text-fg-muted opacity-80"
            : open
              ? "border-fg-heading text-fg-heading [box-shadow:0_0_0_1px_var(--fg-heading)]"
              : "border-border-muted text-fg-heading hover:border-fg-heading focus:border-fg-heading focus:[box-shadow:0_0_0_1px_var(--fg-heading)]"
        }`}
      >
        <span>{activeOption?.label ?? ""}</span>
        <span className="pointer-events-none flex shrink-0 items-center text-fg-muted" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-1.5 shadow-2xl"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-fg-heading transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_10%,transparent)]"
                style={{
                  background: selected ? "color-mix(in srgb, var(--fg-heading) 10%, transparent)" : "transparent",
                  color: selected ? "var(--fg-heading)" : "var(--fg-body)",
                }}
              >
                <span>{option.label}</span>
                {selected ? (
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--fg-heading)" }} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
