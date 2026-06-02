# Beta Wallet Partners Internal README

This document explains how beta wallet partner information is organized and where it is used across the site.

## Scope

There are two related but separate partner systems in this repo:

1. Beta wallet partners
   Stored in `lib/wallets/catalog.ts`
   Used by beta flows, wallet comparison UI, and the landing page partner reel.

2. Community page partners
   Stored separately in `lib/community/sections.ts`
   Used by `/community` and mirrored in the CSV files under `docs/`.

These systems are not normalized into one shared source. Updating one does not update the other.

## Source Of Truth For Beta Wallet Partners

The main source of truth is `lib/wallets/catalog.ts`.

It defines:

- `WALLET_BRANDS`
- `WALLET_VARIANTS`
- `WalletBrand`
- `WalletVariant`
- lookup helpers such as `getWalletBrand`, `getWalletVariantsForBrand`, and `getRecommendedVariantForBrand`

### `WALLET_BRANDS`

Each brand entry represents one wallet brand, for example `edge`, `cake`, `zingo`, or `noir`.

Important fields:

- `slug`: stable identifier used in routes like `/beta/[wallet]`
- `displayName`: user-facing name
- `intro`: short copy used on the branded beta application page
- `partner`: whether the brand is treated as a partner brand in beta and landing page UI
- `logos`: wordmark assets for branded pages
- `appIcon`: app icon used by the landing page reel and some beta pages
- `websiteUrl`, `supportGuideUrl`, `announcementUrl`, `liveDiscussionUrl`, `demoUrl`, `downloadUrl`, `socials`

### `WALLET_VARIANTS`

Each variant represents a platform-specific beta target, not just a brand.

Examples:

- `mobile_ios_edge`
- `mobile_android_cake`
- `desktop_pc_zingo`
- `browser_chrome_noir`

Important fields:

- `variantId`: stable variant identifier
- `walletId`: shared wallet identifier across variants
- `brandSlug`: links the variant back to `WALLET_BRANDS`
- `device` and `subcategory`: platform dimensions used by the form and matrix
- `recommended`: default choice for a brand/platform
- `features`: capability matrix for ZNS support
- `warning`: per-variant caveat shown in the beta application form

## Where Beta Partner Data Is Used

### Landing page partner reel

`components/landing/PartnerReel.tsx`

Behavior:

- Reads `WALLET_BRANDS`
- Includes only brands where `partner === true` and `appIcon` exists
- Maps each brand into a small visual item for the homepage
- Adds `cipherscan` manually through `EXTRA_PARTNERS`
- Uses `PARTNER_ORDER` to control display order

Implication:

- Setting `partner: true` alone is not enough for the homepage reel
- The brand also needs an `appIcon`
- Non-wallet partners like Cipherscan are not stored in `WALLET_BRANDS`; they are manually appended

### Branded beta brief page

`app/(site)/beta/[wallet]/page.tsx`
`components/beta/BetaWalletBrief.tsx`

Behavior:

- Route validates the wallet slug with `isWalletBrandSlug`
- Metadata is generated from `getWalletBrand`
- The page renders `BetaWalletBrief` for known brands
- `BetaWalletBrief` loads the brand and all matching variants

Brand fields used here:

- `displayName`
- `partner`
- `appIcon` or `logos`
- `downloadUrl`, `websiteUrl`, `supportGuideUrl`, `announcementUrl`, `liveDiscussionUrl`, `demoUrl`, `socials`

Variant data used here:

- `variantId`
- platform labels
- feature support

Important copy behavior:

- If `brand.partner` is `true`, the brief says ZcashNames is partnering with that wallet
- If `brand.partner` is `false`, the brief says the wallet is included in the beta plan instead

### Branded beta application page

`app/(site)/beta/apply/[wallet]/page.tsx`
`components/beta/BetaApplyPageContent.tsx`
`components/beta/BetaV2ApplicationForm.tsx`

Behavior:

- Route resolves the brand from the URL slug
- Header copy uses `brand.displayName` and `brand.intro`
- The form seeds the first wallet row from `getRecommendedVariantForBrand(brandSlug)`
- The form tags branded entries with `entry_brand_slug`

