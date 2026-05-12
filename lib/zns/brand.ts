//
// Single source of truth for brand metadata. Used by:
//   - Root layout (metadata, JSON-LD, social links)
//   - OpenGraph image generators (app/og/*.png/)
//   - Footer (social icon links)
//   - Referral URL builder (lib/referral-code.ts)
//
export const BRAND = {
  name: "ZcashNames",
  title: "ZcashNames",
  description: "Personal names for shielded addresses.",
  url: "https://www.zcashnames.com",
  logoPath: "/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png",
  logo: "https://www.zcashnames.com/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png",
  previewImage: "https://www.zcashnames.com/opengraph-image",
  twitter: "@zcashnames",
  socials: [
    { label: "X / Twitter", href: "https://x.com/zcashnames" },
    { label: "Discord", href: "https://discord.gg/z2H23QgAGf" },
    { label: "Telegram", href: "https://t.me/zcashnames" },
    {
      label: "Signal",
      href: "https://signal.group/#CjQKIKDM76KMttnFqmbtbKzcfDrGeLtR6wWQq82YM8LWdyNhEhBGKNSZVjTREwDLqhatYhLH",
    },
  ],
};

export const COMMUNITIES = BRAND.socials;
