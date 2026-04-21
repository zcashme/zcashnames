"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type ThemeName = "dark" | "light" | "monochrome";

export type Snippets = Record<ThemeName, string>;

interface Props {
  title: string;
  description?: string;
  selector?: string;
  filename: string;
  snippets: Snippets;
  children: React.ReactNode;
}

function isThemeName(v: string | undefined): v is ThemeName {
  return v === "dark" || v === "light" || v === "monochrome";
}

export default function GalleryCard({
  title,
  description,
  selector,
  filename,
  snippets,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const active: ThemeName = (() => {
    if (!mounted) return "dark";
    const t = resolvedTheme ?? theme;
    return isThemeName(t) ? t : "dark";
  })();

  const code = snippets[active];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className="gallery-card"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--border-muted)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 14px 28px rgba(0,0,0,0.18)",
      }}
    >
      <header
        style={{
          padding: "1rem 1.25rem 0.9rem",
          borderBottom: "1px solid var(--border-muted)",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              color: "var(--fg-heading)",
              fontSize: "1.1rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {title}
          </h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.22rem 0.55rem",
              borderRadius: 999,
              border: "1px solid var(--border-muted)",
              background: "var(--color-surface)",
              color: "var(--fg-muted)",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
            title="Snippet matches the currently active theme"
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background:
                  active === "dark"
                    ? "#1a1a1a"
                    : active === "light"
                    ? "#f3f5fb"
                    : "#9bbc0f",
                border: "1px solid var(--border-muted)",
              }}
            />
            {active}
          </span>
        </div>
        {description && (
          <p style={{ color: "var(--fg-body)", fontSize: "0.9rem", lineHeight: 1.45, margin: 0 }}>
            {description}
          </p>
        )}
        {selector && (
          <code
            style={{
              display: "block",
              marginTop: "0.25rem",
              fontSize: "0.72rem",
              color: "var(--fg-muted)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              wordBreak: "break-all",
            }}
          >
            {selector}
          </code>
        )}
      </header>

      <div
        style={{
          padding: "2rem 1.25rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "var(--color-background)",
          borderBottom: "1px solid var(--border-muted)",
          minHeight: 220,
        }}
      >
        {children}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "0.75rem 1.25rem",
            background: "transparent",
            border: "none",
            color: "var(--fg-heading)",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
            Code
            <span style={{ color: "var(--fg-muted)", fontWeight: 500, fontSize: "0.78rem" }}>
              standalone HTML · {active} theme · no Tailwind · no vars
            </span>
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={copy}
              style={{
                padding: "0.3rem 0.65rem",
                borderRadius: 999,
                border: "1px solid var(--border-muted)",
                background: "var(--color-surface)",
                color: "var(--fg-body)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={download}
              style={{
                padding: "0.3rem 0.65rem",
                borderRadius: 999,
                border: "1px solid var(--border-muted)",
                background: "var(--color-surface)",
                color: "var(--fg-body)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Download
            </button>
          </span>
        </button>

        {open && (
          <pre
            style={{
              margin: 0,
              padding: "1rem 1.25rem 1.25rem",
              background: "#0b0d10",
              color: "#d8dee9",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.78rem",
              lineHeight: 1.5,
              overflowX: "auto",
              maxHeight: 520,
              overflowY: "auto",
              borderTop: "1px solid var(--border-muted)",
              whiteSpace: "pre",
            }}
          >
            <code>{code}</code>
          </pre>
        )}
      </div>
    </section>
  );
}
