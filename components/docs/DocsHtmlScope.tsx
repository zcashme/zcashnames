"use client";

import { useLayoutEffect } from "react";

/**
 * Marker class on <html> while the docs route is mounted.
 * docs.css scopes its dark-only overrides under this class so they do not
 * leak onto the marketing site after client navigation away from /docs.
 */
export const DOCS_HTML_CLASS = "zns-docs";

/**
 * Adds/removes the docs scope class around the docs layout lifetime.
 * Also drops Nextra next-themes leftovers (class="dark"|"light") on exit so
 * marketing can drive appearance via data-theme alone.
 */
export default function DocsHtmlScope() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(DOCS_HTML_CLASS);

    return () => {
      root.classList.remove(DOCS_HTML_CLASS);
      // Nextra ThemeProvider uses attribute="class" and may not clean up on unmount.
      root.classList.remove("dark", "light");
    };
  }, []);

  return null;
}
