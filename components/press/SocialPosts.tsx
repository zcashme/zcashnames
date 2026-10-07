"use client";

import { Fragment, useState } from "react";
import { PODCAST_SIGNALS, SOCIAL_SIGNALS, type SocialSignal, type XPostCardData } from "@/lib/press/social-posts";

const PAGE_SIZE = 4;

function avatarSrc(src: string) {
  return `/api/press/x-image?src=${encodeURIComponent(src)}`;
}

const X_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function XVerifiedBadge({ org }: { org?: boolean }) {
  return (
    <svg viewBox="0 0 22 22" className="h-[18px] w-[18px] shrink-0" aria-label={org ? "Verified organization" : "Verified"}>
      <path
        fill={org ? "#E2B203" : "#1D9BF0"}
        d="M20.396 11c-.018-.646-.215-1.084-.57-1.616-.354-.532-.802-.972-1.347-1.32.054-.308.09-.618.09-.93 0-1.385-.56-2.635-1.465-3.54s-2.155-1.465-3.54-1.465c-.312 0-.622.036-.93.09-.348-.545-.788-.993-1.32-1.347C12.084 1.815 11.646 1.618 11 1.6 10.354 1.618 9.916 1.815 9.384 2.17c-.532.354-.972.802-1.32 1.347-.308-.054-.618-.09-.93-.09-1.385 0-2.635.56-3.54 1.465S1.6 6.685 1.6 8.07c0 .312.036.622.09.93-.545.348-.993.788-1.347 1.32C.018 10.084-.18 10.522-.198 11c.018.646.215 1.084.57 1.616.354.532.802.972 1.347 1.32-.054.308-.09.618-.09.93 0 1.385.56 2.635 1.465 3.54s2.155 1.465 3.54 1.465c.312 0 .622-.036.93-.09.348.545.788.993 1.32 1.347.532.355.97.552 1.616.57.646-.018 1.084-.215 1.616-.57.532-.354.972-.802 1.32-1.347.308.054.618.09.93.09 1.385 0 2.635-.56 3.54-1.465s1.465-2.155 1.465-3.54c0-.312-.036-.622-.09-.93.545-.348.993-.788 1.347-1.32.355-.532.552-.97.57-1.616zm-11.734 3.85-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.238z"
      />
    </svg>
  );
}

function formatXText(text: string) {
  const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:\.?[A-Za-z][\w]*\.(?:zcash|zec)\b)|(?:@[A-Za-z0-9_]+)|(?:\$[A-Za-z]+))/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("http") || part.startsWith("@") || part.startsWith("$") || part.endsWith(".zcash") || part.endsWith(".zec")) {
      const label = part.startsWith("http") ? part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : part;
      return (
        <span key={index} className="text-[#1D9BF0]">
          {label}
        </span>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function XAvatar({ src, size }: { src: string; size: number }) {
  return (
    <img
      src={avatarSrc(src)}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-[#CFD9DE] object-cover"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

function XPostCard({ post }: { post: XPostCardData }) {
  const hasQuote = Boolean(post.quoted);
  const bodyClamp = hasQuote || post.replyToHandle ? "line-clamp-2" : "line-clamp-5";

  return (
    <article
      className="flex h-[200px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#EFF3F4] bg-white p-3 text-left font-normal"
      style={{ fontFamily: X_FONT }}
    >
      <div className="flex shrink-0 gap-2">
        <XAvatar src={post.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-0.5">
            <span className="truncate text-[15px] font-bold leading-5 text-[#0F1419]">{post.name}</span>
            {(post.verified || post.orgVerified) && <XVerifiedBadge org={post.orgVerified} />}
          </div>
          <div className="truncate text-[15px] leading-5 text-[#536471]">@{post.handle}</div>
        </div>
        <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 fill-[#0F1419]" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      {post.replyToHandle ? (
        <p className="mt-1 shrink-0 text-[13px] leading-4 text-[#536471]">
          Replying to <span className="text-[#1D9BF0]">@{post.replyToHandle}</span>
        </p>
      ) : null}
      <p className={`mt-1 min-w-0 overflow-hidden break-words whitespace-pre-wrap text-[15px] leading-5 text-[#0F1419] ${bodyClamp}`}>
        {formatXText(post.text)}
      </p>
      {post.quoted ? (
        <div className="mt-2 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[#EFF3F4] px-2.5 py-2">
          <div className="flex min-w-0 gap-1.5">
            <XAvatar src={post.quoted.avatarUrl} size={20} />
            <div className="min-w-0">
              <div className="flex items-center gap-0.5">
                <span className="truncate text-[13px] font-bold leading-4 text-[#0F1419]">{post.quoted.name}</span>
                {(post.quoted.verified || post.quoted.orgVerified) && <XVerifiedBadge org={post.quoted.orgVerified} />}
                <span className="truncate text-[13px] leading-4 text-[#536471]">@{post.quoted.handle}</span>
              </div>
              <p className="line-clamp-2 min-w-0 overflow-hidden break-words whitespace-pre-wrap text-[13px] leading-4 text-[#0F1419]">
                {formatXText(post.quoted.text)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <time className="mt-auto pt-1 text-[13px] leading-4 text-[#536471]">{post.createdAt}</time>
    </article>
  );
}

function PostGrid({ signals }: { signals: readonly SocialSignal[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2">
      {signals.map((signal) => (
        <div key={signal.where} className="min-w-0">
          <a href={signal.where} target="_blank" rel="noopener noreferrer" className="block min-w-0">
            <XPostCard post={signal.post} />
          </a>
          <div className="mt-3 flex items-start justify-between gap-3">
            <a
              href={signal.profile}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-start gap-1.5 text-left text-sm font-normal leading-snug underline-offset-2 hover:underline"
              style={{ color: "var(--fg-heading)" }}
            >
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--fg-muted)" }}>
                <path d="M8.5 7.5V5.8c0-.9.7-1.6 1.6-1.6h3.8c.9 0 1.6.7 1.6 1.6v1.7" />
                <rect x="3.5" y="7.5" width="17" height="13" rx="2" />
                <path d="M3.5 12h17" />
              </svg>
              <span>{signal.title}</span>
            </a>
            <p className="flex shrink-0 items-center gap-1 text-sm font-normal tabular-nums" style={{ color: "var(--fg-heading)" }} aria-label={`${signal.followers} followers`}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: "var(--fg-muted)" }}>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3m-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5" />
              </svg>
              <span>{signal.followers}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SocialPosts() {
  const [count, setCount] = useState(PAGE_SIZE);
  const shown = SOCIAL_SIGNALS.slice(0, count);
  const canMore = count < SOCIAL_SIGNALS.length;
  const canLess = count > PAGE_SIZE;

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
        X
      </h3>
      <PostGrid signals={shown} />
      {canMore || canLess ? (
        <div className="mt-4 flex gap-4">
          {canMore ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold underline decoration-from-font underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--color-accent-interactive)" }}
              onClick={() => setCount((current) => Math.min(SOCIAL_SIGNALS.length, current + PAGE_SIZE))}
            >
              More posts
            </button>
          ) : null}
          {canLess ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold underline decoration-from-font underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--color-accent-interactive)" }}
              onClick={() => setCount(PAGE_SIZE)}
            >
              Less
            </button>
          ) : null}
        </div>
      ) : null}
      <h3 className="mb-4 mt-10 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
        Podcasts
      </h3>
      <PostGrid signals={PODCAST_SIGNALS} />
    </div>
  );
}
