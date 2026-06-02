export type WalletDevice = "mobile" | "desktop" | "browser";
export type WalletDeviceChoice = WalletDevice | "not_sure";
export type WalletSubcategory = "ios" | "android" | "mac" | "pc" | "linux" | "chrome";
export type WalletChoice = WalletVariantId | "not_sure";

export type WalletVariantId =
  | "mobile_ios_edge"
  | "mobile_android_edge"
  | "mobile_ios_cake"
  | "mobile_android_cake"
  | "mobile_ios_unstoppable"
  | "mobile_android_unstoppable"
  | "mobile_ios_zipher"
  | "mobile_ios_zingo"
  | "mobile_android_zingo"
  | "mobile_ios_zkool"
  | "mobile_android_zkool"
  | "mobile_ios_zodl"
  | "mobile_android_zodl"
  | "desktop_mac_vizor"
  | "desktop_pc_zingo"
  | "browser_chrome_noir"
  | "browser_chrome_brave";

export type WalletId =
  | "desktop_zingo"
  | "desktop_vizor"
  | "mobile_zingo"
  | "mobile_zkool"
  | "mobile_unstoppable"
  | "mobile_zodl"
  | "mobile_edge"
  | "mobile_cake"
  | "mobile_zipher"
  | "browser_brave"
  | "browser_noir";

export type WalletBrandSlug =
  | "edge"
  | "cake"
  | "unstoppable"
  | "zipher"
  | "zingo"
  | "zkool"
  | "zodl"
  | "vizor"
  | "noir"
  | "brave";

export type WalletBrandLogoAssets = {
  default: string;
  light?: string;
  dark?: string;
  mono?: string;
  alt: string;
};

export type WalletBrandAppIcon = {
  src: string;
  alt: string;
};

export type WalletBrandSocial = {
  label: string;
  href: string;
};

export type WalletBrandDownloadBadge = {
  alt: string;
  href: string;
  label: string;
  src: string;
};

export type WalletFeatures = {
  resolveName: boolean;
  reverseLookup: boolean;
  viewCollection: boolean;
  nameActions: {
    list: boolean;
    claim: boolean;
    delist: boolean;
    release: boolean;
    buy: boolean;
  };
  importContact: boolean;
  exportContact: boolean;
  viewProfile: boolean;
  viewExplorer: boolean;
  scanURI: boolean;
  tapURI: boolean;
  pasteURI: boolean;
  uploadQR: boolean;
  rotateTaddr: boolean;
  rotateUaddr: boolean;
  receiveTaddr: boolean;
  receiveUaddr: boolean;
};

export type WalletVariant = {
  variantId: WalletVariantId;
  walletId: WalletId;
  brandSlug: WalletBrandSlug;
  brandName: string;
  displayName: string;
  device: WalletDevice;
  subcategory: WalletSubcategory;
  recommended: boolean;
  sortOrder: number;
  features: WalletFeatures;
  warning?: string;
};

export type WalletBrand = {
  slug: WalletBrandSlug;
  brandName: string;
  displayName: string;
  intro: string;
  partner: boolean;
  logos?: WalletBrandLogoAssets;
  appIcon?: WalletBrandAppIcon;
  websiteUrl?: string;
  supportGuideUrl?: string;
  announcementUrl?: string;
  liveDiscussionUrl?: string;
  demoUrl?: string;
  githubUrl?: string;
  discordUrl?: string;
  linkedinUrl?: string;
  telegramUrl?: string;
  youtubeUrl?: string;
  xUrl?: string;
  emailAddr?: string;
  downloadUrl?: string;
  downloadBadges?: readonly WalletBrandDownloadBadge[];
  socials?: readonly WalletBrandSocial[];
};

const allNameActions = {
  list: true,
  claim: true,
  delist: true,
  release: true,
  buy: true,
} satisfies WalletFeatures["nameActions"];

const noNameActions = {
  list: false,
  claim: false,
  delist: false,
  release: false,
  buy: false,
} satisfies WalletFeatures["nameActions"];

