"use client";

import { useLayoutEffect } from "react";
import { DOCS_HTML_CLASS } from "@/components/docs/DocsHtmlScope";

/**
 * Marketing-route guard: strip docs-only html classes if they linger after
 * client navigation (or bfcache). Marketing appearance is driven by data-theme.
 */
export default function SiteThemeScope() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove(DOCS_HTML_CLASS, "dark", "light");
  }, []);

  return null;
}
