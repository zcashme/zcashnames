"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { submitCabalChat, submitCabalInterest } from "@/app/(site)/cabal/actions";

export type InfluencerSlide = {
  id: string;
  title: string;
  content: string;
  headingLevel: number;
  tocNumber: string;
  overviewItems?: Array<{ slideId: string; tocNumber: string; title: string }>;
  locked?: boolean;
};

type InfluencerDeckProps = {
  slides: InfluencerSlide[];
  deckTitle: string;
  initialCommentName?: string;
};

type CabalPanelMode = "comment" | "interest";

type AccordionItem = {
  summary: string;
  body: string;
};

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

const ACCORDION_COLUMN_COUNT = 3;

function hasLanguageClass(className: string | undefined, language: string): boolean {
  return !!className?.split(/\s+/).includes(`language-${language}`);
}

function reactNodeToText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join("");
}

function isAccordionCodeElement(node: ReactNode): node is ReactElement<CodeElementProps> {
  return isValidElement<CodeElementProps>(node) && hasLanguageClass(node.props.className, "accordion");
}

function parseAccordionItems(source: string): AccordionItem[] {
  const items: AccordionItem[] = [];
  let current: { summary: string; bodyLines: string[] } | null = null;

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith(">>")) {
      if (current) current.bodyLines.push(trimmed.replace(/^>>\s?/, "").trim());
      continue;
    }

    if (trimmed.startsWith(">")) {
      if (current?.summary) {
        items.push({ summary: current.summary, body: current.bodyLines.join(" ") });
      }

      current = { summary: trimmed.replace(/^>\s?/, "").trim(), bodyLines: [] };
    }
  }

  if (current?.summary) {
    items.push({ summary: current.summary, body: current.bodyLines.join(" ") });
  }

  return items;
}

