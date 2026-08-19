import "server-only";

import PreferencesLinkEmail from "@/components/emails/PreferencesLinkEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";

export async function sendPreferencesLinkEmail(args: {
  email: string;
  preferencesUrl: string;
}): Promise<void> {
  await sendEmail({
    from: FROM_EMAIL,
    to: args.email,
    subject: "Manage your ZcashNames email preferences",
    react: PreferencesLinkEmail({
      email: args.email,
      preferencesUrl: args.preferencesUrl,
    }),
  });
}
