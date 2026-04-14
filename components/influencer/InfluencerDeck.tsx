"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { submitCabalChat } from "@/app/(site)/cabal/actions";

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatName, setChatName] = useState(initialCommentName);
  const [chatMessage, setChatMessage] = useState("");
  const [chatStatus, setChatStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [chatError, setChatError] = useState("");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const chatPanelRef = useRef<HTMLFormElement | null>(null);
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
    if (!chatOpen || !shouldScrollChatRef.current) return;
    shouldScrollChatRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [chatOpen]);

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
            {tocCollapsed ? (
              <button
                type="button"
                className="influencer-toc-current"
                onClick={() => setTocCollapsed(false)}
              >
                <span className="influencer-toc-number">{activeSlide.tocNumber}</span>
                <span>{activeSlide.title}</span>
              </button>
            ) : (
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
                        onClick={() => goTo(slideIndex)}
                      >
                        <span className="influencer-toc-number">{slide.tocNumber}</span>
                        <span>{slide.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeSlide.content}</ReactMarkdown>
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
                setChatOpen((value) => {
                  if (!value) shouldScrollChatRef.current = true;
                  return !value;
                });
                setChatStatus("idle");
                setChatError("");
              }}
            >
              Comment
            </button>
            <button type="button" onClick={goNext} disabled={activeIndex === slides.length - 1}>
              Next
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
          {chatOpen ? (
            <form ref={chatPanelRef} className="influencer-chat-panel" onSubmit={handleChatSubmit}>
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
              {chatStatus === "sent" ? <p className="influencer-chat-status">Sent.</p> : null}
              {chatStatus === "error" ? <p className="influencer-chat-status is-error">{chatError}</p> : null}
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
