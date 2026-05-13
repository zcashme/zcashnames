"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "leaders-ref-install-card-dismissed";
const STANDALONE_QUERY = "(display-mode: standalone)";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isWebKit = /WebKit/.test(ua);
  const isCriOS = /CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isWebKit && !isCriOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia(STANDALONE_QUERY).matches || iosNavigator.standalone === true;
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncStandalone = () => setStandalone(isStandalone());
    const media = window.matchMedia(STANDALONE_QUERY);
    const dismissedState = window.localStorage.getItem(DISMISS_KEY) === "1";

    setDismissed(dismissedState);
    setIosSafari(isIosSafari());
    syncStandalone();

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setPromptEvent(null);
      setDismissed(false);
      setStandalone(true);
      window.localStorage.removeItem(DISMISS_KEY);
    };

    const onMediaChange = () => syncStandalone();

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    media.addEventListener("change", onMediaChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  const hideCard = standalone || dismissed;
  const canInstall = Boolean(promptEvent);
  const showIosInstructions = !canInstall && iosSafari && !standalone;

  async function promptInstall() {
    if (!promptEvent || installing) return;

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome !== "accepted") {
        setPromptEvent(null);
      }
    } finally {
      setInstalling(false);
    }
  }

  function dismissInstallCard() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  function restoreInstallCard() {
    setDismissed(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DISMISS_KEY);
    }
  }

  return {
    canInstall,
    dismissed,
    dismissInstallCard,
    hideCard,
    installing,
    iosSafari,
    promptInstall,
    restoreInstallCard,
    showIosInstructions,
    standalone,
  };
}
