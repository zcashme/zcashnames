"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders a page title into the header via a React portal targeting #site-route-title.
// This lets deeply nested page components inject a contextual breadcrumb/title into the shell.
export default function SiteRouteTitle({ title }: { title: string }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("site-route-title"));
  }, []);

  if (!target || !title) return null;

  return createPortal(
    <span className="site-route-title" aria-label="Current page">
      {title}
    </span>,
    target,
  );
}