const baseWalletFeatures: WalletFeatures = {
  resolveName: false,
  reverseLookup: false,
  viewCollection: false,
  nameActions: noNameActions,
  importContact: false,
  exportContact: false,
  viewProfile: false,
  viewExplorer: false,
  scanURI: false,
  tapURI: false,
  pasteURI: false,
  uploadQR: false,
  rotateTaddr: false,
  rotateUaddr: false,
  receiveTaddr: false,
  receiveUaddr: false,
};

const fullWalletFeatures: WalletFeatures = {
  resolveName: true,
  reverseLookup: true,
  viewCollection: true,
  nameActions: allNameActions,
  importContact: true,
  exportContact: true,
  viewProfile: true,
  viewExplorer: true,
  scanURI: true,
  tapURI: true,
  pasteURI: true,
  uploadQR: true,
  rotateTaddr: true,
  rotateUaddr: true,
  receiveTaddr: true,
  receiveUaddr: true,
};

const controlOnlyFeatures: WalletFeatures = {
  ...baseWalletFeatures,
  viewCollection: true,
  nameActions: allNameActions,
  viewProfile: true,
  viewExplorer: true,
};

const receiveOnlyMobileFeatures: WalletFeatures = {
  ...baseWalletFeatures,
  importContact: true,
  exportContact: true,
  scanURI: true,
  tapURI: true,
  pasteURI: true,
  uploadQR: true,
  receiveTaddr: true,
  receiveUaddr: true,
};

const browserResolverFeatures: WalletFeatures = {
  ...baseWalletFeatures,
  resolveName: true,
  reverseLookup: true,
  viewCollection: true,
  nameActions: allNameActions,
  viewProfile: true,
  viewExplorer: true,
  pasteURI: true,
};

function walletLogos(slug: WalletBrandSlug, alt: string): WalletBrandLogoAssets {
  const base = `/wallets/${slug}`;
  return {
    default: `${base}/logo-wordmark-dark.svg`,
    light: `${base}/logo-wordmark-light.svg`,
    dark: `${base}/logo-wordmark-dark.svg`,
    mono: `${base}/logo-wordmark-mono.svg`,
    alt,
  };
}

function downloadBadge(
  label: string,
  src: string,
  href: string,
  alt = label,
): WalletBrandDownloadBadge {
  return { alt, href, label, src };
}

