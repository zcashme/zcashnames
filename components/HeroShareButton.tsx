"use client";

import ShareDropdown from "@/components/ShareDropdown";

/** Theme-toggle twin: raised circle, icon only, accent on hover. */
export const HERO_SHARE_BUTTON_CLASSNAME =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--color-raised)] text-fg-heading transition-colors duration-200 hover:text-[var(--color-accent-interactive)] [&>span]:hidden";

type HeroShareButtonProps = {
  message: string;
  shareUrl: string;
  xMessage?: string;
  emailSubject?: string;
};

/**
 * Absolute top-right share control for gradient hero cards.
 * Parent must be `relative` (and preferably not clip overflow).
 */
export default function HeroShareButton({
  message,
  shareUrl,
  xMessage,
  emailSubject,
}: HeroShareButtonProps) {
  return (
    <div className="absolute right-4 top-4 z-30 sm:right-5 sm:top-5">
      <ShareDropdown
        label="Share"
        message={message}
        xMessage={xMessage ?? message}
        shareUrl={shareUrl}
        emailSubject={emailSubject}
        menuAlign="right"
        rootClassName="relative"
        buttonClassName={HERO_SHARE_BUTTON_CLASSNAME}
      />
    </div>
  );
}
