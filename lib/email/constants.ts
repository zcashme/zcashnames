// Shared email identity and social link constants.
// FROM_EMAIL is the sender for all transactional emails;
// TO_EMAIL is the internal notification recipient (partner@zcash.me).
import type { SocialIconKey } from "@/lib/social-icons";

export const FROM_EMAIL = "zechariah@updates.zcashnames.com";
export const TO_EMAIL = "partner@zcash.me";

const EMAIL_ICON_BASE = "https://www.zcashnames.com/icons/email-footer";

export const SOCIALS = [
  {
    href: "https://x.com/zcashnames",
    iconKey: "x",
    alt: "X / Twitter",
    iconSrc: `${EMAIL_ICON_BASE}/x.png`,
  },
  {
    href: "https://discord.gg/z2H23QgAGf",
    iconKey: "discord",
    alt: "Discord",
    iconSrc: `${EMAIL_ICON_BASE}/discord.png`,
  },
  {
    href: "https://signal.group/#CjQKIKDM76KMttnFqmbtbKzcfDrGeLtR6wWQq82YM8LWdyNhEhBGKNSZVjTREwDLqhatYhLH",
    iconKey: "signal",
    alt: "Signal",
    iconSrc: `${EMAIL_ICON_BASE}/signal.png`,
  },
  {
    href: "https://t.me/zcashnames",
    iconKey: "telegram",
    alt: "Telegram",
    iconSrc: `${EMAIL_ICON_BASE}/telegram.png`,
  },
] as const satisfies ReadonlyArray<{
  href: string;
  iconKey: SocialIconKey;
  alt: string;
  iconSrc: string;
}>;