export const WALLET_BRANDS: readonly WalletBrand[] = [
  {
    slug: "edge",
    brandName: "Edge",
    displayName: "Edge Wallet",
    intro: "",
    partner: true,
    logos: walletLogos("edge", "Edge Wallet logo"),
    appIcon: { src: "/icons/edge.png", alt: "Edge Wallet app icon" },
    websiteUrl: "https://edge.app/",
    supportGuideUrl: "https://support.edge.app/en/articles/14900026-how-to-send-to-a-zcash-name",
    linkedinUrl: "https://www.linkedin.com/company/edgeapp/jobs/",
    youtubeUrl: "https://www.youtube.com/c/Edgewallet",
    xUrl: "https://x.com/EdgeWallet",
    downloadBadges: [
      downloadBadge(
        "Google Play",
        "https://dl.edge.app/assets/get-it-on-google-play.webp",
        "https://play.google.com/store/apps/details?id=co.edgesecure.app",
        "Get Edge Wallet on Google Play",
      ),
      downloadBadge(
        "App Store",
        "https://dl.edge.app/assets/download-on-the-app-store.webp",
        "https://itunes.apple.com/us/app/edge-bitcoin-wallet/id1344400091",
        "Download Edge Wallet on the App Store",
      ),
      downloadBadge(
        "Direct APK",
        "https://dl.edge.app/assets/android-direct-download-apk.webp",
        "https://apk.edge.app/?af=edge-app",
        "Download Edge Wallet APK directly",
      ),
    ],
  },
  {
    slug: "cake",
    brandName: "Cake",
    displayName: "Cake Wallet",
    intro: "Test ZcashNames from a mobile wallet context and compare contact, URI, and receive flows.",
    partner: true,
    logos: walletLogos("cake", "Cake Wallet logo"),
    appIcon: { src: "/wallets/cake/app-icon.png", alt: "Cake Wallet app icon" },
  },
  {
    slug: "unstoppable",
    brandName: "Unstoppable",
    displayName: "Unstoppable Wallet",
    intro: "Test ZcashNames from a mobile wallet context and compare contact, URI, and receive flows.",
    partner: true,
    logos: walletLogos("unstoppable", "Unstoppable Wallet logo"),
    appIcon: { src: "/wallets/unstoppable/app-icon.png", alt: "Unstoppable Wallet app icon" },
    websiteUrl: "https://unstoppable.money/",
    supportGuideUrl: "https://unstoppable.money/faq",
    telegramUrl: "https://t.me/unstoppable_announcements",
    xUrl: "https://x.com/unstoppablebyhs",
    emailAddr: "hello@horizontalsystems.io",
  },
  {
    slug: "zipher",
    brandName: "Zipher",
    displayName: "Zipher",
    intro: "Test ZcashNames from an iOS wallet context and compare contact, URI, and receive flows.",
    partner: true,
    logos: walletLogos("zipher", "Zipher logo"),
    appIcon: { src: "/wallets/zipher/app-icon.png", alt: "Zipher app icon" },
  },
  {
    slug: "zingo",
    brandName: "Zingo",
    displayName: "Zingo!",
    intro: "Test ZcashNames wallet-side name control and desktop or mobile behavior.",
    partner: true,
    logos: walletLogos("zingo", "Zingo logo"),
    appIcon: { src: "/wallets/zingo/app-icon.png", alt: "Zingo app icon" },
    websiteUrl: "https://zingolabs.org/",
    supportGuideUrl: "https://zingolabs.org/support/",
    announcementUrl: "https://x.com/ZingoLabs/status/2056422696049607101?s=20",
    githubUrl: "https://github.com/zingolabs",
    discordUrl: "https://zingolabs.org/zingo/#",
    telegramUrl: "https://t.me/zingolabs/",
    xUrl: "https://zingolabs.org/zingo/#",
  },
  {
    slug: "zkool",
    brandName: "Zkool",
    displayName: "Zkool",
    intro: "Test ZcashNames mobile name control and collection behavior.",
    partner: false,
    logos: walletLogos("zkool", "Zkool logo"),
  },
  {
    slug: "zodl",
    brandName: "Zodl",
    displayName: "Zodl",
    intro: "Test ZcashNames mobile name control and collection behavior.",
    partner: false,
    logos: walletLogos("zodl", "Zodl logo"),
  },
  {
    slug: "vizor",
    brandName: "Vizor",
    displayName: "Vizor",
    intro: "Test ZcashNames desktop name control and collection behavior on Mac.",
    partner: false,
    logos: walletLogos("vizor", "Vizor logo"),
  },
  {
    slug: "noir",
    brandName: "Noir",
    displayName: "Noir",
    intro: "Test ZcashNames from a browser wallet context and compare extension-based resolution behavior.",
    partner: true,
    logos: walletLogos("noir", "Noir logo"),
    appIcon: { src: "/wallets/noir/app-icon.png", alt: "Noir app icon" },
    websiteUrl: "https://www.zknoir.com/",
    xUrl: "https://x.com/noir_wallet",
  },
  {
    slug: "brave",
    brandName: "Brave",
    displayName: "Brave",
    intro: "Test ZcashNames from a browser wallet context and compare extension-based control behavior.",
    partner: false,
    logos: walletLogos("brave", "Brave logo"),
  },
] as const;

