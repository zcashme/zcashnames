"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";

const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";
const SCRIPT_ID = "g-recaptcha-script";

type RecaptchaTheme = "light" | "dark";
type RecaptchaSize = "normal" | "compact" | "invisible";

interface RenderOptions {
  sitekey: string;
  theme?: RecaptchaTheme;
  size?: RecaptchaSize;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface GrecaptchaApi {
  render(container: HTMLElement, options: RenderOptions): number;
  reset(widgetId?: number): void;
  execute(widgetId?: number): void;
  ready(cb: () => void): void;
}

export interface RecaptchaHandle {
  execute(): void;
  reset(): void;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaApi;
    __grecaptchaLoader?: Promise<GrecaptchaApi>;
  }
}

function loadGrecaptcha(): Promise<GrecaptchaApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("reCAPTCHA can only load in the browser"));
  }
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (window.__grecaptchaLoader) return window.__grecaptchaLoader;

  window.__grecaptchaLoader = new Promise<GrecaptchaApi>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      const api = window.grecaptcha;
      if (!api) {
        reject(new Error("reCAPTCHA script loaded but window.grecaptcha is missing"));
        return;
      }
      api.ready(() => resolve(api));
    });
    script.addEventListener("error", () => reject(new Error("Failed to load reCAPTCHA script")));
    if (!existing) document.head.appendChild(script);
  });

  return window.__grecaptchaLoader;
}

interface Props {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: RecaptchaTheme;
  size?: RecaptchaSize;
  className?: string;
}

const Recaptcha = forwardRef<RecaptchaHandle, Props>(function Recaptcha({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = "light",
  size = "normal",
  className,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const id = useId();

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useImperativeHandle(ref, () => ({
    execute() {
      const api = window.grecaptcha;
      const widgetId = widgetIdRef.current;
      if (api && widgetId !== null) {
        try {
          api.execute(widgetId);
        } catch {
          // widget not ready or already executing
        }
      }
    },
    reset() {
      const api = window.grecaptcha;
      const widgetId = widgetIdRef.current;
      if (api && widgetId !== null) {
        try {
          api.reset(widgetId);
        } catch {
          // ignore
        }
      }
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    loadGrecaptcha()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onErrorRef.current?.(),
        });
      })
      .catch(() => {
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      const api = window.grecaptcha;
      const widgetId = widgetIdRef.current;
      if (api && widgetId !== null) {
        try {
          api.reset(widgetId);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, theme, size]);

  return <div ref={containerRef} id={`grecaptcha-${id}`} className={className} />;
});

export default Recaptcha;
