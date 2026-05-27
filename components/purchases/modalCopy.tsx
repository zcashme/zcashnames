"use client";

import type React from "react";
import { ACTION_LABELS, ACTION_NOUNS } from "@/lib/types";
import type { Action, Phase, ScanState } from "@/lib/types";

export type PurchaseCopyState = {
  address?: string;
  price?: string;
  priceInput?: string;
  settleState?: ScanState;
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

export function SentenceLines({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex flex-col items-start gap-1 text-left">{children}</span>;
}

export function phaseHeader(action: Action, phase: Phase): string {
  if (phase === "unlock") return "Reserved Name";
  if (phase === "input") return `${ACTION_LABELS[action]}`;
  if (phase === "sign") return "Sovereign Signature";
  if (phase === "otp") return "Verify Ownership";
  if (phase === "confirm") return action === "BUY" ? "Intent to Purchase" : "Send Payment";
  if (phase === "fund") return "Pay the seller";
  if (phase === "settling") return "Finalising your purchase";
  return "Scanning";
}

export function inputDescription(action: Action, name: string, amount?: string): React.ReactNode {
  switch (action) {
    case "BUY":
      return amount
        ? <>Purchase for <strong>{amount}</strong>.</>
        : <>Purchase.</>;
    case "DELIST":
      return <>Remove listing from sale.</>;
    case "RELEASE":
      return <>Allow others to claim it.</>;
    case "UPDATE":
      return <>Set a new address.</>;
    case "LIST":
      return <>Set a sale price.</>;
    case "CLAIM":
      return <>Control it with your wallet.</>;
  }
}

export function scanningStatusMessage(action: Action, scanState: ScanState): React.ReactNode {
  switch (scanState) {
    case "not_detected":
      return <>Your {ACTION_NOUNS[action]} hasn&rsquo;t been detected yet.</>;
    case "in_mempool":
      return (
        <SentenceLines>
          <span>Your {ACTION_NOUNS[action]} is in the mempool.</span>
          <span>Waiting to be mined.</span>
        </SentenceLines>
      );
    case "confirming":
      return (
        <SentenceLines>
          <span>Your {ACTION_NOUNS[action]} is being mined.</span>
          <span>Hang tight &mdash; this should only take a moment.</span>
        </SentenceLines>
      );
    case "mined":
      return null;
  }
}

export function settlingStatusMessage(action: Action, settleState: ScanState): React.ReactNode {
  switch (settleState) {
    case "not_detected":
      return <>Waiting for the registry to detect your payment to the seller...</>;
    case "in_mempool":
    case "confirming":
      return (
        <SentenceLines>
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
        <SentenceLines>
          <span>Claim confirmed on-chain!</span>
          <span><NameBadge name={name} /> now resolves to <AddressBadge address={address} />.</span>
        </SentenceLines>
      );
    case "BUY":
      return (
        <SentenceLines>
          <span>Purchase is confirmed on-chain!</span>
          <span><NameBadge name={name} /> now resolves to <AddressBadge address={address} />.</span>
        </SentenceLines>
      );
    case "UPDATE":
      return (
        <SentenceLines>
          <span>Address is updated on-chain!</span>
          <span><NameBadge name={name} /> now resolves to <AddressBadge address={address} />.</span>
        </SentenceLines>
      );
    case "LIST":
      return <><NameBadge name={name} /> is now listed for sale.</>;
    case "DELIST":
      return (
        <SentenceLines>
          <span><NameBadge name={name} /> has been delisted.</span>
          <span>It is no longer for sale.</span>
        </SentenceLines>
      );
    case "RELEASE":
      return (
        <SentenceLines>
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
  state: PurchaseCopyState,
  options?: { isResume?: boolean; listingPriceZec?: number },
): React.ReactNode {
  if (phase === "unlock") {
    return <><NameBadge name={name} /> is reserved. Enter unlock code to continue.</>;
  }
  if (phase === "input") {
    if (options?.isResume) {
      return (
        <SentenceLines>
          <span>A purchase is already occurring for this name.</span>
          <span>It will expire soon.</span>
          <span>If you are the buyer, enter your address to complete the purchase.</span>
        </SentenceLines>
      );
    }
    return inputDescription(action, name, options?.listingPriceZec ? `${options.listingPriceZec} ZEC` : state.price);
  }
  if (phase === "sign") {
    return <>Sign this payload with your Ed25519 private key to authorize {ACTION_LABELS[action].toLowerCase()} for <NameBadge name={name} />.</>;
  }
  if (phase === "otp") {
    return <>Send exact amount and memo to the address below to request a verification code.</>;
  }
  if (phase === "confirm") {
    if (action === "BUY") return <>You&rsquo;ll pay the seller the listing price next.</>;
    return <>Send exact amount and memo to the address below to complete the transaction.</>;
  }
  if (phase === "fund") {
    return <>Send <strong>{options?.listingPriceZec ?? 0} ZEC</strong> to <NameBadge name={name} />&rsquo;s transparent address.</>;
  }
  if (phase === "settling") {
    if (state.settleState === "mined") return minedMessage("BUY", name, state.address);
    return <>The registry is waiting for your payment to the seller to confirm on-chain.</>;
  }
  if (state.address && state.settleState === "mined") return minedMessage("BUY", name, state.address);
  return <>Checking the mempool and resolver to {ACTION_NOUNS[action]} <NameBadge name={name} />.</>;
}

export function progressFillForPhase(
  step: Phase,
  index: number,
  activeIndex: number,
  scanState: ScanState,
): number {
  if (index < activeIndex) return 1;
  if (index > activeIndex) return 0;
  if (step !== "scanning") return 1;
  switch (scanState) {
    case "not_detected": return 0;
    case "in_mempool": return 1 / 3;
    case "confirming": return 2 / 3;
    case "mined": return 1;
  }
}
