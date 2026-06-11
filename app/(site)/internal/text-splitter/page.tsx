"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import SiteRouteTitle from "@/components/SiteRouteTitle";

type SplitterOptions = {
  delimiter: string;
  trimSegments: boolean;
  includeEmptySegments: boolean;
};

function splitSourceText(sourceText: string, options: SplitterOptions) {
  if (sourceText.length === 0) {
    return [];
  }

  const { delimiter, trimSegments, includeEmptySegments } = options;
  const rawSegments = delimiter.length > 0 ? sourceText.split(delimiter) : [sourceText];
  const normalizedSegments = rawSegments.map((segment) =>
    trimSegments ? segment.trim() : segment,
  );

  return includeEmptySegments
    ? normalizedSegments
    : normalizedSegments.filter((segment) => segment.length > 0);
}

function joinSegments(segments: string[], delimiter: string) {
  if (segments.length === 0) return "";
  if (delimiter.length === 0) return segments[0] ?? "";
  return segments.join(delimiter);
}

function buildDownloadName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `text-splitter-source-${timestamp}.txt`;
}

const paneStyle: CSSProperties = {
  minHeight: 0,
};

function autosizeTextArea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
}

export default function InternalTextSplitterPage() {
  const [sourceText, setSourceText] = useState("");
  const [delimiter, setDelimiter] = useState("|");
  const [trimSegments, setTrimSegments] = useState(true);
  const [includeEmptySegments, setIncludeEmptySegments] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sourceTextRef = useRef<HTMLTextAreaElement | null>(null);
  const segmentTextRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const [copiedSegmentIndex, setCopiedSegmentIndex] = useState<number | null>(null);
  const [bulkCopied, setBulkCopied] = useState(false);

  const segments = useMemo(
    () =>
      splitSourceText(sourceText, {
        delimiter,
        trimSegments,
        includeEmptySegments,
      }),
    [delimiter, includeEmptySegments, sourceText, trimSegments],
  );

  useEffect(() => {
    autosizeTextArea(sourceTextRef.current);
  }, [sourceText]);

  useEffect(() => {
    segments.forEach((_, index) => {
      autosizeTextArea(segmentTextRefs.current[index] ?? null);
    });
  }, [segments]);

  const delimiterHint = delimiter.length === 0
    ? "Empty delimiter disables splitting and keeps the full text as one segment."
    : "Literal matching only. Multi-character delimiters like /// are supported.";

  async function copySegment(segment: string, index: number) {
    try {
      await navigator.clipboard.writeText(segment);
      setCopiedSegmentIndex(index);
      window.setTimeout(() => {
        setCopiedSegmentIndex((current) => (current === index ? null : current));
      }, 1800);
    } catch {
      setCopiedSegmentIndex(null);
    }
  }

  async function copyAllSegments() {
    try {
      await navigator.clipboard.writeText(segments.join("\n"));
      setBulkCopied(true);
      window.setTimeout(() => setBulkCopied(false), 1800);
    } catch {
      setBulkCopied(false);
    }
  }

  function updateSegment(index: number, nextValue: string) {
    const nextSegments = [...segments];
    nextSegments[index] = nextValue;
    setSourceText(joinSegments(nextSegments, delimiter));
  }

  function downloadSourceText() {
    const blob = new Blob([sourceText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadName();
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="w-full">
      <SiteRouteTitle title="Text Splitter" />
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="grid gap-4 rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Internal</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-fg-heading">Dynamic Text Splitter</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-fg-body">
                Paste source text on the left, place delimiters anywhere in the text, edit any
                resulting segment on the right, and keep both panes synchronized.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-border-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">
                {segments.length} {segments.length === 1 ? "segment" : "segments"}
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
                aria-expanded={settingsOpen}
                aria-controls="text-splitter-settings"
              >
                {settingsOpen ? "Hide settings" : "Advanced settings"}
              </button>
            </div>
          </div>

          {settingsOpen ? (
            <div id="text-splitter-settings" className="grid gap-4 border-t border-border-muted pt-4 lg:grid-cols-[minmax(0,240px)_1fr]">
              <div className="grid gap-2">
                <label htmlFor="text-splitter-delimiter" className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">
                  Delimiter
                </label>
                <input
                  id="text-splitter-delimiter"
                  type="text"
                  value={delimiter}
                  onChange={(event) => setDelimiter(event.target.value)}
                  placeholder="|"
                  className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                />
                <p className="text-xs leading-5 text-fg-muted">{delimiterHint}</p>
              </div>

              <div className="grid gap-3 self-end">
                <label className="flex items-center gap-3 rounded-md border border-border-muted bg-[var(--color-raised)] px-4 py-3 text-sm font-semibold text-fg-heading">
                  <input
                    type="checkbox"
                    checked={trimSegments}
                    onChange={(event) => setTrimSegments(event.target.checked)}
                    className="h-4 w-4 rounded border-border-muted"
                  />
                  Trim whitespace around each segment
                </label>
                <label className="flex items-center gap-3 rounded-md border border-border-muted bg-[var(--color-raised)] px-4 py-3 text-sm font-semibold text-fg-heading">
                  <input
                    type="checkbox"
                    checked={includeEmptySegments}
                    onChange={(event) => setIncludeEmptySegments(event.target.checked)}
                    className="h-4 w-4 rounded border-border-muted"
                  />
                  Include empty segments from repeated or edge delimiters
                </label>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => void copyAllSegments()}
                    disabled={segments.length === 0}
                    className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-muted"
                  >
                    {bulkCopied ? "Copied all" : "Copy all"}
                  </button>
                  <span className="text-xs leading-5 text-fg-muted">
                    Copies the visible segment list joined with newlines.
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <section className="grid grid-cols-2 gap-6">
          <article className="flex h-[calc(100vh-18rem)] min-h-[540px] flex-col rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-fg-heading">Source Text</h2>
                <p className="mt-1 text-sm leading-6 text-fg-body">
                  Type or paste text here, or edit any segment on the right and watch this source update.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="rounded-full border border-border-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">
                  {sourceText.length} chars
                </span>
                <button
                  type="button"
                  onClick={downloadSourceText}
                  disabled={sourceText.length === 0}
                  className="rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-muted"
                >
                  Download source
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={paneStyle}>
              <textarea
                ref={sourceTextRef}
                id="text-splitter-source"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                className="min-h-[420px] w-full overflow-hidden resize-none rounded-md border border-border-muted bg-[var(--color-raised)] px-4 py-4 text-sm font-medium leading-6 text-fg-heading outline-none focus:border-fg-heading"
                placeholder="Example: Text A | Text B | Text C"
                spellCheck={false}
              />
            </div>
          </article>

          <article className="flex h-[calc(100vh-18rem)] min-h-[540px] flex-col rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-fg-heading">Segmented Output</h2>
                <p className="mt-1 text-sm leading-6 text-fg-body">
                  Edit any segment here and the source text will be rebuilt immediately from the current delimiter.
                </p>
              </div>
              <span className="rounded-full border border-border-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">
                {segments.length} items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1" style={paneStyle}>
              {segments.length === 0 ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-border-muted bg-[var(--color-raised)] px-6 text-center text-sm leading-6 text-fg-muted">
                  Add source text to generate segments. Empty input shows no output fields.
                </div>
              ) : (
                <div className="grid gap-4">
                  {segments.map((segment, index) => {
                    const isCopied = copiedSegmentIndex === index;
                    const isEmpty = segment.length === 0;
                    return (
                      <section key={`${index}-${segment}`} className="grid gap-3 rounded-lg border border-border-muted bg-[var(--color-raised)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-fg-heading">
                              {index + 1} |
                            </h3>
                            <span className="rounded-full border border-border-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted">
                              {segment.length} chars
                            </span>
                            {isEmpty ? (
                              <span className="rounded-full border border-border-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted">
                                Empty
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => void copySegment(segment, index)}
                            className="rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
                          >
                            {isCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <textarea
                          ref={(element) => {
                            segmentTextRefs.current[index] = element;
                          }}
                          value={segment}
                          onChange={(event) => {
                            updateSegment(index, event.target.value);
                            autosizeTextArea(event.target);
                          }}
                          className="min-h-[84px] w-full overflow-hidden resize-none rounded-md border border-border-muted bg-[var(--color-card)] px-3 py-3 text-sm font-medium leading-6 text-fg-heading outline-none focus:border-fg-heading"
                          spellCheck={false}
                        />
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

