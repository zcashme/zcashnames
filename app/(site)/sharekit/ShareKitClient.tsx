"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCopy } from "@/components/hooks/useCopy";
import { buildReferralUrl, extractReferralCode } from "@/lib/referral-code";
import type { ShareKitDraft, ShareKitSection } from "@/lib/sharekit";
import { lookupShareKitReferral } from "./actions";

function replaceYourLink(post: string, shareUrl: string): string {
  return post.replaceAll("[your link]", shareUrl);
}

function shareToX(post: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(post)}`;
}

function shareToTelegram(post: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(post)}`;
}

function shareByEmail(post: string): string {
  return `mailto:?subject=${encodeURIComponent("Zcash Names")}&body=${encodeURIComponent(post)}`;
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

  return (
    <>
      <div id="top" className="flex max-w-3xl flex-col gap-4">
        <p className="type-section-title text-fg-body">
          Ready-made posts
        </p>
      </div>


      <section className="w-full max-w-[36rem] rounded-lg border border-border-muted bg-transparent p-5">
        <form onSubmit={applyReferralCode} className="flex flex-col gap-3">
          <label htmlFor="sharekit-referral-input" className="text-sm font-semibold text-fg-heading">
            {referralCode && referralName
              ? `Posts will be populated with ${referralName}'s referral link`
              : "Referral code or link to populate posts."}
          </label>
          <input
            id="sharekit-referral-input"
            type="text"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            placeholder="zcashnames.com/?ref=your-code"
            className="min-w-0 rounded-lg border border-border-muted bg-transparent px-3 py-2 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Checking..." : referralCode ? "Update code" : "Apply code"}
            </button>
            <button
              type="button"
              onClick={clearReferralCode}
              className="cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            >
              Clear
            </button>
          </div>
          {error && <p className="text-sm text-fg-muted">{error}</p>}
        </form>
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
  const copyState = useCopy();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const resetVisible = value !== baselineValue;
  const characterCount = value.length;

  useEffect(() => {
    setShareOpen(false);
  }, [value]);

  async function handleSystemShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      setShareStatus("System share is not available on this device.");
      return;
    }

    try {
      await navigator.share({ text: value });
      setShareStatus("");
      setShareOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setShareStatus("");
        return;
      }
      setShareStatus("System share was canceled or unavailable.");
    }
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-border-muted bg-[var(--color-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-border-muted bg-[var(--color-raised)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{draft.label}</p>
        <p className="text-xs font-medium text-fg-muted/70">{characterCount} chars</p>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[320px] w-full flex-1 resize-y rounded-lg border border-border-muted bg-transparent px-3 py-3 text-sm leading-6 text-fg-body outline-none transition-colors focus:border-fg-muted"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyState.copy(value)}
            className="cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
          >
            {copyState.copied ? "Copied!" : "Copy"}
          </button>
          {resetVisible && (
            <button
              type="button"
              onClick={onReset}
              className="cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            >
              Reset
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((current) => !current)}
              className="cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              aria-expanded={shareOpen}
              aria-haspopup="menu"
            >
              Share
            </button>
            {shareOpen && (
              <div
                className="absolute left-0 top-full z-10 mt-2 flex min-w-[180px] flex-col rounded-lg border border-border-muted bg-[var(--color-card)] p-2 shadow-lg"
                role="menu"
              >
                <a
                  href={shareToX(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:bg-[var(--color-raised)]"
                  role="menuitem"
                >
                  X
                </a>
          <a
            href={shareToTelegram(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:bg-[var(--color-raised)]"
            role="menuitem"
          >
                  Telegram
                </a>
                <a
                  href={shareByEmail(value)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:bg-[var(--color-raised)]"
                  role="menuitem"
                >
                  Email
                </a>
                <button
                  type="button"
                  onClick={() => void handleSystemShare()}
                  className="cursor-pointer rounded-md px-3 py-2 text-left text-sm font-semibold text-fg-heading transition-colors hover:bg-[var(--color-raised)]"
                  role="menuitem"
                >
                  Other
                </button>
              </div>
            )}
          </div>
        </div>
        {shareStatus && <p className="text-xs text-fg-muted">{shareStatus}</p>}
      </div>
    </article>
  );
}
