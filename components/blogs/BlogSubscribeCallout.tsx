import BlogSubscribeForm from "@/components/blogs/BlogSubscribeForm";
import type { BlogSubscriptionSlug } from "@/lib/blog-series";

export default function BlogSubscribeCallout({
  defaultSeries,
  body: _body,
  title: _title,
}: {
  defaultSeries: BlogSubscriptionSlug;
  /** @deprecated Body is generated from selected series. */
  body?: string;
  /** @deprecated Unused — no title/eyebrow in subscribe area. */
  title?: string;
}) {
  return (
    <section className="blog-subscribe-callout" aria-label="Subscribe">
      <BlogSubscribeForm defaultSeries={defaultSeries} />
    </section>
  );
}
