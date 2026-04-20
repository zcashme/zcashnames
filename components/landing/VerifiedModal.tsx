"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import SurveyForm from "@/components/SurveyForm";

type ViewState = "confirm" | "survey" | "thankyou";

interface VerifiedModalProps {
  name: string;
  ref: string;
  isOpen: boolean;
  onClose: () => void;
}

const TRANSITION = "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)";

function getViewTransform(view: ViewState, current: ViewState) {
  if (view === "confirm") {
    if (current === "survey" || current === "thankyou") {
      return { transform: "translateY(-100%)", pointerEvents: "none" as const };
    }
    return { transform: "translate(0, 0)", pointerEvents: "auto" as const };
  }
  if (view === "survey") {
    if (current === "survey") return { transform: "translate(0, 0)", pointerEvents: "auto" as const };
    if (current === "thankyou") return { transform: "translateY(-100%)", pointerEvents: "none" as const };
    return { transform: "translateY(100%)", pointerEvents: "none" as const };
  }
  if (current === "thankyou") return { transform: "translate(0, 0)", pointerEvents: "auto" as const };
  return { transform: "translateY(100%)", pointerEvents: "none" as const };
}

function ConfirmView({
  name,
  ref,
  onTakeSurvey,
  onClose,
}: {
  name: string;
  ref: string;
  onTakeSurvey: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://zcashnames.com/?ref=${ref}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "ZcashNames", url: shareUrl });
      } catch {
        // dismissed
      }
    } else {
      await copyLink();
    }
  };

  return (
    <div className="p-8 flex flex-col items-center gap-4 text-center">
      <span
        className="flex items-center justify-center w-14 h-14 rounded-full mb-1"
        style={{ background: "var(--color-accent-green-light)", color: "var(--color-accent-green)" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <h2 className="text-xl font-bold" style={{ color: "var(--fg-heading)" }}>
        {name ? `${name}, you're` : "You're"} on the list!
      </h2>
      <p className="text-sm" style={{ color: "var(--fg-body)", lineHeight: 1.6 }}>
        We'll reach out before we launch.
      </p>
      <div className="w-full rounded-xl px-4 py-3 flex flex-col gap-3 text-left" style={{ border: "1px solid var(--border-muted)" }}>
        <p className="text-xs" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
          Get up to <strong style={{ color: "var(--fg-body)" }}>0.05 ZEC</strong> per referral who signs up and buys a
          name during early access, plus rewards from their referrals!
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 8l4 4 8-8" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={shareLink}
            className="flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share Link
          </button>
          <a
            href={`https://x.com/intent/post?text=${encodeURIComponent(`Whoa - @zcashnames is going to be big. I found the waitlist. Sign up and get alerted before they launch. ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)", textDecoration: "none" }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post on X
          </a>
        </div>
      </div>
      <div className="flex gap-3 justify-center w-full pt-1">
        <button
          type="button"
          onClick={onTakeSurvey}
          className="px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          Take Survey
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
        >
          Done
        </button>
      </div>
      <p className="m-0 text-center text-xs" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
        <Link href="/leaders/terms" className="underline underline-offset-2">
          View terms
        </Link>
      </p>
    </div>
  );
}

function ThankYouView({
  shouldContact,
  onClose,
}: {
  shouldContact: boolean;
  onClose: () => void;
}) {
  return (
    <div className="p-8 flex flex-col items-center gap-4 text-center">
      <span
        className="flex items-center justify-center w-14 h-14 rounded-full mb-1"
        style={{ background: "var(--home-result-status-positive-bg)", color: "var(--home-result-status-positive-fg)" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <h2 className="text-xl font-bold" style={{ color: "var(--fg-heading)" }}>Thank you!</h2>
      <p className="text-sm" style={{ color: "var(--fg-body)" }}>Your responses help us build a better product.</p>
      {shouldContact && (
        <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>We'll contact you soon.</p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
        style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
      >
        Done
      </button>
    </div>
  );
}

export function VerifiedModal({ name, ref, isOpen, onClose }: VerifiedModalProps) {
  const [view, setView] = useState<ViewState>("confirm");
  const [shouldContact, setShouldContact] = useState(false);

  const handleClose = useCallback(() => {
    setView("confirm");
    setShouldContact(false);
    onClose();
  }, [onClose]);

  const handleSurveyComplete = useCallback((contact: boolean) => {
    setShouldContact(contact);
    setView("thankyou");
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={handleClose}
    >
      <div
        className="relative rounded-2xl w-full max-w-md overflow-hidden"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          maxHeight: "calc(100vh - 2rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            ...getViewTransform("confirm", view),
            transition: TRANSITION,
            position: view === "confirm" ? "relative" : "absolute",
            inset: view !== "confirm" ? 0 : undefined,
            overflow: "auto",
          }}
        >
          <ConfirmView name={name} ref={ref} onTakeSurvey={() => setView("survey")} onClose={handleClose} />
        </div>

        <div
          style={{
            ...getViewTransform("survey", view),
            transition: TRANSITION,
            position: view === "survey" ? "relative" : "absolute",
            inset: view !== "survey" ? 0 : undefined,
            overflow: "auto",
          }}
        >
          <SurveyForm
            referralCode={ref}
            onComplete={handleSurveyComplete}
            onBack={() => setView("confirm")}
          />
        </div>

        <div
          style={{
            ...getViewTransform("thankyou", view),
            transition: TRANSITION,
            position: view === "thankyou" ? "relative" : "absolute",
            inset: view !== "thankyou" ? 0 : undefined,
            overflow: "auto",
          }}
        >
          <ThankYouView shouldContact={shouldContact} onClose={handleClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
