"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCopy } from "@/components/hooks/useCopy";
import ShareDropdown, { ShareCopyIcon } from "@/components/ShareDropdown";
import { buildReferralUrl, extractReferralCode } from "@/lib/referral-code";
import type { ShareKitRecoveryPublicStatus } from "@/lib/sharekit-recovery";
import type { ShareKitDraft, ShareKitSection } from "@/lib/sharekit";
import { lookupShareKitReferral, recoverShareKitReferralByEmail } from "./actions";

function replaceYourLink(post: string, shareUrl: string): string {
  return post.replaceAll("[your link]", shareUrl);
}

function replaceResolvedShareUrl(post: string, previousShareUrl: string, nextShareUrl: string): string {
  if (post.includes(previousShareUrl)) {
    return post.replaceAll(previousShareUrl, nextShareUrl);
  }
  if (post.includes("[your link]")) {
    return replaceYourLink(post, nextShareUrl);
  }
  return post;
}

export default function ShareKitClient({
  sections,
  initialReferralCode,
  initialReferralName,
  initialWarning,
}: {
  sections: ShareKitSection[];
  initialReferralCode: string;
  initialReferralName: string | null;
  initialWarning: string;
}) {
  const { resolvedTheme } = useTheme();
  const monochrome = resolvedTheme === "monochrome";
  const router = useRouter();
  const pathname = usePathname();
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [input, setInput] = useState(initialReferralCode);
  const [error, setError] = useState(initialWarning);
  const [referralName, setReferralName] = useState(initialReferralName);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<ShareKitRecoveryPublicStatus | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const previousShareUrlRef = useRef(buildReferralUrl(initialReferralCode));

  useEffect(() => {
    setReferralCode(initialReferralCode);
    setInput(initialReferralCode);
    setReferralName(initialReferralName);
    setError(initialWarning);
  }, [initialReferralCode, initialReferralName, initialWarning]);

  const shareUrl = useMemo(() => buildReferralUrl(referralCode), [referralCode]);
  const initialDraftValues = useMemo(
    () =>
      Object.fromEntries(
        sections.flatMap((section) =>
          section.drafts.map((draft) => [draft.id, replaceYourLink(draft.post, shareUrl)]),
        ),
      ),
    [sections, shareUrl],
  );
  const [draftValues, setDraftValues] = useState<Record<string, string>>(initialDraftValues);

  useEffect(() => {
    setDraftValues((current) => {
      const next = { ...current };
      const previousShareUrl = previousShareUrlRef.current;

      for (const section of sections) {
        for (const draft of section.drafts) {
          const baseline = replaceYourLink(draft.post, shareUrl);
          const currentValue = next[draft.id];

          next[draft.id] =
            currentValue === undefined
              ? baseline
              : replaceResolvedShareUrl(currentValue, previousShareUrl, shareUrl);
        }
      }

      previousShareUrlRef.current = shareUrl;
      return next;
    });
  }, [sections, shareUrl]);

  function updateUrl(nextCode: string) {
    const href = nextCode ? `${pathname}?ref=${encodeURIComponent(nextCode)}` : pathname;
    router.replace(href, { scroll: false });
  }

  async function applyReferralCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCode = extractReferralCode(input);
    if (!nextCode) {
      setError("Enter a referral code or referral link.");
      return;
    }

    setSubmitting(true);
    const result = await lookupShareKitReferral(nextCode);
    setSubmitting(false);

    if (!result.ok) {
      setReferralCode("");
      setReferralName(null);
      setError("Referral code not found. Posts are using the default link.");
      updateUrl("");
      return;
    }

    setReferralCode(result.referralCode);
    setInput(result.referralCode);
    setReferralName(result.referralName);
    setError("");
    updateUrl(result.referralCode);
  }

  function clearReferralCode() {
    setReferralCode("");
    setInput("");
    setReferralName(null);
    setError("");
    updateUrl("");
  }

  async function recoverReferralCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecovering(true);
    const result = await recoverShareKitReferralByEmail(recoveryInput);
    setRecovering(false);
    setRecoveryStatus(result.status);
    setRecoveryMessage(result.message);
  }

  function updateDraftValue(draftId: string, value: string) {
    setDraftValues((current) => ({ ...current, [draftId]: value }));
  }

  function resetDraftValue(draftId: string, template: string) {
    setDraftValues((current) => ({ ...current, [draftId]: replaceYourLink(template, shareUrl) }));
  }

  const referralPanelClassName = monochrome
    ? "bg-transparent"
    : "bg-[var(--color-raised)]";
  const referralActionButtonClassName = resolvedTheme === "light"
    ? "rounded-md border border-border-muted bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
    : "cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      <div id="top" className="flex max-w-3xl flex-col gap-4">
        <p className="type-section-title text-fg-body">
          Ready-made posts
        </p>
      </div>

      <section className={`w-full max-w-[36rem] rounded-lg border border-border-muted p-5 ${referralPanelClassName}`}>
        <form onSubmit={applyReferralCode} className="flex flex-col gap-3">
          <label htmlFor="sharekit-referral-input" className="text-sm font-semibold text-fg-heading">
            {referralCode && referralName
              ? `Posts will be populated with ${referralName}'s referral link`
              : "Referral code or link to populate posts."}
          </label>
          <div className="relative w-full">
            <input
              id="sharekit-referral-input"
              type="text"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError("");
              }}
              placeholder="zcashnames.com/?ref=your-code"
              className={`w-full min-w-0 rounded-lg border border-border-muted px-3 py-2 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted ${
                resolvedTheme === "light" ? "bg-[var(--color-card)]" : "bg-transparent"
              } ${input ? "pr-20" : ""}`}
            />
            {input ? (
              <button
                type="button"
                onClick={clearReferralCode}
                className="absolute right-0 top-0 bottom-0 inline-flex items-center justify-center rounded-r-lg px-4 text-sm font-semibold text-fg-muted transition-colors hover:text-fg-heading"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className={referralActionButtonClassName}
            >
              {submitting ? "Checking..." : referralCode ? "Update code" : "Apply code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoveryOpen((current) => !current);
                setRecoveryStatus(null);
                setRecoveryMessage("");
              }}
              className={resolvedTheme === "light"
                ? "rounded-md border border-border-muted bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
                : "cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"}
              aria-expanded={recoveryOpen}
              aria-controls="sharekit-forgot-code"
            >
              Forgot code?
            </button>
          </div>
          {error && <p className="text-sm text-fg-muted">{error}</p>}
        </form>
        {recoveryOpen && (
          <form id="sharekit-forgot-code" onSubmit={recoverReferralCode} className="mt-4 flex flex-col gap-3 border-t border-border-muted pt-4">
            <label htmlFor="sharekit-recovery-input" className="text-sm font-semibold text-fg-heading">
              Enter the email address you used to join the waitlist.
            </label>
            <input
              id="sharekit-recovery-input"
              type="email"
              value={recoveryInput}
              onChange={(event) => {
                setRecoveryInput(event.target.value);
                setRecoveryStatus(null);
                setRecoveryMessage("");
              }}
              placeholder="you@example.com"
              className={`min-w-0 rounded-lg border border-border-muted px-3 py-2 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted ${
                resolvedTheme === "light" ? "bg-[var(--color-card)]" : "bg-transparent"
              }`}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={recovering} className={referralActionButtonClassName}>
                {recovering ? "Checking..." : "Recover link"}
              </button>
            </div>
            {recoveryMessage ? (
              <p
                className={`text-sm ${
                  recoveryStatus === "accepted"
                    ? "text-fg-heading"
                  : recoveryStatus === "error"
                      ? "text-fg-muted"
                      : "text-fg-body"
                }`}
              >
                {recoveryMessage}
              </p>
            ) : null}
          </form>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <div className="border-t border-border-muted" aria-hidden="true" />
        <SectionPills sections={sections} />
        <div className="border-t border-border-muted" aria-hidden="true" />
        <div className="flex flex-col gap-10">
          {sections.map((section, index) => (
            <div key={section.id} className="flex flex-col gap-10">
              {index > 0 && <div className="border-t border-border-muted" aria-hidden="true" />}
              <section
                id={section.id}
                className="scroll-mt-24 flex flex-col gap-5"
                aria-labelledby={`${section.id}-title`}
              >
                <div className="max-w-3xl">
                  <br />
                  <h3 id={`${section.id}-title`} className="text-2xl font-bold text-fg-heading">
                    {section.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-fg-body">{section.description}</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {section.drafts.map((draft) => {
                    const baselineValue = replaceYourLink(draft.post, shareUrl);

                    return (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      baselineValue={baselineValue}
                      value={draftValues[draft.id] ?? baselineValue}
                      onChange={(value) => updateDraftValue(draft.id, value)}
                      onReset={() => resetDraftValue(draft.id, draft.post)}
                    />
                    );
                  })}
                </div>
                <div>
                  <a
                    href="#top"
                    className="text-sm font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg-heading hover:underline"
                  >
                    Back to top
                  </a>
                </div>
              </section>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionPills({ sections }: { sections: ShareKitSection[] }) {
  return (
    <nav className="flex flex-col gap-3" aria-label="Share Kit sections">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Jump to section</p>
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md border border-border-muted px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
          >
            {section.title}
          </a>
        ))}
      </div>
    </nav>
  );
}

function DraftCard({
  draft,
  baselineValue,
  value,
  onChange,
  onReset,
}: {
  draft: ShareKitDraft;
  baselineValue: string;
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const monochrome = resolvedTheme === "monochrome";
  const light = resolvedTheme === "light";
  const copyState = useCopy();
  const resetVisible = value !== baselineValue;
  const characterCount = value.length;
  const cardClassName = monochrome
    ? "border-[rgba(155,188,15,0.45)] bg-[rgba(15,56,15,0.88)] shadow-[0_18px_40px_rgba(15,56,15,0.5)]"
    : "border-border-muted bg-[var(--color-card)]";
  const headerClassName = monochrome
    ? "border-[rgba(155,188,15,0.36)] bg-[rgba(48,98,48,0.34)]"
    : "border-border-muted bg-[var(--color-raised)]";
  const textareaClassName = monochrome
    ? "border-[rgba(155,188,15,0.42)] bg-[rgba(48,98,48,0.22)] text-[var(--mono-3)] placeholder:text-[color:rgba(155,188,15,0.7)] focus:border-[rgba(155,188,15,0.72)] focus:bg-[rgba(48,98,48,0.3)]"
    : "border-border-muted bg-transparent text-fg-body focus:border-fg-muted";
  const actionsClassName = monochrome
    ? "bg-transparent"
    : light
      ? "rounded-lg border border-border-muted bg-[var(--color-raised)] p-3"
      : "";
  const actionButtonClassName = light
    ? "rounded-md border border-border-muted bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
    : "cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading";

  return (
    <article className={`flex h-full flex-col rounded-lg border ${cardClassName}`}>
      <div className={`flex items-center justify-between gap-3 border-b p-4 ${headerClassName}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{draft.label}</p>
        <p className="text-xs font-medium text-fg-muted/70">{characterCount} chars</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`min-h-[320px] w-full flex-1 resize-y rounded-lg border px-3 py-3 text-sm leading-6 outline-none transition-colors ${textareaClassName}`}
        />
        <div className={`flex flex-wrap gap-2 ${actionsClassName}`}>
          <button
            type="button"
            onClick={() => void copyState.copy(value)}
            className={`inline-flex items-center gap-2 ${actionButtonClassName}`}
          >
            <ShareCopyIcon />
            {copyState.copied ? "Copied!" : "Copy"}
          </button>
          {resetVisible && (
            <button
              type="button"
              onClick={onReset}
              className={actionButtonClassName}
            >
              Reset
            </button>
          )}
          <ShareDropdown
            label="Share"
            message={value}
            shareUrl={shareUrlFromPost(value)}
            emailSubject="Zcash Names"
            copyLabel="Copy Text"
            systemShareLabel="Other"
            menuAlign="left"
            showTriggerIcon={true}
            buttonClassName={`inline-flex items-center gap-2 ${actionButtonClassName}`}
          />
        </div>
      </div>
    </article>
  );
}

function shareUrlFromPost(post: string): string {
  const match = post.match(/https?:\/\/\S+/);
  return match?.[0] ?? "";
}
