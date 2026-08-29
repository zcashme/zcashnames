// Waitlist signup form.
//
// Two-phase UX:
//   Phase 1: name input with .zcash suffix overlay ("Get Early Access" button
//            confirms the name and reveals Phase 2).
//   Phase 2: email + newsletter opt-in + submit button. On submit, generates a
//            unique referral code, calls submitWaitlist server action, and opens
//            a post-submit modal.
//
// Post-submit modal (createPortal) has four transition views:
//   confirm → community → survey → thankyou
// (confirm ↔ community slide horizontally; confirm → survey → thankyou vertically).
// SurveyForm handles actual survey data submission.
//
// On mount, reads ?ref= from URL params for referral attribution.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import { normalizeUsername } from "@/lib/zns/utils";
import AnimatedSuffix from "@/components/search/AnimatedSuffix";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import {
  getWaitlistNameStatus,
  submitWaitlist,
  type WaitlistPayload,
} from "@/lib/waitlist/waitlist";
import SurveyForm from "@/components/SurveyForm";
import { PROTECTED_REQUEST_SESSION_PREFILL_KEY } from "@/lib/protected/request-session-prefill";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

const COMMUNITY_LINKS = [
  {
    label: "X / Twitter",
    href: "https://x.com/zcashnames",
    d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "Discord",
    href: "https://discord.gg/z2H23QgAGf",
    d: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.227-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  },
  {
    label: "Telegram",
    href: "https://t.me/zcashnames",
    d: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  },
  {
    label: "Signal",
    href: "https://signal.group/#CjQKIKDM76KMttnFqmbtbKzcfDrGeLtR6wWQq82YM8LWdyNhEhBGKNSZVjTREwDLqhatYhLH",
    d: "M12 1.5C6.202 1.5 1.5 6.202 1.5 12c0 1.93.52 3.735 1.43 5.29L1.5 22.5l5.21-1.43A10.457 10.457 0 0 0 12 22.5c5.798 0 10.5-4.702 10.5-10.5S17.798 1.5 12 1.5zm0 2.1a8.4 8.4 0 1 1 0 16.8 8.357 8.357 0 0 1-4.29-1.178l-.308-.186-3.188.875.875-3.188-.186-.308A8.357 8.357 0 0 1 3.6 12 8.4 8.4 0 0 1 12 3.6z",
  },
];

type ModalView = "confirm" | "community" | "survey" | "thankyou";

const TRANSITION = "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
const RESULT_CARD_TRANSITION_MS = 280;

type NameLookupState =
  | { status: "idle" }
  | { status: "loading"; name: string }
  | { status: "resolved"; name: string; protected: boolean; waitlistCount: number }
  | { status: "error"; name: string };

type PendingWaitlistPayload = Omit<
  WaitlistPayload,
  "captcha_token" | "captcha_answer"
>;

function viewTransform(
  view: ModalView,
  current: ModalView,
): { transform: string; pointerEvents: "auto" | "none" } {
  const active = view === current;
  // Horizontal: confirm <-> community
  if (view === "confirm") {
    if (current === "community")
      return { transform: "translateX(-100%)", pointerEvents: "none" };
    if (current === "survey" || current === "thankyou")
      return { transform: "translateY(-100%)", pointerEvents: "none" };
    return { transform: "translate(0, 0)", pointerEvents: "auto" };
  }
  if (view === "community") {
    if (current === "community")
      return { transform: "translate(0, 0)", pointerEvents: "auto" };
    return { transform: "translateX(100%)", pointerEvents: "none" };
  }
  // Vertical: confirm -> survey -> thankyou
  if (view === "survey") {
    if (current === "survey")
      return { transform: "translate(0, 0)", pointerEvents: "auto" };
    if (current === "thankyou")
      return { transform: "translateY(-100%)", pointerEvents: "none" };
    return { transform: "translateY(100%)", pointerEvents: "none" };
  }
  if (view === "thankyou") {
    if (current === "thankyou")
      return { transform: "translate(0, 0)", pointerEvents: "auto" };
    return { transform: "translateY(100%)", pointerEvents: "none" };
  }
  return {
    transform: "translate(0, 0)",
    pointerEvents: active ? "auto" : "none",
  };
}