function AccordionCodeBlock({ source }: { source: string }) {
  const items = parseAccordionItems(source);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columns = Array.from({ length: ACCORDION_COLUMN_COUNT }, () => [] as Array<AccordionItem & { sourceIndex: number }>);

  if (!items.length) {
    return (
      <pre>
        <code className="language-accordion">{source}</code>
      </pre>
    );
  }

  items.forEach((item, index) => {
    columns[index % ACCORDION_COLUMN_COUNT].push({ ...item, sourceIndex: index });
  });

  return (
    <div className="influencer-accordion">
      {columns.map((column, columnIndex) => (
        <div className="influencer-accordion-column" key={`accordion-column-${columnIndex}`}>
          {column.map((item) => (
            <div
              className="influencer-accordion-item"
              key={`${item.summary}-${item.sourceIndex}`}
              data-open={openIndex === item.sourceIndex}
            >
              <button
                type="button"
                className="influencer-accordion-trigger"
                aria-expanded={openIndex === item.sourceIndex}
                aria-controls={`accordion-panel-${item.sourceIndex}`}
                onClick={(event) => {
                  event.preventDefault();
                  setOpenIndex((current) => (current === item.sourceIndex ? null : item.sourceIndex));
                }}
              >
                {item.summary}
              </button>
              <div
                className="influencer-accordion-panel"
                id={`accordion-panel-${item.sourceIndex}`}
                aria-hidden={openIndex !== item.sourceIndex}
              >
                <div className="influencer-accordion-panel-inner">
                  <p>{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const markdownComponents: Components = {
  pre({ children, node: _node, ...props }) {
    const accordionCode = Children.toArray(children).find(isAccordionCodeElement);

    if (accordionCode) {
      return <AccordionCodeBlock source={reactNodeToText(accordionCode.props.children).replace(/\n$/, "")} />;
    }

    return <pre {...props}>{children}</pre>;
  },
  code({ className, children, node: _node, ...props }) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

export function InfluencerHeaderTitle({ title }: { title: string }) {
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

function shouldShowTocItem(itemNumber: string, activeNumber: string): boolean {
  const [rootNumber] = itemNumber.split(".");
  if (itemNumber === rootNumber) return true;

  return activeNumber === rootNumber || activeNumber.startsWith(`${rootNumber}.`);
}

export default function InfluencerDeck({
  slides,
  deckTitle,
  initialCommentName = "",
}: InfluencerDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [panelMode, setPanelMode] = useState<CabalPanelMode | null>(null);
  const [chatName, setChatName] = useState(initialCommentName);
  const [chatMessage, setChatMessage] = useState("");
  const [interestContact, setInterestContact] = useState("");
  const [interestNote, setInterestNote] = useState("");
  const [chatStatus, setChatStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [chatError, setChatError] = useState("");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const activeTocItemRef = useRef<HTMLLIElement | null>(null);
  const shouldScrollChatRef = useRef(false);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(Math.min(Math.max(index, 0), Math.max(slides.length - 1, 0)));
    },
    [slides.length],
  );

  const goPrevious = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (initialCommentName) {
      setChatName(initialCommentName);
      return;
    }

    const savedName = window.localStorage.getItem("cabal-chat-name");
    if (savedName) setChatName(savedName);
  }, [initialCommentName]);

  useEffect(() => {
    const trimmedName = chatName.trim();
    if (trimmedName) {
      window.localStorage.setItem("cabal-chat-name", trimmedName);
    } else {
      window.localStorage.removeItem("cabal-chat-name");
    }
  }, [chatName]);

  useEffect(() => {
    if (!panelMode || !shouldScrollChatRef.current) return;
    shouldScrollChatRef.current = false;

    const timeout = window.setTimeout(() => {
      chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [panelMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goNext();
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious]);

  useEffect(() => {
    if (tocCollapsed) return;

    const frame = window.requestAnimationFrame(() => {
      activeTocItemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, tocCollapsed]);

  const activeSlide = slides[activeIndex];

  const handleSlideTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleSlideTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = touchStartRef.current;
      const touch = event.changedTouches[0];
      touchStartRef.current = null;
      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;

      if (deltaX < 0) goNext();
      if (deltaX > 0) goPrevious();
    },
    [goNext, goPrevious],
  );

  const handleChatSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activeSlide || !chatMessage.trim()) return;

      setChatStatus("sending");
      setChatError("");

      try {
        const result = await submitCabalChat(
          chatName,
          chatMessage,
          activeSlide.tocNumber,
          activeSlide.title,
          deckTitle,
        );

        if (result.status === "error") throw new Error(result.error || "Message failed to send.");

        setChatMessage("");
        setChatStatus("sent");
      } catch (error) {
        setChatStatus("error");
        setChatError(error instanceof Error ? error.message : "Message failed to send.");
      }
    },
    [activeSlide, chatMessage, chatName, deckTitle],
  );

  const handleInterestSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activeSlide || !interestContact.trim()) return;

      setChatStatus("sending");
      setChatError("");

      try {
        const result = await submitCabalInterest(
          chatName,
          interestContact,
          interestNote,
          activeSlide.tocNumber,
          activeSlide.title,
          deckTitle,
        );

        if (result.status === "error") throw new Error(result.error || "Message failed to send.");

        setInterestContact("");
        setInterestNote("");
        setChatStatus("sent");
      } catch (error) {
        setChatStatus("error");
        setChatError(error instanceof Error ? error.message : "Message failed to send.");
      }
    },
    [activeSlide, chatName, deckTitle, interestContact, interestNote],
  );

  if (!activeSlide) {
    return (
      <main className="influencer-shell">
        <p className="influencer-empty">No influencer slides found.</p>
      </main>
    );
  }

  const visibleTocSlides = slides.filter((slide) =>
    shouldShowTocItem(slide.tocNumber, activeSlide.tocNumber),
  );
  const appendixIndex = slides.findIndex((slide) => slide.title === "Appendix");
  const showJoinHighlight = appendixIndex >= 0 && activeIndex >= appendixIndex;

  return (
    <main className="influencer-shell" aria-label="Influencer proposal slides">
      <InfluencerHeaderTitle title={deckTitle} />
      <div className="influencer-layout">
        <aside className="influencer-toc-wrap">
          <nav className="influencer-toc" aria-label="Slide table of contents">
            <div className="influencer-toc-header">
              <p className="influencer-toc-kicker">Contents</p>
              <button
                type="button"
                className="influencer-toc-toggle"
                aria-label={tocCollapsed ? "Expand contents" : "Collapse contents"}
                aria-expanded={!tocCollapsed}
                onClick={() => setTocCollapsed((value) => !value)}
              >
                {tocCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>
            <div className="influencer-toc-panels">
              <div className="influencer-toc-panel" data-open={tocCollapsed} aria-hidden={!tocCollapsed}>
                <div className="influencer-toc-panel-inner">
                  <button
                    type="button"
                    className="influencer-toc-current"
                    tabIndex={tocCollapsed ? 0 : -1}
                    onClick={() => setTocCollapsed(false)}
                  >
                    <span className="influencer-toc-number">{activeSlide.tocNumber}</span>
                    <span>{activeSlide.title}</span>
                  </button>
                </div>
              </div>
              <div className="influencer-toc-panel" data-open={!tocCollapsed} aria-hidden={tocCollapsed}>
                <div className="influencer-toc-panel-inner">
                  <ol>
                    {visibleTocSlides.map((slide) => {
                      const slideIndex = slides.findIndex((candidate) => candidate.id === slide.id);
                      const active = slideIndex === activeIndex;
                      return (
                        <li key={slide.id} ref={active ? activeTocItemRef : null}>
                          <button
                            type="button"
                            className="influencer-toc-button"
                            data-heading-level={slide.headingLevel}
                            aria-current={active ? "step" : undefined}
                            tabIndex={tocCollapsed ? -1 : 0}
                            onClick={() => goTo(slideIndex)}
                          >
                            <span className="influencer-toc-number">{slide.tocNumber}</span>
                            <span>{slide.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        <section className="influencer-stage" aria-label={activeSlide.title}>
          <div className="influencer-progress-row" aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}>
            <div className="influencer-progress">
              <span style={{ width: `${((activeIndex + 1) / slides.length) * 100}%` }} />
            </div>
            <span className="influencer-progress-count">
              {activeIndex + 1} / {slides.length}
            </span>
          </div>

          <article
            className="influencer-slide"
            onTouchStart={handleSlideTouchStart}
            onTouchEnd={handleSlideTouchEnd}
          >
            {activeSlide.locked ? (
              <div className="influencer-locked">
                <p className="influencer-lock-eyebrow">Password Protected</p>
                <h1 id={`${activeSlide.id}-title`}>Equity</h1>
                <p>This section is locked and is not displayed on the public influencer deck.</p>
              </div>
            ) : activeSlide.overviewItems?.length ? (
              <div className="influencer-overview">
                <h1>{activeSlide.title}</h1>
                <ol>
                  {activeSlide.overviewItems.map((item) => (
                    <li key={item.slideId}>
                      <button
                        type="button"
                        onClick={() => goTo(slides.findIndex((slide) => slide.id === item.slideId))}
                      >
                        <span>{item.tocNumber}</span>
                        <strong>{item.title}</strong>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="influencer-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {activeSlide.content}
                </ReactMarkdown>
              </div>
            )}
          </article>

          <div className="influencer-controls" aria-label="Slide controls">
            <button type="button" onClick={goPrevious} disabled={activeIndex === 0}>
              <span aria-hidden="true">&lt;-</span>
              Previous
            </button>
            <button
              type="button"
              className="influencer-chat-button"
              onClick={() => {
                setPanelMode((value) => {
                  const next = value === "comment" ? null : "comment";
                  if (next) shouldScrollChatRef.current = true;
                  return next;
                });
                setChatStatus("idle");
                setChatError("");
              }}
            >
              Comment
            </button>
            <button
              type="button"
              className={`influencer-chat-button${showJoinHighlight ? " is-highlighted" : ""}`}
              onClick={() => {
                setPanelMode((value) => {
                  const next = value === "interest" ? null : "interest";
                  if (next) shouldScrollChatRef.current = true;
                  return next;
                });
                setChatStatus("idle");
                setChatError("");
              }}
            >
              Join Us
            </button>
            <button type="button" onClick={goNext} disabled={activeIndex === slides.length - 1}>
              Next
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
          <div ref={chatPanelRef} className="influencer-action-panels">
            <div className="influencer-action-panel" data-open={panelMode === "comment"} aria-hidden={panelMode !== "comment"}>
              <div className="influencer-action-panel-inner">
                <form className="influencer-chat-panel" onSubmit={handleChatSubmit}>
                  <fieldset className="influencer-chat-fieldset" disabled={panelMode !== "comment"}>
                    <label>
                      <span>Name</span>
                      <input
                        type="text"
                        value={chatName}
                        onChange={(event) => setChatName(event.target.value)}
                        placeholder="Optional"
                        autoComplete="name"
                      />
                    </label>
                    <label>
                      <span>Question or comment</span>
                      <textarea
                        value={chatMessage}
                        onChange={(event) => {
                          setChatMessage(event.target.value);
                          if (chatStatus !== "sending") setChatStatus("idle");
                        }}
                        placeholder={`About ${activeSlide.tocNumber} ${activeSlide.title}`}
                        rows={4}
                        required
                      />
                    </label>
                    <div className="influencer-chat-footer">
                      <p>
                        References slide {activeSlide.tocNumber}: {activeSlide.title}
                      </p>
                      <button type="submit" disabled={chatStatus === "sending" || !chatMessage.trim()}>
                        {chatStatus === "sending" ? "Sending" : "Send"}
                      </button>
                    </div>
                    {chatStatus === "sent" && panelMode === "comment" ? (
                      <p className="influencer-chat-status">Sent.</p>
                    ) : null}
                    {chatStatus === "error" && panelMode === "comment" ? (
                      <p className="influencer-chat-status is-error">{chatError}</p>
                    ) : null}
                  </fieldset>
                </form>
              </div>
            </div>
            <div className="influencer-action-panel" data-open={panelMode === "interest"} aria-hidden={panelMode !== "interest"}>
              <div className="influencer-action-panel-inner">
                <form className="influencer-chat-panel" onSubmit={handleInterestSubmit}>
                  <fieldset className="influencer-chat-fieldset" disabled={panelMode !== "interest"}>
                    <p className="influencer-chat-intro">
                      Great. We&rsquo;ll set up your personal dashboard so you can track referrals and
                      access the content kit.
                    </p>
                    <label>
                      <span>Name</span>
                      <input
                        type="text"
                        value={chatName}
                        onChange={(event) => setChatName(event.target.value)}
                        placeholder="Optional"
                        autoComplete="name"
                      />
                    </label>
                    <label>
                      <span>Preferred contact</span>
                      <input
                        type="text"
                        value={interestContact}
                        onChange={(event) => {
                          setInterestContact(event.target.value);
                          if (chatStatus !== "sending") setChatStatus("idle");
                        }}
                        placeholder="Email, Telegram, Signal, X, etc."
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label>
                      <span>Optional note</span>
                      <textarea
                        value={interestNote}
                        onChange={(event) => {
                          setInterestNote(event.target.value);
                          if (chatStatus !== "sending") setChatStatus("idle");
                        }}
                        placeholder="Anything we should know before following up?"
                        rows={4}
                      />
                    </label>
                    <div className="influencer-chat-footer">
                      <span aria-hidden="true" />
                      <button type="submit" disabled={chatStatus === "sending" || !interestContact.trim()}>
                        {chatStatus === "sending" ? "Sending" : "Send"}
                      </button>
                    </div>
                    {chatStatus === "sent" && panelMode === "interest" ? (
                      <p className="influencer-chat-status">Got it. We&rsquo;ll follow up directly.</p>
                    ) : null}
                    {chatStatus === "error" && panelMode === "interest" ? (
                      <p className="influencer-chat-status is-error">{chatError}</p>
                    ) : null}
                  </fieldset>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}