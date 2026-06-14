import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import { getBlogSeries, type BlogSeriesSlug } from "@/lib/blog-series";

export default function UnpublishedPostFallback({
  series,
  postSlug,
}: {
  series: BlogSeriesSlug;
  postSlug: string;
}) {
  const currentSeries = getBlogSeries(series);

  return (
    <BlogSubscribeCallout
      defaultSeries={series}
      title="This isn't published yet"
      body={`${postSlug} does not have a published entry in ${currentSeries.title} yet. Subscribe below and we'll email you when a new post in this series goes live.`}
    />
  );
}
