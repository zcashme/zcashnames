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

type ProtectedDisputeShareButtonProps = {
  buttonClassName?: string;
  emailSubject?: string;
  label?: string;
  menuAlign?: "left" | "right";
  menuDirection?: "down" | "up";
  mode: "page" | "success";
  portalMenu?: boolean;
  submittedName?: string | null;
};

const PROTECTED_DISPUTE_SHARE_URL = "Zcashnames.com/protected/dispute";

function buildPageShareMessages() {
  return {
    general: `Dispute a protected or rejected name in the Zcash Name Space at ZcashNames: ${PROTECTED_DISPUTE_SHARE_URL}.`,
    social: `Dispute a protected or rejected name in the Zcash Name Space at @ZcashNames: ${PROTECTED_DISPUTE_SHARE_URL}.`,
  };
}

function buildSuccessShareMessages(name: string) {
  return {
    general: `I just disputed "${name}" on ZcashNames. Challenge a protected or rejected name: ${PROTECTED_DISPUTE_SHARE_URL}`,
    social: `I just disputed "${name}" on @ZcashNames. Challenge a protected or rejected name: ${PROTECTED_DISPUTE_SHARE_URL}`,
  };
}

export default function ProtectedDisputeShareButton({
  buttonClassName,
  emailSubject = "Dispute a Protected Zcash Name",
  label = "Share",
  menuAlign = "right",
  menuDirection = "down",
  mode,
  portalMenu = false,
  submittedName,
}: ProtectedDisputeShareButtonProps) {
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
        ?? "inline-flex min-h-10 items-center gap-2 rounded-full border border-border-muted bg-transparent px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
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
