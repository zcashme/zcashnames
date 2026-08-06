"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import ProtectedDisputeShareButton from "@/components/protected/ProtectedDisputeShareButton";

type ProtectedDisputeSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
};

export default function ProtectedDisputeSuccessModal({
  isOpen,
  onClose,
  name,
}: ProtectedDisputeSuccessModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative isolate w-full max-w-md overflow-visible rounded-2xl"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          maxHeight: "calc(100vh - 2rem)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="absolute left-1/2 top-0 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
          style={{
            background: "var(--home-result-status-positive-bg)",
            borderColor: "var(--faq-border)",
            color: "var(--home-result-status-positive-fg)",
            boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
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
            className="h-7 w-7"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-12 text-center">
          <h2 className="text-xl font-bold" style={{ color: "var(--fg-heading)" }}>
            Dispute submitted
          </h2>
          <p className="text-sm" style={{ color: "var(--fg-body)", lineHeight: 1.6 }}>
            Disputes are reviewed on a rolling basis.
            <br />
            Check the Protected Names list for updates.
          </p>
          <div className="relative z-20 grid w-full grid-cols-1 justify-items-center gap-3 sm:grid-cols-2">
            <ProtectedDisputeShareButton
              mode="success"
              submittedName={name}
              buttonClassName="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85 [background:var(--home-result-primary-bg)] [box-shadow:var(--home-result-primary-shadow)] [color:var(--home-result-primary-fg)]"
              menuDirection="down"
            />
            <Link
              href="/protected"
              className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full border border-border-muted bg-transparent px-5 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
            >
              View List
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--fg-body)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
