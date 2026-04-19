"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
