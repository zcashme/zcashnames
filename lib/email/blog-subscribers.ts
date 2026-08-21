import "server-only";

import BlogSubscriberConfirmEmail from "@/components/emails/BlogSubscriberConfirmEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import { getBlogSubscriptionOption, type BlogSubscriptionSlug } from "@/lib/blog-series";

function formatSeriesTitles(seriesList: readonly BlogSubscriptionSlug[]): string {
  const titles = seriesList.map((series) =>
    series === "general" ? "our newsletter" : getBlogSubscriptionOption(series).title,
  );
  if (titles.length === 0) return "Zcash Names email";
  if (titles.length === 1) return titles[0]!;
  if (titles.length === 2) return `${titles[0]} and ${titles[1]}`;
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

export async function sendBlogSubscriberConfirmationEmail({
  email,
  series,
  confirmUrl,
}: {
  email: string;
  series: BlogSubscriptionSlug | readonly BlogSubscriptionSlug[];
  confirmUrl: string;
}): Promise<void> {
  const seriesList = (Array.isArray(series) ? series : [series]) as BlogSubscriptionSlug[];
  const bodyTitle = formatSeriesTitles(seriesList);
  const subjectTitle =
    seriesList.length === 1 && seriesList[0] === "general" ? "Zcash Names newsletter" : bodyTitle;

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: `Confirm your subscription to ${subjectTitle}`,
    react: BlogSubscriberConfirmEmail({
      seriesTitle: bodyTitle,
      confirmUrl,
    }),
  });
}
