"use client";

import type React from "react";
import { ACTION_LABELS, ACTION_NOUNS } from "@/lib/types";
import type { Action, Phase, ScanState } from "@/lib/types";
import AnimatedLoadingLabel, {
  AnimatedEllipsis,
} from "@/components/ui/AnimatedLoadingLabel";

export type PurchaseCopyState = {
  address?: string;
  /** Payment URI amount (ZEC string). Empty/zero means memo-only copy. */
  amountZec?: string;
};

export function shortAddress(address: string | undefined): string {
  const value = address?.trim() ?? "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export function InlineBadge({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="inline-flex max-w-full items-center rounded-md px-1.5 py-0.5 font-mono text-[0.92em] align-baseline"
      style={{
        background: "var(--color-raised)",
        border: "1px solid var(--border-muted)",
        color: "var(--fg-heading)",
      }}
    >
      {children}
    </code>
  );
}

export function NameBadge({ name }: { name: string }) {
  return <InlineBadge>{name}</InlineBadge>;
}

export function AddressBadge({ address }: { address: string | undefined }) {
  return <InlineBadge>{shortAddress(address)}</InlineBadge>;
}

export function SentenceLines({
  children,
  align = "start",
  gap = "default",
}: {
  children: React.ReactNode;
  align?: "start" | "center";
  /** `relaxed` adds more space between stacked success lines. */
  gap?: "default" | "relaxed";
}) {
  const gapClass = gap === "relaxed" ? "gap-3" : "gap-1";
  return (
    <span
      className={
        align === "center"
          ? `inline-flex flex-col items-center ${gapClass} text-center`
          : `inline-flex flex-col items-start ${gapClass} text-left`
      }
    >
      {children}
    </span>
  );
}

export function phaseHeader(action: Action, phase: Phase): string {
  if (phase === "input") return `${ACTION_LABELS[action]}`;
  if (phase === "otp") return "Enter Passcode";
  if (phase === "confirm") {
    return action === "CLAIM" ? "Send Payment" : "Send Request Fee";
  }
  if (phase === "respond") return "Send Final Payment";
  return "Scanning";
}

export function inputDescription(action: Action, name: string): React.ReactNode {
  switch (action) {
    case "RELEASE":
      return <>Allow others to claim it.</>;
    case "UPDATE":
      return <>Set a new address.</>;
    case "CLAIM":
      return <>Control it with your wallet.</>;
  }
}

export function scanningStatusMessage(action: Action, scanState: ScanState): React.ReactNode {
  switch (scanState) {
    case "not_detected":
      return (
        <SentenceLines align="center">
          <span>
            <AnimatedLoadingLabel
              label={`Your ${ACTION_NOUNS[action]} hasn't been detected yet`}
              active
            />
          </span>
        </SentenceLines>
      );
    case "in_mempool":
      return (
        <SentenceLines align="center">
          <span>Your {ACTION_NOUNS[action]} is in the mempool.</span>
          <span>Waiting to be mined.</span>
        </SentenceLines>
      );
    case "confirming":
      return (
        <SentenceLines align="center">
          <span>Your {ACTION_NOUNS[action]} is being mined.</span>
          <span>Hang tight &mdash; this should only take a moment.</span>
        </SentenceLines>
      );
    case "mined":
      return null;
  }
}

export function minedMessage(action: Action, name: string, address?: string): React.ReactNode {
  switch (action) {
    case "CLAIM":
      return (
        <SentenceLines align="center" gap="relaxed">
          <span>Claim confirmed on-chain!</span>
          <span><NameBadge name={name} /> now resolves to <AddressBadge address={address} />.</span>
        </SentenceLines>
      );
    case "UPDATE":
      return (
        <SentenceLines align="center" gap="relaxed">
          <span>Update is confirmed on-chain!</span>
          <span><NameBadge name={name} /> now resolves to <AddressBadge address={address} />.</span>
        </SentenceLines>
      );
    case "RELEASE":
      return (
        <SentenceLines align="center">
          <span><NameBadge name={name} /> has been released.</span>
          <span>It can now be claimed by anyone.</span>
        </SentenceLines>
      );
  }
}

export function modalDescription(
  action: Action,
  phase: Phase,
  name: string,
  state: PurchaseCopyState = {},
): React.ReactNode {
  const nameBadge = <NameBadge name={name} />;

  switch (phase) {
    case "input":
      return <>{inputDescription(action, name)}</>;
    case "confirm":
      if (action === "CLAIM") {
        return <>{state.amountZec ? <>Send the name price to <strong>{nameBadge}</strong>'s mint request.</> : <>Preparing your claim request.</>}</>;
      }
      return <>Send the $1 request fee for <strong>{nameBadge}</strong>.</>;
    case "otp":
      return <>Enter the passcode the mint sent to the bound address.</>;
    case "respond":
      return <>{action === "UPDATE" ? <>Send the update payment to execute <strong>{nameBadge}</strong>'s update.</> : <>Send the release memo to release <strong>{nameBadge}</strong>.</>}</>;
    case "scanning":
      return <>Watching the chain for <strong>{nameBadge}</strong>.</>;
    default:
      return null;
  }
}

export function progressFillForPhase(
  step: Phase,
  index: number,
  activeIndex: number,
  scanState: ScanState = "not_detected",
): number {
  if (index < activeIndex) return 1;
  if (index > activeIndex) return 0;
  if (step === "scanning") return scanState === "mined" ? 1 : scanState === "not_detected" ? 0.15 : 0.55;
  return 0.15;
}
