"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useCopy } from "@/components/hooks/useCopy";
import { buildEmailShareHref, buildTelegramShareHref, buildXShareHref } from "@/lib/share";

type ShareDropdownProps = {
  label?: string;
  message: string;
  shareUrl: string;
  emailSubject?: string;
  buttonClassName?: string;
  menuAlign?: "left" | "right";
  showTriggerIcon?: boolean;
};

function TriggerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M4 12h16" />
      <path d="M12 4v16" />
    </svg>
  );
}

function MenuItem({
  href,
  onClick,
  icon,
  label,
  monochrome = false,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  monochrome?: boolean;
}) {
  const className = `flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-fg-heading transition-colors ${
    monochrome
      ? "hover:bg-[rgba(155,188,15,0.16)] hover:text-[var(--mono-3)]"
      : "hover:bg-[var(--color-raised)]"
  }`;
  const iconClassName = monochrome ? "shrink-0 text-fg-heading" : "shrink-0 text-fg-muted";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} role="menuitem">
        <span className={iconClassName}>{icon}</span>
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`cursor-pointer ${className}`} role="menuitem">
      <span className={iconClassName}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ShareDropdown({
  label = "Share",
  message,
  shareUrl,
  emailSubject = "ZcashNames",
  buttonClassName,
  menuAlign = "right",
  showTriggerIcon = true,
}: ShareDropdownProps) {
  const { resolvedTheme } = useTheme();
  const monochrome = resolvedTheme === "monochrome";
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const copyState = useCopy();

  function clearCloseTimeout() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, []);

  async function handleCopy() {
    clearCloseTimeout();
    await copyState.copy(message);
    setOpen(true);
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 1800);
  }

  async function handleSystemShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return;
    }

    try {
      await navigator.share({ text: message, url: shareUrl });
      setOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  const triggerClassName =
    buttonClassName ??
    "inline-flex min-h-11 items-center gap-2 rounded-md border border-border-muted bg-transparent px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading";
  const menuPositionClassName = menuAlign === "left" ? "left-0" : "right-0";
  const rootAlignmentClassName = menuAlign === "left" ? "items-start" : "items-end";
  const triggerRowClassName = menuAlign === "left" ? "items-start" : "items-end";
  const menuClassName = monochrome
    ? "border-[rgba(155,188,15,0.62)] bg-[rgba(15,56,15,0.96)] shadow-[0_18px_40px_rgba(15,56,15,0.62)]"
    : "border-border-muted bg-[var(--color-card)] shadow-lg";

  return (
    <div ref={rootRef} className={`relative flex flex-col gap-2 ${rootAlignmentClassName}`}>
      <div className={`flex flex-col gap-2 ${triggerRowClassName}`}>
        <button
          type="button"
          onClick={() => {
            clearCloseTimeout();
            setOpen((current) => !current);
          }}
          aria-expanded={open}
          aria-haspopup="menu"
          className={triggerClassName}
        >
          {showTriggerIcon ? <TriggerIcon /> : null}
          <span>{label}</span>
        </button>
      </div>

      <div
        className={`absolute top-full z-20 mt-2 flex min-w-[220px] flex-col rounded-lg border p-2 transition-all duration-200 ease-out ${menuPositionClassName} ${menuClassName} ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"
        }`}
        role="menu"
        aria-hidden={!open}
      >
        <MenuItem onClick={() => void handleCopy()} icon={<CopyIcon />} label={copyState.copied ? "Copied!" : "Copy Link"} monochrome={monochrome} />
        <MenuItem href={buildEmailShareHref(emailSubject, message)} icon={<EmailIcon />} label="Email" monochrome={monochrome} />
        <MenuItem href={buildTelegramShareHref(message)} icon={<TelegramIcon />} label="Telegram" monochrome={monochrome} />
        <MenuItem href={buildXShareHref(message)} icon={<XIcon />} label="X" monochrome={monochrome} />
        <MenuItem onClick={() => void handleSystemShare()} icon={<MoreIcon />} label="More ways" monochrome={monochrome} />
      </div>
    </div>
  );
}