interface WaitlistEntryFormProps {
  onConfirm?: () => void;
  onReset?: () => void;
  showNewsletter?: boolean;
  initialEmail?: string;
}

export default function WaitlistEntryForm({
  onConfirm,
  onReset,
  showNewsletter = true,
  initialEmail = "",
}: WaitlistEntryFormProps = {}) {
  const [mounted, setMounted] = useState(false);
  // ── Form state ──
  const [nameInput, setNameInput] = useState("");
  const [confirmedName, setConfirmedName] = useState("");
  const [focused, setFocused] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [newsletter, setNewsletter] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingWaitlistPayload, setPendingWaitlistPayload] =
    useState<PendingWaitlistPayload | null>(null);

  // ── Modal state ──
  const [modalView, setModalView] = useState<ModalView>("confirm");
  const [myReferralCode, setMyReferralCode] = useState("");

  const [surveyContactMsg, setSurveyContactMsg] = useState(false);
  const [nameLookup, setNameLookup] = useState<NameLookupState>({ status: "idle" });
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [renderResultCard, setRenderResultCard] = useState(false);
  const [resultCardOpen, setResultCardOpen] = useState(false);
  const [displayedConfirmedName, setDisplayedConfirmedName] = useState("");
  const [displayedWaitlistCount, setDisplayedWaitlistCount] = useState(0);

  const referredByRef = useRef<string>("");
  const nameFieldTopRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const lookupRequestRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) referredByRef.current = ref;
  }, []);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  // Header "Join Waitlist" → /waitlist#waitlist-name-entry: put the name field
  // near the top of the viewport (Next.js client nav often skips native hash scroll).
  useEffect(() => {
    const HASH = "#waitlist-name-entry";
    let retryId: number | null = null;

    function scrollToNameEntry() {
      if (window.location.hash !== HASH) return;
      const target = nameFieldTopRef.current;
      if (!target) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    function scheduleScrollToNameEntry() {
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToNameEntry);
      });
      if (retryId !== null) window.clearTimeout(retryId);
      // Retry after layout (phone stage / fonts) settles
      retryId = window.setTimeout(scrollToNameEntry, 280);
    }

    function isJoinWaitlistAnchor(anchor: HTMLAnchorElement): boolean {
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        if (url.hash !== HASH) return false;
        const path = url.pathname.replace(/\/$/, "") || "/";
        return path === "/waitlist";
      } catch {
        return false;
      }
    }

    // Same-page menu clicks: App Router pushState often does not fire hashchange.
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isJoinWaitlistAnchor(anchor)) return;
      scheduleScrollToNameEntry();
    }

    scheduleScrollToNameEntry();
    window.addEventListener("hashchange", scheduleScrollToNameEntry);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      if (retryId !== null) window.clearTimeout(retryId);
      window.removeEventListener("hashchange", scheduleScrollToNameEntry);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  const name = normalizeUsername(nameInput);
  const showResult = confirmedName.length > 0;

  useEffect(() => {
    if (showResult) onConfirm?.();
    else onReset?.();
  }, [showResult, onConfirm, onReset]);

  useEffect(() => {
    if (!confirmedName) return;
    setDisplayedConfirmedName(confirmedName);
    setDisplayedWaitlistCount(0);
  }, [confirmedName]);

  useEffect(() => {
    if (!showResult) {
      setResultCardOpen(false);
      const timeoutId = window.setTimeout(() => {
        setRenderResultCard(false);
        setDisplayedConfirmedName("");
        setDisplayedWaitlistCount(0);
      }, RESULT_CARD_TRANSITION_MS);
      return () => window.clearTimeout(timeoutId);
    }

    setRenderResultCard(true);
    const frameId = window.requestAnimationFrame(() => {
      setResultCardOpen(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [showResult]);

  const confirmName = () => {
    if (name.length > 0) {
      lookupRequestRef.current += 1;
      setNameLookup({ status: "loading", name });
      if (name === confirmedName) {
        setLookupAttempt((attempt) => attempt + 1);
      }
      setConfirmedName(name);
      return;
    }
    nameInputRef.current?.focus();
  };

  useEffect(() => {
    if (!confirmedName) {
      setNameLookup({ status: "idle" });
      return;
    }

    const requestId = ++lookupRequestRef.current;
    setNameLookup({ status: "loading", name: confirmedName });
    getWaitlistNameStatus(confirmedName)
      .then((result) => {
        if (lookupRequestRef.current !== requestId) return;
        if (result.status === "error") {
          setNameLookup({ status: "error", name: confirmedName });
          return;
        }
        setNameLookup({
          status: "resolved",
          name: confirmedName,
          protected: result.protected,
          waitlistCount: result.waitlistCount,
        });
      })
      .catch(() => {
        if (lookupRequestRef.current !== requestId) return;
        setNameLookup({ status: "error", name: confirmedName });
      });
  }, [confirmedName, lookupAttempt]);

  const hasResolvedNameLookup =
    nameLookup.status === "resolved" && nameLookup.name === confirmedName;
  const isProtectedName = hasResolvedNameLookup && nameLookup.protected;
  const displayedLookupCount = hasResolvedNameLookup ? nameLookup.waitlistCount : 0;

  useEffect(() => {
    setDisplayedWaitlistCount(displayedLookupCount);
  }, [displayedLookupCount]);

  function retryNameLookup() {
    if (!confirmedName) return;
    lookupRequestRef.current += 1;
    setNameLookup({ status: "loading", name: confirmedName });
    setLookupAttempt((attempt) => attempt + 1);
  }

  useEffect(() => {
    if (!confirmedName || !hasResolvedNameLookup) return;

    const focusEmail = () => {
      const emailEl = emailRef.current;
      if (!emailEl) return;
      try {
        emailEl.focus({ preventScroll: true });
      } catch {
        emailEl.focus();
      }
    };

    const rafId = requestAnimationFrame(() => {
      const target = nameFieldTopRef.current;
      const isMobile = window.innerWidth < 768;
      if (isMobile && target) {
        const top = window.scrollY + target.getBoundingClientRect().top;
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }
      focusEmail();
    });

    const refocusTimer = window.setTimeout(focusEmail, 220);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(refocusTimer);
    };
  }, [confirmedName, hasResolvedNameLookup]);

  const emailValid = isValidEmail(email);

  const canSubmit =
    confirmedName.length > 0 &&
    emailValid &&
    hasResolvedNameLookup &&
    !submitting &&
    !captchaOpen;

  function closeCaptchaModal() {
    if (submitting) return;
    setCaptchaOpen(false);
    setPendingWaitlistPayload(null);
  }

  async function completeWaitlistSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (!pendingWaitlistPayload || submitting) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const result = await submitWaitlist({
        ...pendingWaitlistPayload,
        captcha_token: solution.captcha_token,
        captcha_answer: solution.captcha_answer,
      });

      if (result.status === "error") {
        if (result.error.toLowerCase().includes("human check")) {
          throw new Error(result.error);
        }
        setSubmitError(result.error);
        setCaptchaOpen(false);
        setPendingWaitlistPayload(null);
        return;
      }

      if (result.status === "resent" || result.status === "already") {
        setSubmitError(result.message);
        setCaptchaOpen(false);
        setPendingWaitlistPayload(null);
        return;
      }

      setMyReferralCode(pendingWaitlistPayload.referral_code);
      setCaptchaOpen(false);
      setPendingWaitlistPayload(null);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit the waitlist entry.";
      if (message.toLowerCase().includes("human check")) {
        throw error instanceof Error ? error : new Error(message);
      }
      setSubmitError(message);
      setCaptchaOpen(false);
      setPendingWaitlistPayload(null);
    } finally {
      setSubmitting(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitError("");

    if (!hasResolvedNameLookup) return;

    if (isProtectedName) {
      try {
        window.sessionStorage.setItem(
          PROTECTED_REQUEST_SESSION_PREFILL_KEY,
          JSON.stringify({ name: confirmedName, email: email.trim() }),
        );
      } catch {
        // The request form still works if browser storage is unavailable.
      }
      window.location.assign(
        `/protected/request?${new URLSearchParams({ name: confirmedName }).toString()}`,
      );
      return;
    }

    setPendingWaitlistPayload({
      name: confirmedName,
      email: email.trim(),
      newsletter: showNewsletter ? newsletter : false,
      referral_code: generateReferralCode(),
      referred_by: referredByRef.current || null,
    });
    setCaptchaOpen(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setNameInput("");
    setConfirmedName("");
    setEmail(initialEmail);
    setNewsletter(true);
    setMyReferralCode("");
    setSubmitError("");
    setSubmitting(false);
    setModalView("confirm");
    setSurveyContactMsg(false);
    setCaptchaOpen(false);
    setPendingWaitlistPayload(null);
  };

  const inputBase: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--border-muted)",
    color: "var(--fg-body)",
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: "var(--home-result-primary-bg)",
    color: "var(--home-result-primary-fg)",
    boxShadow: "var(--home-result-primary-shadow)",
  };

  return (
    <>
      {/* ── Post-submit modal ── */}
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to join the waitlist."
        confirmLabel="Submit"
        submitting={submitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeWaitlistSubmitAfterCaptcha}
      />
      {mounted && submitted
        ? createPortal(
            <div
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.72)" }}
              onClick={handleClose}
            >
              <div
                className="relative w-full max-w-md overflow-hidden rounded-2xl"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--border-muted)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
                  maxHeight: "calc(100vh - 2rem)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Confirm view ── */}
                <div
                  style={{
                    ...viewTransform("confirm", modalView),
                    transition: TRANSITION,
                    position: modalView === "confirm" ? "relative" : "absolute",
                    inset: modalView !== "confirm" ? 0 : undefined,
                    overflow: "auto",
                  }}
                >
                  <div className="p-8 flex flex-col items-center gap-4 text-center">
                    <span
                      className="flex items-center justify-center w-14 h-14 rounded-full mb-1"
                      style={{
                        background: "rgba(244, 183, 40, 0.15)",
                        color: "#F4B728",
                      }}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-7 h-7"
                      >
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      Check your email
                    </h2>
                    <p
                      className="text-sm"
                      style={{ color: "var(--fg-body)", lineHeight: 1.6 }}
                    >
                      We sent a confirmation link to your inbox. Click it and
                      follow the instructions to gain Early Access.
                    </p>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="cursor-pointer rounded-full px-8 py-2.5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110"
                      style={primaryBtnStyle}
                    >
                      Done
                    </button>
                  </div>
                </div>

                {/* ── Community view ── */}
                <div
                  style={{
                    ...viewTransform("community", modalView),
                    transition: TRANSITION,
                    position:
                      modalView === "community" ? "relative" : "absolute",
                    inset: modalView !== "community" ? 0 : undefined,
                    overflow: "auto",
                  }}
                >
                  <div className="p-8 flex flex-col items-center gap-5 text-center">
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      Join the community
                    </h2>
                    <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                      Follow us and connect with other early adopters.
                    </p>
                    <div className="flex flex-col gap-3 w-full">
                      {COMMUNITY_LINKS.map(({ label, href, d }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center gap-3 rounded-xl border border-border-muted px-4 py-3 text-sm font-semibold transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                          style={{
                            background: "var(--color-surface)",
                            color: "var(--fg-body)",
                            textDecoration: "none",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-5 w-5 shrink-0"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            <path d={d} />
                          </svg>
                          {label}
                        </a>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalView("confirm")}
                      className="cursor-pointer rounded-full px-8 py-2.5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110"
                      style={primaryBtnStyle}
                    >
                      Back
                    </button>
                  </div>
                </div>

                {/* ── Survey view ── */}
                <div
                  style={{
                    ...viewTransform("survey", modalView),
                    transition: TRANSITION,
                    position: modalView === "survey" ? "relative" : "absolute",
                    inset: modalView !== "survey" ? 0 : undefined,
                    overflow: "auto",
                  }}
                >
                  <SurveyForm
                    referralCode={myReferralCode}
                    onComplete={(shouldContact) => {
                      setSurveyContactMsg(shouldContact);
                      setModalView("thankyou");
                    }}
                    onBack={() => setModalView("confirm")}
                  />
                </div>

                {/* ── Thank You view ── */}
                <div
                  style={{
                    ...viewTransform("thankyou", modalView),
                    transition: TRANSITION,
                    position:
                      modalView === "thankyou" ? "relative" : "absolute",
                    inset: modalView !== "thankyou" ? 0 : undefined,
                    overflow: "auto",
                  }}
                >
                  <div className="p-8 flex flex-col items-center gap-4 text-center">
                    <span
                      className="flex items-center justify-center w-14 h-14 rounded-full mb-1"
                      style={{
                        background: "var(--home-result-status-positive-bg)",
                        color: "var(--home-result-status-positive-fg)",
                      }}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-7 h-7"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      Thank you!
                    </h2>
                    <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                      Your responses help us build a better product.
                    </p>
                    {surveyContactMsg && (
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--fg-heading)" }}
                      >
                        We&rsquo;ll contact you soon.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleClose}
                      className="cursor-pointer rounded-full px-8 py-2.5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110"
                      style={primaryBtnStyle}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ── Inline form ── */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-4xl flex-col gap-3"
      >
        {/* Entry input */}
        <div
          id="waitlist-name-entry"
          ref={nameFieldTopRef}
          className={`searchform-shell has-locked-suffix${focused ? " is-focused" : ""}`}
        >
          <div className="searchform-main is-locked-suffix">
            <div className="searchform-input-stack">
              <span className="searchform-input-overlay" aria-hidden="true">
                <span
                  className={`searchform-input-overlay-value${name ? " has-value" : " is-placeholder"}`}
                >
                  {nameInput || "yourname"}
                </span>
                <AnimatedSuffix />
              </span>
              <input
                ref={nameInputRef}
                type="text"
                value={nameInput}
                onChange={(e) => {
                  lookupRequestRef.current += 1;
                  setNameLookup({ status: "idle" });
                  setNameInput(normalizeUsername(e.target.value));
                  setConfirmedName("");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmName();
                  }
                }}
                placeholder=""
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="searchform-input searchform-input-locked"
                aria-label="Enter your desired ZcashName"
              />
            </div>
          </div>
          <button
            type="button"
            className="waitlist-badge hidden sm:inline-flex"
            aria-disabled={!name}
            onClick={confirmName}
          >
            Early Access &nbsp;
          </button>
          <button
            type="button"
            aria-label="Next"
            className="searchform-claim waitlist-badge-btn"
            aria-disabled={!name}
            onClick={confirmName}
          >
            <span className="searchform-claim-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                focusable="false"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Result card */}
        {renderResultCard && (
          <div
            className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
            style={{
              gridTemplateRows: resultCardOpen ? "1fr" : "0fr",
              opacity: resultCardOpen ? 1 : 0,
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <section
                className="home-result-card transition-transform duration-300 ease-out motion-reduce:transition-none"
                style={{
                  transform: resultCardOpen ? "translateY(0)" : "translateY(-10px)",
                }}
                aria-live="polite"
              >
                <div className="home-result-top">
                  <div
                    className="home-result-heading"
                    style={{ minWidth: 0, flex: "1 1 0" }}
                  >
                    <p className="home-result-name">{displayedConfirmedName}.zcash</p>
                    {!hasResolvedNameLookup ? (
                      nameLookup.status === "error" ? (
                        <button
                          type="button"
                          onClick={retryNameLookup}
                          className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red, #e05252)]"
                          style={{
                            color: "var(--accent-red, #d67452)",
                            background: "color-mix(in srgb, var(--accent-red, #d67452) 12%, transparent)",
                          }}
                        >
                          Couldn&apos;t check name. Retry
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center self-center text-xs font-semibold leading-none"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          Checking name...
                        </span>
                      )
                    ) : isProtectedName ? (
                      <Link
                        href={`/protected?${new URLSearchParams({
                          search: displayedConfirmedName,
                          searchMode: "exact",
                          details: "true",
                        }).toString()}`}
                        className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-interactive)]"
                        style={{
                          color: "var(--color-accent-interactive)",
                          background: "color-mix(in srgb, var(--color-accent-interactive) 12%, transparent)",
                        }}
                      >
                        Protected
                      </Link>
                    ) : (
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                        style={{
                          color: "var(--accent-green, #27b36a)",
                          background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
                        }}
                      >
                        Available
                      </span>
                    )}
                    {hasResolvedNameLookup && displayedWaitlistCount > 0 && (
                      <Link
                        href={`/waitlist/view?${new URLSearchParams({
                          search: displayedConfirmedName,
                          searchMode: "exact",
                        }).toString()}`}
                        className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-interactive)]"
                        style={{
                          color: "var(--fg-muted)",
                          background: "var(--market-stats-segment-active-bg)",
                        }}
                      >
                        {displayedWaitlistCount} waiting
                      </Link>
                    )}
                  </div>
                </div>

                {hasResolvedNameLookup ? (
                  <>
                    {/* Form fields */}
                    <div
                      className="flex flex-col gap-3 px-1 pb-1"
                      style={{
                        borderTop: "1px solid var(--home-result-trust-border)",
                        paddingTop: "1rem",
                        marginTop: "0.25rem",
                      }}
                    >
              {/* Email */}
              <div className="w-full">
                <div className="waitlist-email-shell relative">
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full rounded-xl py-3 pl-4 pr-28 text-sm outline-none transition-colors"
                    style={{
                      ...inputBase,
                      border: "none",
                    }}
                  />
                  <span className="absolute bottom-1 right-1 top-1 flex items-center">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex h-full shrink-0 items-center justify-center rounded-[10px] px-4 text-sm font-semibold leading-none transition disabled:cursor-not-allowed"
                      style={{
                        background: canSubmit
                          ? "var(--home-result-primary-bg)"
                          : "color-mix(in srgb, var(--leaders-card-border, var(--border-muted)) 22%, transparent)",
                        color: canSubmit ? "var(--home-result-primary-fg)" : "var(--fg-muted)",
                        boxShadow: canSubmit ? "var(--home-result-primary-shadow)" : "none",
                        cursor: submitting ? "progress" : canSubmit ? "pointer" : "not-allowed",
                        opacity: captchaOpen || submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? (
                        <AnimatedLoadingLabel label="Submitting" active />
                      ) : isProtectedName ? (
                        "Request"
                      ) : (
                        "Submit"
                      )}
                    </button>
                  </span>
                </div>
                {email.length > 0 && !emailValid ? (
                  <p
                    className="mt-2 text-xs"
                    style={{ color: "var(--home-result-status-negative-fg, #e05252)" }}
                  >
                    Enter a valid email address.
                  </p>
                ) : null}
              </div>

              {showNewsletter && !isProtectedName && (
                <div className="flex items-center gap-3">
                  <label
                    className="flex items-center gap-3 cursor-pointer select-none text-sm"
                    style={{ color: "var(--fg-body)" }}
                  >
                    <span
                      className="relative flex items-center justify-center shrink-0 rounded"
                      style={{
                        width: 16,
                        height: 16,
                        background: newsletter
                          ? "var(--checkbox-accent)"
                          : "var(--color-surface)",
                        border: `1.5px solid ${newsletter ? "var(--checkbox-accent)" : "var(--border-muted)"}`,
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newsletter}
                        onChange={(e) => setNewsletter(e.target.checked)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer m-0"
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
                    Get newsletter
                  </label>
                </div>
              )}

              {submitError && (
                <p
                  className="text-xs text-center"
                  style={{ color: "var(--home-result-status-negative-fg)" }}
                >
                  {submitError}
                </p>
              )}
                    </div>

                    {/* Fine print */}
                    <div className="home-result-trust">
                      <p
                        className="text-xs w-full"
                        style={{
                          color: "var(--fg-muted)",
                          lineHeight: 1.5,
                          textAlign: "center",
                        }}
                      >
                        The waitlist only gives early notice and access. It does not
                        reserve or guarantee names.
                      </p>
                    </div>
                  </>
                ) : null}
              </section>
            </div>
          </div>
        )}
      </form>
    </>
  );
}
