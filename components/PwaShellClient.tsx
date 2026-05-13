"use client";

import { useEffect } from "react";

const STANDALONE_QUERY = "(display-mode: standalone)";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia(STANDALONE_QUERY).matches || iosNavigator.standalone === true;
}

function setStandaloneState(active: boolean) {
  document.documentElement.classList.toggle("app-shell-standalone", active);
  document.body.classList.toggle("app-shell-standalone", active);
}

export default function PwaShellClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStandaloneState = () => {
      setStandaloneState(isStandalone());
    };

    updateStandaloneState();

    const media = window.matchMedia(STANDALONE_QUERY);
    const onChange = () => updateStandaloneState();
    media.addEventListener("change", onChange);
    window.addEventListener("appinstalled", onChange);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("appinstalled", onChange);
    };
  }, []);

  return null;
}
