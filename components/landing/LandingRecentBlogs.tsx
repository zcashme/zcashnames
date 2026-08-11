import Link from "next/link";
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
  if (posts.length === 0) return null;

  return (
    <section
      id="blog"
      className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-0 sm:px-6 sm:pb-20"
      aria-labelledby="landing-blog-heading"
    >
      <div className="mb-6 text-center">
        <SectionHeaderPill id="landing-blog-heading" title="Blog" />
      </div>

      <ul className="m-0 grid list-none grid-cols-1 gap-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post, index) => {
          // Same minimal rule as Features: vertical between peers, bottom only when a lower row exists.
          const count = posts.length;
          const mobileBottom = index < count - 1;
          const smRow = Math.floor(index / 2);
          const smMaxRow = Math.floor((count - 1) / 2);
          const smBottom = smRow < smMaxRow;
          const smRight = index % 2 === 0 && index + 1 < count;
          const lgRow = Math.floor(index / 4);
          const lgMaxRow = Math.floor((count - 1) / 4);
          const lgBottom = lgRow < lgMaxRow;
          const lgRight = index % 4 !== 3 && index + 1 < count;

          return (
            <li
              key={post.href}
              className={[
                "min-w-0",
                mobileBottom ? "border-b border-border-muted" : "border-b-0",
                smBottom ? "sm:border-b sm:border-border-muted" : "sm:border-b-0",
                smRight ? "sm:border-r sm:border-border-muted" : "sm:border-r-0",
                lgBottom ? "lg:border-b lg:border-border-muted" : "lg:border-b-0",
                lgRight ? "lg:border-r lg:border-border-muted" : "lg:border-r-0",
              ].join(" ")}
            >
              <Link
                href={post.href}
                className="group relative flex h-full min-h-[11rem] flex-col overflow-hidden p-5 no-underline"
                style={{
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 38%, transparent), transparent)",
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
                  <h3 className="type-section-subtitle mt-2 line-clamp-2 font-semibold leading-snug text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover:text-[var(--color-accent-interactive,var(--fg-heading))]">
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
          );
        })}
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
