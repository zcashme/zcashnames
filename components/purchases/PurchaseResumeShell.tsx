"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import { usePurchaseResume } from "@/components/hooks/usePurchaseResume";
import ResumeBanner from "@/components/purchases/ResumeBanner";
import { nameActionHref } from "@/lib/purchases/nameActionHref";
import { PURCHASE_MODAL_VISIBILITY_EVENT } from "@/lib/purchases/resume";

type VisibilityEvent = CustomEvent<{ open?: boolean }>;

export default function PurchaseResumeShell() {
  const router = useAppRouter();
  const pathname = usePathname();
  const { snapshot, visible, dismiss } = usePurchaseResume();
  const [externalModalOpen, setExternalModalOpen] = useState(false);

  useEffect(() => {
    function handleVisibility(event: Event) {
      const { open } = (event as VisibilityEvent).detail ?? {};
      setExternalModalOpen(Boolean(open));
    }

    window.addEventListener(PURCHASE_MODAL_VISIBILITY_EVENT, handleVisibility);
    return () => window.removeEventListener(PURCHASE_MODAL_VISIBILITY_EVENT, handleVisibility);
  }, []);

  function handleResume() {
    if (!snapshot) return;
    // Prefer the form-page path; Zip321Modal remains available as a dual path elsewhere.
    router.push(nameActionHref(snapshot.action, snapshot.name, snapshot.network));
  }

  // Hide the banner while the user is already on the matching form page.
  const onFormPage = (() => {
    if (!snapshot || !pathname) return false;
    const parts = pathname.toLowerCase().split("/").filter(Boolean);
    if (parts.length < 2) return false;
    return (
      parts[0] === snapshot.action.toLowerCase() &&
      decodeURIComponent(parts[1]) === snapshot.name.toLowerCase()
    );
  })();

  return (
    <>
      {visible && snapshot && (
        <ResumeBanner
          snapshot={snapshot}
          hiddenByFullModal={externalModalOpen || onFormPage}
          onResume={handleResume}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}
