import BlogSubscribeForm from "@/components/blogs/BlogSubscribeForm";
import { getBlogSubscriptionOption, type BlogSubscriptionSlug } from "@/lib/blog-series";

export default function BlogSubscribeCallout({
  defaultSeries,
  title,
  body,
}: {
  defaultSeries: BlogSubscriptionSlug;
  title: string;
  body: string;
}) {
  const subscription = getBlogSubscriptionOption(defaultSeries);

  return (
    <div className="blog-unpublished-card blog-subscribe-callout">
      <p className="blog-unpublished-kicker">{subscription.title}</p>
      <h2 className="blog-unpublished-title">{title}</h2>
      <p className="blog-unpublished-body">{body}</p>
      <BlogSubscribeForm defaultSeries={defaultSeries} />
    </div>
  );
}
