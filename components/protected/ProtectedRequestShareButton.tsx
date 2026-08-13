"use client";

import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/components/hooks/useCopy";
import {
  ActionDropdown,
  EmailIcon,
  MoreIcon,
  ShareCopyIcon,
  ShareTriggerIcon,
  TelegramIcon,
  XIcon,
  type ActionDropdownItem,
} from "@/components/ShareDropdown";
import {
  buildEmailShareHref,
  buildTelegramShareHref,
  buildXShareHref,
} from "@/lib/share";

type ProtectedRequestShareButtonProps = {
  buttonClassName?: string;
  emailSubject?: string;
  label?: string;
  menuAlign?: "left" | "right";
  menuDirection?: "down" | "up";
  mode: "page" | "success";
  portalMenu?: boolean;
  submittedName?: string | null;
};

const PROTECTED_REQUEST_SHARE_URL = "Zcashnames.com/protected/request";

function buildPageShareMessages() {
  return {
    general: `Request access to a protected name in the Zcash Name Space at ZcashNames: ${PROTECTED_REQUEST_SHARE_URL}.`,
    social: `Request access to a protected name in the Zcash Name Space at @ZcashNames: ${PROTECTED_REQUEST_SHARE_URL}.`,
  };
}

function buildSuccessShareMessages(name: string) {
  return {
    general: `I just requested access to "${name}" on ZcashNames. Request a protected name: ${PROTECTED_REQUEST_SHARE_URL}`,
    social: `I just requested access to "${name}" on @ZcashNames. Request a protected name: ${PROTECTED_REQUEST_SHARE_URL}`,
  };
}

export default function ProtectedRequestShareButton({
  buttonClassName,
  emailSubject = "Request a Protected Zcash Name",
  label = "Share",
  menuAlign = "right",
  menuDirection = "down",
  mode,
  portalMenu = false,
  submittedName,
}: ProtectedRequestShareButtonProps) {
  const copyState = useCopy();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const supportsSystemShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const messages =
    mode === "success" && submittedName
      ? buildSuccessShareMessages(submittedName)
      : buildPageShareMessages();

  async function handleCopy() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    await copyState.copy(messages.general);
    setOpen(true);
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 1800);
  }

  async function handleSystemShare() {
    if (!supportsSystemShare) return;

    try {
      await navigator.share({ text: messages.general });
      setOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  const items: ActionDropdownItem[] = [
    {
      key: "copy",
      label: copyState.copied ? "Copied!" : "Copy",
      icon: <ShareCopyIcon />,
      onClick: () => void handleCopy(),
    },
    {
      key: "email",
      label: "Email",
      icon: <EmailIcon />,
      href: buildEmailShareHref(emailSubject, messages.general),
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: <TelegramIcon />,
      href: buildTelegramShareHref(messages.social),
    },
    {
      key: "x",
      label: "X",
      icon: <XIcon />,
      href: buildXShareHref(messages.social),
    },
    ...(supportsSystemShare
      ? [
          {
            key: "system",
            label: "Other",
            icon: <MoreIcon />,
            onClick: () => void handleSystemShare(),
          } satisfies ActionDropdownItem,
        ]
      : []),
  ];

  return (
    <ActionDropdown
      buttonClassName={
        buttonClassName
        ?? "inline-flex min-h-10 items-center gap-2 rounded-full border border-border-muted bg-transparent px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
      }
      items={items}
      label={label}
      menuAlign={menuAlign}
      menuDirection={menuDirection}
      onOpenChange={(nextOpen) => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        setOpen(nextOpen);
      }}
      open={open}
      portalMenu={portalMenu}
      showTriggerIcon
      triggerIcon={<ShareTriggerIcon />}
    />
  );
}
