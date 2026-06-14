"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BlogRecentPostsSidebar({
  posts,
  seriesTitle,
}: {
  posts: Array<{ slug: string; title: string; href: string; publishedLabel: string }>;
  seriesTitle: string;
}) {
  const [mobileCollapsed, setMobileCollapsed] = useState(false);

  useEffect(() => {
    function collapseOnScroll() {
      if (window.scrollY > 48) setMobileCollapsed(true);
    }

    window.addEventListener("scroll", collapseOnScroll, { passive: true });
    return () => window.removeEventListener("scroll", collapseOnScroll);
  }, []);

  if (posts.length === 0) return null;

  return (
    <>
      <nav aria-label={`Recent posts in ${seriesTitle}`} className="hidden md:block">
        <p className="blog-sidebar-title">Recent in {seriesTitle}</p>
        <ul className="blog-sidebar-list">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={post.href} className="blog-sidebar-link">
                <span>{post.title}</span>
                <span className="blog-sidebar-date">{post.publishedLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label={`Recent posts in ${seriesTitle}`} className="blog-mobile-panel md:hidden">
        <button
          type="button"
          onClick={() => setMobileCollapsed((value) => !value)}
          className="blog-toc-toggle"
          aria-expanded={!mobileCollapsed}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform"
            style={{ transform: mobileCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>Recent in {seriesTitle}</span>
        </button>
        <div className="blog-mobile-panel-body" data-open={String(!mobileCollapsed)}>
          <div className="blog-mobile-panel-inner">
            <ul className="blog-sidebar-list">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={post.href} className="blog-sidebar-link">
                    <span>{post.title}</span>
                    <span className="blog-sidebar-date">{post.publishedLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