Variant behavior in the form:

- Device and subcategory selects are populated from catalog helpers
- Wallet choices come from `getWalletVariantsForPlatform`
- Recommended variants become the default selection
- Variant `warning` text is rendered under the selected wallet

### Wallet comparison matrix

`app/(site)/beta/wallets/page.tsx`
`components/wallets/WalletFeatureMatrix.tsx`

Behavior:

- `/beta/wallets` renders `WalletFeatureMatrix` with `WALLET_VARIANTS`
- The table reads each variant's `features`, `displayName`, and `subcategory`

This page is variant-driven, not partner-driven.

### Server-side beta application handling

`lib/beta-v2/actions.ts`

Behavior:

- Parses `planned_wallets_detail`
- Validates `variant_id`, `wallet_id`, `device`, and `subcategory` against catalog helpers
- Persists `planned_wallet`, `other_wallet_*`, and `planned_wallets_detail`
- Includes variant labels in the admin email payload

Important note:

- `entry_brand_slug` is now submitted by the form and persisted when the database schema includes that column
- The server action includes a fallback insert path for older databases that have not yet added `entry_brand_slug`

## Separate Community Partner Data

The community page does not read `WALLET_BRANDS`.

It uses:

- `lib/community/sections.ts`
- `docs/community-page-card-inventory.csv`
- `docs/community-page-card-inventory.updated.csv`

Implications:

- A wallet can be a beta partner without automatically appearing on `/community`
- Icon paths, descriptions, and labels can drift between beta pages and community cards
- Cipherscan appears in both systems, but is modeled differently in each

## Asset Conventions

Wallet brand assets typically live under `public/wallets/`.

Expected wallet brand assets:

- `logo-wordmark-dark.svg`
- `logo-wordmark-light.svg`
- `logo-wordmark-mono.svg`
- optionally `app-icon.png`

Some older or shared icons also live under `public/icons/`.

Current examples:

- Edge uses `/icons/edge.png`
- Unstoppable uses `/wallets/unstoppable/app-icon.png` in beta catalog but `/icons/unstoppable.png` on community cards

## How To Add Or Update A Beta Wallet Partner

1. Add or update the brand entry in `WALLET_BRANDS`.
2. Set `partner: true` if it should be treated as a partner in beta copy and the landing page reel.
3. Add `logos` and `appIcon` assets under `public/wallets/<slug>/` or the appropriate existing path.
4. Add or update one or more `WALLET_VARIANTS` for the supported platforms.
5. Mark the recommended variant with `recommended: true` if branded apply flows should default to it.
6. Fill in optional URLs if the branded brief should expose support guides, announcements, demos, or downloads.
7. If the wallet should appear on `/community`, update `lib/community/sections.ts` separately.
8. If the CSV inventories are being maintained manually, update both CSV files under `docs/`.
9. If the wallet should appear in the homepage reel in a specific position, update `PARTNER_ORDER` in `PartnerReel.tsx`.
10. If the icon looks visually off in the reel, adjust `PARTNER_ICON_LAYOUT_BY_ID` in `PartnerReel.tsx`.

## Common Pitfalls

- `partner: true` without `appIcon` will not show the wallet on the homepage reel.
- Adding a brand without any variants will create a slug-valid brand page with weak or empty beta-specific utility.
- Community partner cards are manual duplicates, so copy and icon changes must be repeated there.
- If the database has not yet applied the `entry_brand_slug` column, branded entry attribution will still be dropped until the schema is updated.
- Reel ordering is not automatic; new partner brands need an explicit `PARTNER_ORDER` decision.

## Recommended Refactor Direction

If this area keeps growing, the cleanest next step is to normalize partner data:

- Keep wallet technical data in `lib/wallets/catalog.ts`
- Derive community wallet cards from the same wallet source where possible
- Move non-wallet partners like Cipherscan into either a small shared partner catalog or a dedicated non-wallet partner source
- Decide whether `entry_brand_slug` should remain nullable long-term or become a first-class reporting field
