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
  const subjectTitle =
    series === "general" ? "ZcashNames newsletter" : blogSeries.title;
  const bodyTitle = series === "general" ? "our newsletter" : blogSeries.title;

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
