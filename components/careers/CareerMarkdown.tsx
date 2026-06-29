import type { CSSProperties, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`"'.,!?()[\]{}:;/\\]+/g, "")
    .replace(/\s+/g, "-");
}

function textFromChildren(children: ReactNode): string {
  return Array.isArray(children)
    ? children.map((child) => textFromChildren(child)).join("")
    : typeof children === "string" || typeof children === "number"
      ? String(children)
      : "";
}

function sanitizeCareerMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let skippingPurpose = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^##\s+purpose\s*$/i.test(trimmed)) {
      skippingPurpose = true;
      continue;
    }

    if (skippingPurpose && /^##\s+/.test(trimmed)) {
      skippingPurpose = false;
    }

    if (!skippingPurpose) {
      output.push(line);
    }
  }

  return output.join("\n").trim();
}

type CareerSectionStyle = {
  kind: "check" | "plus" | "circle" | "dot";
  filled: boolean;
};

function styleForSection(section: string | null): CareerSectionStyle {
  const normalized = section?.trim().toLowerCase() ?? "";

  if (normalized === "responsibilities") return { kind: "circle", filled: false };
  if (normalized === "required") return { kind: "dot", filled: true };
  if (normalized === "strong plus") return { kind: "plus", filled: false };
  if (normalized === "success" || normalized === "success measures") return { kind: "check", filled: false };

  return { kind: "check", filled: false };
}

export default function CareerMarkdown({ markdown }: { markdown: string }) {
  const seen = new Map<string, number>();
  let currentSection: string | null = null;
  const renderedMarkdown = sanitizeCareerMarkdown(markdown);

  function headingId(text: string): string {
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  }

  return (
    <div
      className="max-w-none"
      style={
        {
          color: "var(--fg-body)",
        } as CSSProperties
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1() {
            return null;
          },
          h2({ children }) {
            const text = textFromChildren(children);
            currentSection = text;
            return (
              <h2
                id={headingId(text)}
                className="mt-10 text-2xl font-bold tracking-tight first:mt-0 sm:text-[1.9rem]"
                style={{ color: "var(--fg-heading)", lineHeight: 1.2, marginBottom: "1rem" }}
              >
                {children}
              </h2>
            );
          },
          h3({ children }) {
            const text = textFromChildren(children);
            return (
              <h3
                id={headingId(text)}
                className="mt-8 text-xl font-semibold tracking-tight sm:text-[1.35rem]"
                style={{ color: "var(--fg-heading)", lineHeight: 1.25, marginBottom: "0.9rem" }}
              >
                {children}
              </h3>
            );
          },
          p({ children }) {
            return (
              <p className="text-base leading-8" style={{ color: "var(--fg-body)", marginBottom: "1rem" }}>
                {children}
              </p>
            );
          },
          ul({ children }) {
            return <ul className="m-0 flex list-none flex-col gap-3 p-0">{children}</ul>;
          },
          li({ children }) {
            const style = styleForSection(currentSection);
            return (
              <li
                className="[--career-accent:color-mix(in_srgb,#f4b728_82%,#ffe08b)] [--career-accent-soft:color-mix(in_srgb,#f4b728_18%,transparent)] [--career-icon-on-accent:white] [--career-item-bg:color-mix(in_srgb,var(--color-raised)_72%,transparent)] [--career-icon-bg:linear-gradient(180deg,color-mix(in_srgb,var(--career-accent-soft)_92%,white_8%),var(--career-accent-soft))] flex items-start gap-3 rounded-2xl border px-4 py-3 [[data-theme=light]_&]:[--career-accent:var(--color-brand-blue)] [[data-theme=light]_&]:[--career-accent-soft:color-mix(in_srgb,var(--color-brand-blue)_14%,transparent)] [[data-theme=monochrome]_&]:[--career-accent:var(--color-accent-green)] [[data-theme=monochrome]_&]:[--career-accent-soft:var(--color-accent-green-light)] [[data-theme=monochrome]_&]:[--career-item-bg:transparent] [[data-theme=monochrome]_&]:[--career-icon-bg:linear-gradient(180deg,color-mix(in_srgb,var(--career-accent-soft)_78%,transparent),color-mix(in_srgb,var(--career-accent-soft)_58%,transparent))]"
                style={{
                  borderColor: "color-mix(in srgb, var(--fg-heading) 14%, var(--faq-border))",
                  background: "var(--career-item-bg)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                  style={{
                    borderColor: "var(--career-accent)",
                    background: "var(--career-icon-bg)",
                    color: "var(--career-accent)",
                  }}
                >
                  {style.kind === "plus" ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M8 3.5v9" />
                      <path d="M3.5 8h9" />
                    </svg>
                  ) : style.kind === "circle" ? (
                    <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: "currentColor" }} />
                  ) : style.kind === "dot" ? (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "currentColor" }} />
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M3.5 8 6.5 11 12.5 5" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1 [&_p]:m-0 [&_p]:text-base [&_p]:leading-7" style={{ color: "var(--fg-body)" }}>
                  {children}
                </span>
              </li>
            );
          },
        }}
      >
        {renderedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
