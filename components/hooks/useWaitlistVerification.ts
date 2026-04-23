"use client";

import { useEffect, useState, useCallback } from "react";
import { confirmWaitlistEmail } from "@/lib/waitlist/waitlist";

export type VerificationStatus =
  | { type: "idle" }
  | { type: "confirming" }
  | { type: "success"; name: string; ref: string }
  | { type: "already" }
  | { type: "invalid" }
  | { type: "error" };

interface UseWaitlistVerificationReturn {
  status: VerificationStatus;
  banner: string | null;
  clearBanner: () => void;
  closeSuccessModal: () => void;
}

export function useWaitlistVerification(): UseWaitlistVerificationReturn {
  const [status, setStatus] = useState<VerificationStatus>({ type: "idle" });
  const [banner, setBanner] = useState<string | null>(null);

  // Handle "?token=..." email confirmation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    // Clean URL immediately (don't wait for confirmation)
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search);

    setStatus({ type: "confirming" });
    confirmWaitlistEmail(token)
      .then((result) => {
        if (result.status === "success") {
          setStatus({
            type: "success",
            name: result.name ?? "",
            ref: result.ref ?? "",
          });
        } else if (result.status === "already") {
          setStatus({ type: "already" });
          setBanner("Your email is already confirmed.");
        } else {
          setStatus({ type: "invalid" });
          setBanner("Invalid or expired confirmation link.");
        }
      })
      .catch(() => {
        setStatus({ type: "error" });
        setBanner("Something went wrong confirming your email.");
      });
  }, []);

  // Handle "?verified=..." redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");

    if (verified === "success") {
      const ref = params.get("ref") || "";
      const name = params.get("name") || "";
      if (ref) {
        setStatus({ type: "success", name, ref });
      }
    } else if (verified === "already") {
      setBanner("Your email is already confirmed.");
    } else if (verified === "invalid") {
      setBanner("Invalid or expired confirmation link.");
    }

    // Clean params
    if (verified) {
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      url.searchParams.delete("ref");
      url.searchParams.delete("name");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  const clearBanner = useCallback(() => {
    setBanner(null);
  }, []);

  const closeSuccessModal = useCallback(() => {
    setStatus({ type: "idle" });
  }, []);

  return {
    status,
    banner,
    clearBanner,
    closeSuccessModal,
  };
}