export const SUBCATEGORY_OPTIONS: Record<WalletDevice, { label: string; value: WalletSubcategory }[]> = {
  mobile: [
    { label: "iOS", value: "ios" },
    { label: "Android", value: "android" },
  ],
  desktop: [
    { label: "Mac", value: "mac" },
    { label: "PC", value: "pc" },
    { label: "Linux", value: "linux" },
  ],
  browser: [{ label: "Chrome", value: "chrome" }],
};

export const WALLET_VARIANTS: readonly WalletVariant[] = [
  {
    variantId: "mobile_ios_edge",
    walletId: "mobile_edge",
    brandSlug: "edge",
    brandName: "Edge",
    displayName: "Edge Wallet",
    device: "mobile",
    subcategory: "ios",
    recommended: true,
    sortOrder: 10,
    features: {
      ...baseWalletFeatures,
      resolveName: true,
      viewProfile: true,
      viewExplorer: true,
      scanURI: true,
      pasteURI: true,
      uploadQR: true,
      receiveTaddr: true,
      receiveUaddr: true,
    },
  },
  {
    variantId: "mobile_android_edge",
    walletId: "mobile_edge",
    brandSlug: "edge",
    brandName: "Edge",
    displayName: "Edge Wallet",
    device: "mobile",
    subcategory: "android",
    recommended: true,
    sortOrder: 11,
    features: {
      ...baseWalletFeatures,
      resolveName: true,
      viewProfile: true,
      viewExplorer: true,
      scanURI: true,
      pasteURI: true,
      uploadQR: true,
      receiveTaddr: true,
      receiveUaddr: true,
    },
  },
  {
    variantId: "mobile_ios_cake",
    walletId: "mobile_cake",
    brandSlug: "cake",
    brandName: "Cake",
    displayName: "Cake Wallet",
    device: "mobile",
    subcategory: "ios",
    recommended: false,
    sortOrder: 20,
    features: receiveOnlyMobileFeatures,
  },
  {
    variantId: "mobile_android_cake",
    walletId: "mobile_cake",
    brandSlug: "cake",
    brandName: "Cake",
    displayName: "Cake Wallet",
    device: "mobile",
    subcategory: "android",
    recommended: false,
    sortOrder: 21,
    features: receiveOnlyMobileFeatures,
  },
  {
    variantId: "mobile_ios_unstoppable",
    walletId: "mobile_unstoppable",
    brandSlug: "unstoppable",
    brandName: "Unstoppable",
    displayName: "Unstoppable",
    device: "mobile",
    subcategory: "ios",
    recommended: false,
    sortOrder: 30,
    features: {
      ...baseWalletFeatures,
      resolveName: true,
      importContact: true,
      exportContact: true,
      scanURI: true,
      pasteURI: true,
      uploadQR: true,
      receiveTaddr: true,
      receiveUaddr: true,
    },
  },
  {
    variantId: "mobile_android_unstoppable",
    walletId: "mobile_unstoppable",
    brandSlug: "unstoppable",
    brandName: "Unstoppable",
    displayName: "Unstoppable",
    device: "mobile",
    subcategory: "android",
    recommended: false,
    sortOrder: 31,
    features: {
      ...baseWalletFeatures,
      resolveName: true,
      importContact: true,
      exportContact: true,
      scanURI: true,
      pasteURI: true,
      uploadQR: true,
      receiveTaddr: true,
      receiveUaddr: true,
    },
  },
  {
    variantId: "mobile_ios_zipher",
    walletId: "mobile_zipher",
    brandSlug: "zipher",
    brandName: "Zipher",
    displayName: "Zipher",
    device: "mobile",
    subcategory: "ios",
    recommended: false,
    sortOrder: 40,
    features: receiveOnlyMobileFeatures,
  },
  {
    variantId: "mobile_ios_zingo",
    walletId: "mobile_zingo",
    brandSlug: "zingo",
    brandName: "Zingo",
    displayName: "Zingo",
    device: "mobile",
    subcategory: "ios",
    recommended: false,
    sortOrder: 50,
    features: baseWalletFeatures,
    warning: "Mobile wallet Zingo cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc) via ZcashNames.com.",
  },
  {
    variantId: "mobile_android_zingo",
    walletId: "mobile_zingo",
    brandSlug: "zingo",
    brandName: "Zingo",
    displayName: "Zingo",
    device: "mobile",
    subcategory: "android",
    recommended: false,
    sortOrder: 51,
    features: baseWalletFeatures,
    warning: "Mobile wallet Zingo cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc) via ZcashNames.com.",
  },
  {
    variantId: "mobile_ios_zkool",
    walletId: "mobile_zkool",
    brandSlug: "zkool",
    brandName: "Zkool",
    displayName: "Zkool",
    device: "mobile",
    subcategory: "ios",
    recommended: false,
    sortOrder: 60,
    features: controlOnlyFeatures,
    warning: "Mobile wallet Zkool cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc).",
  },
  {
    variantId: "mobile_android_zkool",
    walletId: "mobile_zkool",
    brandSlug: "zkool",
    brandName: "Zkool",
    displayName: "Zkool",
    device: "mobile",
    subcategory: "android",
    recommended: false,
    sortOrder: 61,
    features: controlOnlyFeatures,
    warning: "Mobile wallet Zkool cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc).",
  },
  {
    variantId: "mobile_ios_zodl",
    walletId: "mobile_zodl",
    brandSlug: "zodl",
    brandName: "Zodl",
    displayName: "Zodl",
    device: "mobile",
    subcategory: "ios",
    recommended: false,
    sortOrder: 70,
    features: controlOnlyFeatures,
    warning: "Mobile wallet Zodl cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc).",
  },
  {
    variantId: "mobile_android_zodl",
    walletId: "mobile_zodl",
    brandSlug: "zodl",
    brandName: "Zodl",
    displayName: "Zodl",
    device: "mobile",
    subcategory: "android",
    recommended: false,
    sortOrder: 71,
    features: controlOnlyFeatures,
    warning: "Mobile wallet Zodl cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc).",
  },
  {
    variantId: "desktop_mac_vizor",
    walletId: "desktop_vizor",
    brandSlug: "vizor",
    brandName: "Vizor",
    displayName: "Vizor",
    device: "desktop",
    subcategory: "mac",
    recommended: false,
    sortOrder: 80,
    features: controlOnlyFeatures,
    warning: "Desktop wallet Vizor cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc).",
  },
  {
    variantId: "desktop_pc_zingo",
    walletId: "desktop_zingo",
    brandSlug: "zingo",
    brandName: "Zingo",
    displayName: "Zingo!",
    device: "desktop",
    subcategory: "pc",
    recommended: true,
    sortOrder: 90,
    features: {
      ...baseWalletFeatures,
      resolveName: true,
      reverseLookup: true,
      viewCollection: true,
      importContact: true,
      exportContact: true,
      viewProfile: true,
      viewExplorer: true,
      tapURI: true,
      pasteURI: true,
      receiveTaddr: true,
      receiveUaddr: true,
    },
  },
  {
    variantId: "browser_chrome_noir",
    walletId: "browser_noir",
    brandSlug: "noir",
    brandName: "Noir",
    displayName: "Noir",
    device: "browser",
    subcategory: "chrome",
    recommended: true,
    sortOrder: 100,
    features: {
      ...baseWalletFeatures,
      resolveName: true,
      tapURI: true,
      pasteURI: true,
      uploadQR: true,
      receiveTaddr: true,
      receiveUaddr: true,
    },
  },
  {
    variantId: "browser_chrome_brave",
    walletId: "browser_brave",
    brandSlug: "brave",
    brandName: "Brave",
    displayName: "Brave",
    device: "browser",
    subcategory: "chrome",
    recommended: false,
    sortOrder: 110,
    features: controlOnlyFeatures,
    warning: "Browser wallet Brave cannot send ZEC to names, only control names\n(claim, list for sale, buy, etc).",
  },
] as const;

