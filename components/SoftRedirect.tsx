"use client";

import { useEffect } from "react";

/**
 * Client-side replace navigation so the server can still emit full HTML
 * (including Open Graph meta) on alias URLs before sending the user on.
 */
export default function SoftRedirect({
  href,
  label = "Continue",
}: {
  href: string;
  label?: string;
}) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="text-sm" style={{ color: "var(--fg-body)" }}>
        Redirecting…
      </p>
      <p className="mt-3 text-sm">
        <a href={href} className="underline" style={{ color: "var(--fg-heading)" }}>
          {label}
        </a>
      </p>
    </main>
  );
}
