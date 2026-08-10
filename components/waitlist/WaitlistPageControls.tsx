import type { ReactNode } from "react";
import Link from "next/link";

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5L5 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
      <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ControlLink({
  href,
  label,
  leadingIcon,
  trailingIcon,
  alignClassName,
}: {
  href: string;
  label: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  alignClassName: string;
}) {
  return (
    <div className={`flex w-full sm:flex-1 ${alignClassName}`}>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform] duration-[140ms] hover:-translate-y-px"
      >
        {leadingIcon}
        {label}
        {trailingIcon}
      </Link>
    </div>
  );
}

/** Page-end prev/next links. Sitewide Top lives next to Sitemap — no center back-to-top. */
export default function WaitlistPageControls({
  leftHref = "/",
  leftLabel = "ZcashNames.com",
  rightHref = "/waitlist/view",
  rightLabel = "View waitlist",
  showLeft = true,
  showRight = true,
}: {
  leftHref?: string;
  leftLabel?: string;
  rightHref?: string;
  rightLabel?: string;
  showLeft?: boolean;
  showRight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 pb-10 sm:flex-row sm:items-center sm:gap-4">
      {showLeft ? (
        <ControlLink
          href={leftHref}
          label={leftLabel}
          leadingIcon={<ArrowLeftIcon />}
          alignClassName="justify-start"
        />
      ) : (
        <div className="hidden sm:flex sm:flex-1" />
      )}
      {showRight ? (
        <ControlLink
          href={rightHref}
          label={rightLabel}
          trailingIcon={<ArrowRightIcon />}
          alignClassName="justify-start sm:justify-end"
        />
      ) : (
        <div className="hidden sm:flex sm:flex-1" />
      )}
    </div>
  );
}
