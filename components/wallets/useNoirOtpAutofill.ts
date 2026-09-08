"use client";

import { useEffect, useRef, useState } from "react";
import {
  getNoirTransactionHistory,
  type NoirTransaction,
} from "@/lib/wallets/noir";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const SIX_DIGIT_MEMO = /^(?:\(ZFA OTP\)\s*)?(\d{6})$/i;

export function extractNoirOtpCode(memo: string | null | undefined): string | null {
  return memo?.trim().match(SIX_DIGIT_MEMO)?.[1] ?? null;
}

export function findNoirOtpCode(
  history: NoirTransaction[],
  sentAt: number,
): string | null {
  const match = history
    .filter((transaction) => {
      return (
        transaction.type.toLowerCase() === "receive" &&
        (transaction.status.toLowerCase() === "pending" ||
          transaction.status.toLowerCase() === "mined") &&
        transaction.timestamp >= sentAt &&
        extractNoirOtpCode(transaction.memo) !== null
      );
    })
    .sort((left, right) => right.timestamp - left.timestamp)[0];

  return extractNoirOtpCode(match?.memo);
}

export type NoirOtpAutofillStatus =
  | "idle"
  | "polling"
  | "found"
  | "stopped"
  | "timed_out"
  | "error";

type UseNoirOtpAutofillOptions = {
  active: boolean;
  sentAt: number;
  code: string;
  onCode: (code: string) => void;
};

export function useNoirOtpAutofill({
  active,
  sentAt,
  code,
  onCode,
}: UseNoirOtpAutofillOptions): NoirOtpAutofillStatus {
  const [status, setStatus] = useState<NoirOtpAutofillStatus>("idle");
  const autofilledCodeRef = useRef("");

  useEffect(() => {
    if (!active || sentAt <= 0) {
      autofilledCodeRef.current = "";
      setStatus("idle");
      return;
    }

    if (code) {
      setStatus(autofilledCodeRef.current === code ? "found" : "stopped");
      return;
    }

    if (Date.now() >= sentAt + POLL_TIMEOUT_MS) {
      setStatus("timed_out");
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    setStatus("polling");

    async function poll() {
      if (cancelled) return;
      if (Date.now() >= sentAt + POLL_TIMEOUT_MS) {
        setStatus("timed_out");
        return;
      }

      try {
        const history = await getNoirTransactionHistory();
        if (cancelled) return;
        const nextCode = findNoirOtpCode(history, sentAt);
        if (nextCode) {
          autofilledCodeRef.current = nextCode;
          setStatus("found");
          onCode(nextCode);
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }

      timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [active, code, onCode, sentAt]);

  return status;
}
