"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePurchaseResume } from "@/components/hooks/usePurchaseResume";
import ResumeBanner from "@/components/purchases/ResumeBanner";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import { resolveName } from "@/lib/zns/resolve";
import { PURCHASE_MODAL_VISIBILITY_EVENT } from "@/lib/purchases/resume";
import type { Action, ResolveName } from "@/lib/types";

type ModalState = {
  action: Action;
  network: "mainnet" | "testnet";
  resolveResult: ResolveName;
} | null;

type VisibilityEvent = CustomEvent<{ open?: boolean }>;

export default function PurchaseResumeShell() {
  const router = useRouter();
  const { snapshot, visible, dismiss } = usePurchaseResume();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [externalModalOpen, setExternalModalOpen] = useState(false);

  useEffect(() => {
    function handleVisibility(event: Event) {
      const { open } = (event as VisibilityEvent).detail ?? {};
      setExternalModalOpen(Boolean(open));
    }

    window.addEventListener(PURCHASE_MODAL_VISIBILITY_EVENT, handleVisibility);
    return () => window.removeEventListener(PURCHASE_MODAL_VISIBILITY_EVENT, handleVisibility);
  }, []);

  async function handleResume() {
    if (!snapshot) return;
    const fresh = await resolveName(snapshot.name, snapshot.network);
    setModalState({ action: snapshot.action, network: snapshot.network, resolveResult: fresh });
  }

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      {modalState && (
        <Zip321Modal
          action={modalState.action}
          name={modalState.resolveResult.query}
          network={modalState.network}
          resolveResult={modalState.resolveResult}
          onClose={() => setModalState(null)}
          onSuccess={handleSuccess}
        />
      )}
      {visible && snapshot && (
        <ResumeBanner
          snapshot={snapshot}
          hiddenByFullModal={externalModalOpen || !!modalState}
          onResume={handleResume}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}
