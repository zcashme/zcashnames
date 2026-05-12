"use client";

import { useState } from "react";

// Clipboard copy with auto-reset. Returns a `copied` boolean that flips back
// after `delay` ms, suitable for driving "Copied!" feedback UI.
export function useCopy(delay = 2000) {
  const [copied, setCopied] = useState(false);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), delay);
    } catch {
      setCopied(false);
    }
  }

  return { copied, copy };
}