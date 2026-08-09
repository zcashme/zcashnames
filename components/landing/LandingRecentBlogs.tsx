"use client";

import Link from "next/link";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";

/** Client-safe shape for homepage blog tiles (filled server-side). */
export type LandingBlogPostCard = {
  slug: string;
  title: string;
  href: string;
  seriesLabel: string;
  publishedLabel: string;
  excerpt?: string;
};

export default function LandingRecentBlogs({
  posts,
}: {
  posts: LandingBlogPostCard[];
}) {
  const proximity = usePointerProximity<HTMLAnchorElement>({
    radius: 180,
    maxScaleBoost: 0.03,
    maxShadowOpacity: 0.18,
  });

  if (posts.length === 0) return null;

  return (
    <section
      id="blog"
      className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-0 sm:px-6 sm:pb-20"
      aria-labelledby="landing-blog-heading"
    >
      <div className="mb-8 flex justify-center sm:mb-10">
        <SectionHeaderPill id="landing-blog-heading" title="Blog" />
      </div>

      <ul
        className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
        onPointerMove={proximity.handlePointerMove}
        onPointerLeave={proximity.handlePointerLeave}
      >
        {posts.map((post) => (
          <li key={post.href} className="min-w-0">
            <Link
              href={post.href}
              ref={(node) => proximity.register(post.href, node)}
              className="group relative flex h-full min-h-[11rem] flex-col overflow-hidden rounded-2xl p-5 no-underline"
              style={{
                border: "1px solid color-mix(in srgb, var(--fg-heading) 8%, var(--faq-border))",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 38%, transparent), transparent)",
                transform: "translateZ(0) scale(var(--prox-scale, 1))",
                boxShadow: "0 18px 38px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--feature-heading-line-to) 36%, transparent), transparent 48%)",
                }}
                aria-hidden="true"
              />
              <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
                <p
                  className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.16em]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {post.seriesLabel}
                </p>
                <h3
                  className="type-section-subtitle mt-2 line-clamp-2 font-semibold leading-snug"
                  style={{ color: "var(--fg-heading)" }}
                >
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p
                    className="mt-2 line-clamp-2 text-sm leading-relaxed"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {post.excerpt}
                  </p>
                ) : null}
                <time
                  className="mt-auto pt-4 text-xs"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {post.publishedLabel}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-end">
        <Link
          href="/blogs"
          className="text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--color-accent-interactive, var(--fg-heading))" }}
          aria-label="See more blog posts"
        >
          See more →
        </Link>
      </div>
    </section>
  );
}
