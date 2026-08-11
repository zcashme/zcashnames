"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import HeroShareButton from "@/components/HeroShareButton";
import ReferralCodeRecovery from "@/components/ReferralCodeRecovery";
import { useCopy } from "@/components/hooks/useCopy";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import ShareDropdown, { ShareCopyIcon } from "@/components/ShareDropdown";
import { buildReferralUrl, extractReferralCode } from "@/lib/referral-code";
import type { ShareKitDraft, ShareKitSection } from "@/lib/sharekit";
import { lookupShareKitReferral } from "./actions";

const ACTION_INSET_PX = 4;

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
  const router = useRouter();
  const pathname = usePathname();
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [input, setInput] = useState(initialReferralCode);
  const [error, setError] = useState(initialWarning);
  const [referralName, setReferralName] = useState(initialReferralName);
  const [submitting, setSubmitting] = useState(false);
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

  function updateDraftValue(draftId: string, value: string) {
    setDraftValues((current) => ({ ...current, [draftId]: value }));
  }

  function resetDraftValue(draftId: string, template: string) {
    setDraftValues((current) => ({ ...current, [draftId]: replaceYourLink(template, shareUrl) }));
  }

  const hasInput = input.trim().length > 0;
  const submitReady = hasInput && !submitting;

  return (
    <>
      {/*
        Same join as /faq + /brandkit: open-bottom hero, fully rounded jump card,
        vertical side rails bridging the short gap between them.
      */}
      <div className="mx-auto w-full max-w-[920px]">
        <div
          className="relative w-full rounded-t-2xl border border-b-0 px-6 py-8 text-center sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <HeroShareButton
            message="Share ready-made Zcash Names posts with your referral link:"
            shareUrl="https://www.zcashnames.com/sharekit"
            emailSubject="Zcash Names Share Kit"
          />
          <h1
            className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
            style={{ color: "var(--fg-heading)" }}
          >
            Ready-made{" "}
            <span style={{ color: "var(--color-accent-interactive)" }}>posts</span>
          </h1>

          <div className="mx-auto mt-8 w-full max-w-[36rem] text-left sm:mt-9">
            <form onSubmit={applyReferralCode} className="flex flex-col gap-3">
              <label
                htmlFor="sharekit-referral-input"
                className="text-center text-base font-semibold"
                style={{ color: "var(--fg-heading)" }}
              >
                {referralCode && referralName
                  ? `Posts will be populated with ${referralName}'s referral link`
                  : "Populate the drafts below with your referral link:"}
              </label>
              <div className="relative flex w-full items-center">
                <input
                  id="sharekit-referral-input"
                  type="text"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    setError("");
                  }}
                  placeholder="zcashnames.com/?ref=your-code"
                  className={`w-full min-w-0 rounded-2xl border border-border-muted py-3 pl-4 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted ${
                    resolvedTheme === "light" ? "bg-[var(--color-card)]" : "bg-[var(--input-fill)]"
                  } ${hasInput ? "pr-[9.5rem]" : "pr-[5.5rem]"}`}
                />
                <span
                  className="absolute flex items-center gap-1.5"
                  style={{
                    top: ACTION_INSET_PX,
                    right: ACTION_INSET_PX,
                    bottom: ACTION_INSET_PX,
                  }}
                >
                  {hasInput ? (
                    <button
                      type="button"
                      onClick={clearReferralCode}
                      className="inline-flex h-[calc(100%-2px)] items-center justify-center rounded-[13px] px-3 text-sm font-semibold leading-none text-fg-muted transition-colors hover:text-fg-heading"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!submitReady}
                    className="inline-flex h-[calc(100%-2px)] shrink-0 items-center justify-center rounded-[13px] px-4 text-sm font-semibold leading-none transition"
                    style={{
                      background: submitReady
                        ? "var(--home-result-primary-bg)"
                        : "color-mix(in srgb, var(--leaders-card-border, var(--border-muted)) 22%, transparent)",
                      color: submitReady
                        ? "var(--home-result-primary-fg)"
                        : "var(--fg-muted)",
                      boxShadow: submitReady ? "var(--home-result-primary-shadow)" : "none",
                      cursor: submitting ? "progress" : submitReady ? "pointer" : "not-allowed",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? <AnimatedLoadingLabel label="Checking" active /> : "Apply"}
                  </button>
                </span>
              </div>
              <ReferralCodeRecovery variant="sharekit" controlsId="sharekit-forgot-code" />
              {error ? (
                <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </div>

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[calc(100%-1px)] top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <div
            className="rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
            style={{
              borderColor: "var(--faq-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
            }}
          >
            <SectionPills sections={sections} />
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-10">
        {sections.map((section, index) => (
          <div key={section.id} className="flex flex-col gap-10">
            {index > 0 && <div className="border-t border-border-muted" aria-hidden="true" />}
            <section
              id={section.id}
              className="scroll-mt-24 flex flex-col gap-5"
              aria-labelledby={`${section.id}-title`}
            >
              <div className="max-w-3xl">
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
            </section>
          </div>
        ))}
      </section>
    </>
  );
}

function SectionPills({ sections }: { sections: ShareKitSection[] }) {
  return (
    <nav className="flex flex-col items-center gap-3 text-center" aria-label="Share Kit sections">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Jump to section</p>
      <div className="flex flex-wrap justify-center gap-2">
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
    ? "border-[rgba(155,188,15,0.42)] bg-transparent text-[var(--mono-3)] placeholder:text-[color:rgba(155,188,15,0.7)] focus:border-[rgba(155,188,15,0.72)]"
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
    <article className={`flex h-full flex-col overflow-hidden rounded-lg border ${cardClassName}`}>
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
        <div className={`flex flex-wrap items-center gap-2 ${actionsClassName}`}>
          <button
            type="button"
            onClick={() => void copyState.copy(value)}
            className={`inline-flex items-center gap-2 ${actionButtonClassName}`}
          >
            <ShareCopyIcon />
            {copyState.copied ? "Copied!" : "Copy"}
          </button>
          <ShareDropdown
            label="Share"
            message={value}
            shareUrl={shareUrlFromPost(value)}
            emailSubject="Zcash Names"
            copyLabel="Copy Text"
            systemShareLabel="Other"
            menuAlign="left"
            showTriggerIcon={true}
            // Avoid ActionDropdown's default w-full root, which drops Share onto the next line.
            rootClassName="relative shrink-0"
            buttonClassName={`inline-flex items-center gap-2 ${actionButtonClassName}`}
          />
          {resetVisible && (
            <button
              type="button"
              onClick={onReset}
              className={actionButtonClassName}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function shareUrlFromPost(post: string): string {
  const match = post.match(/https?:\/\/\S+/);
  return match?.[0] ?? "";
}
