import "server-only";

import BlogSubscriberConfirmEmail from "@/components/emails/BlogSubscriberConfirmEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import { getBlogSubscriptionOption, type BlogSubscriptionSlug } from "@/lib/blog-series";

export async function sendBlogSubscriberConfirmationEmail({
  email,
  series,
  confirmUrl,
}: {
  email: string;
  series: BlogSubscriptionSlug;
  confirmUrl: string;
}): Promise<void> {
  const blogSeries = getBlogSubscriptionOption(series);

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: `Confirm your subscription to ${blogSeries.title}`,
    react: BlogSubscriberConfirmEmail({
      seriesTitle: blogSeries.title,
      confirmUrl,
    }),
  });
}