export function isWalletDevice(value: string): value is WalletDevice {
  return value === "mobile" || value === "desktop" || value === "browser";
}

export function isWalletDeviceChoice(value: string): value is WalletDeviceChoice {
  return value === "not_sure" || isWalletDevice(value);
}

export function isWalletSubcategory(value: string): value is WalletSubcategory {
  return ["ios", "android", "mac", "pc", "linux", "chrome"].includes(value);
}

export function isWalletVariantId(value: string): value is WalletVariantId {
  return WALLET_VARIANTS.some((variant) => variant.variantId === value);
}

export function isWalletBrandSlug(value: string): value is WalletBrandSlug {
  return WALLET_BRANDS.some((brand) => brand.slug === value);
}

export function getWalletBrand(slug: string): WalletBrand | null {
  return WALLET_BRANDS.find((brand) => brand.slug === slug) ?? null;
}

export function getWalletVariant(variantId: string): WalletVariant | null {
  return WALLET_VARIANTS.find((variant) => variant.variantId === variantId) ?? null;
}

export function getWalletVariantsForBrand(brandSlug: WalletBrandSlug): WalletVariant[] {
  return WALLET_VARIANTS
    .filter((variant) => variant.brandSlug === brandSlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getRecommendedVariantForBrand(brandSlug: WalletBrandSlug): WalletVariant | null {
  const variants = getWalletVariantsForBrand(brandSlug);
  return variants.find((variant) => variant.recommended) ?? variants[0] ?? null;
}

export function getWalletVariantsForPlatform(
  device: WalletDevice,
  subcategory: WalletSubcategory,
): WalletVariant[] {
  return WALLET_VARIANTS
    .filter((variant) => variant.device === device && variant.subcategory === subcategory)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubcategoryOptions(device: WalletDevice): { label: string; value: WalletSubcategory }[] {
  return SUBCATEGORY_OPTIONS[device];
}

export function defaultSubcategory(device: WalletDeviceChoice): WalletSubcategory | "" {
  if (device === "not_sure") return "";
  if (device === "desktop") return "pc";
  return SUBCATEGORY_OPTIONS[device][0]?.value ?? "";
}

export function defaultWalletChoice(
  device: WalletDeviceChoice,
  subcategory = defaultSubcategory(device),
): WalletChoice | "other" {
  if (device === "not_sure" || !subcategory) return "not_sure";
  const variants = getWalletVariantsForPlatform(device, subcategory);
  return variants.find((variant) => variant.recommended)?.variantId ?? variants[0]?.variantId ?? "other";
}

export function walletChoiceIsValid(
  device: WalletDeviceChoice,
  subcategory: WalletSubcategory | "",
  choice: WalletChoice | "other",
): boolean {
  if (choice === "not_sure") return true;
  if (choice === "other") return device !== "not_sure";
  if (device === "not_sure" || !subcategory) return false;
  const variant = getWalletVariant(choice);
  return !!variant && variant.device === device && variant.subcategory === subcategory;
}

export function walletOptionLabel(variant: WalletVariant): string {
  return variant.recommended ? `${variant.displayName} (Recommended)` : variant.displayName;
}

export function walletVariantLabel(variant: WalletVariant): string {
  return `${deviceLabel(variant.device)} ${subcategoryLabel(variant.subcategory)}: ${variant.displayName}`;
}

export function deviceLabel(device: WalletDevice): string {
  return device.charAt(0).toUpperCase() + device.slice(1);
}

export function subcategoryLabel(subcategory: WalletSubcategory): string {
  for (const options of Object.values(SUBCATEGORY_OPTIONS)) {
    const option = options.find((candidate) => candidate.value === subcategory);
    if (option) return option.label;
  }
  return subcategory;
}

export function findVariantByWalletIdAndPlatform(
  walletId: string,
  device: WalletDevice,
  subcategory: WalletSubcategory,
): WalletVariant | null {
  return WALLET_VARIANTS.find(
    (variant) =>
      variant.walletId === walletId &&
      variant.device === device &&
      variant.subcategory === subcategory,
  ) ?? null;
}
