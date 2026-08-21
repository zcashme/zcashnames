import "server-only";

import fs from "fs";
import path from "path";
import ts from "typescript";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import type { WalletVariantId } from "@/lib/wallets/catalog";

const MAIN_ROOT = path.resolve(process.cwd(), "..", "dotzcash_main");
const nodeRequire = eval("require")("module").createRequire(
  path.join(MAIN_ROOT, "package.json"),
) as (specifier: string) => unknown;
const moduleCache = new Map<string, unknown>();

type MainModule = Record<string, unknown> & { default?: unknown };

export type MainPreviewKey =
  | "confirm"
  | "waitlist"
  | "delete-confirm"
  | "reservation-confirmed"
  | "reservation-resend"
  | "referral-recovery"
  | "commission-pin"
  | "beta-invite"
  | "blog-subscriber-confirm"
  | "subscriber-confirm";

type MainWalletBrandSlug = string;
type MainWalletBrand = {
  slug: MainWalletBrandSlug;
  displayName: string;
  websiteUrl?: string | null;
  appIcon?: { src: string; alt?: string } | null;
  logos?: { default?: string; alt?: string } | null;
};
type MainWalletDownload = {
  device: string;
  subcategory: string;
  href: string;
};
type MainWalletVariant = {
  displayName: string;
  brandSlug: MainWalletBrandSlug;
  device: string;
  subcategory: string;
};

const PLACEHOLDER_WALLET_BRANDS = new Set<MainWalletBrandSlug>([
  "zkool",
  "zodl",
  "vizor",
  "brave",
  "zipher",
]);

function resolveMainFile(fromDir: string, specifier: string): string {
  const basePath = specifier.startsWith("@/")
    ? path.join(MAIN_ROOT, specifier.slice(2))
    : path.resolve(fromDir, specifier);

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.json`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
    path.join(basePath, "index.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  throw new Error(`Unable to resolve dotzcash_main module: ${specifier}`);
}

function loadMainModuleAbsolute(absolutePath: string): MainModule {
  if (moduleCache.has(absolutePath)) {
    return moduleCache.get(absolutePath) as MainModule;
  }

  if (absolutePath.endsWith(".json")) {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as MainModule;
    moduleCache.set(absolutePath, parsed);
    return parsed;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  const isJsxModule = absolutePath.endsWith(".tsx") || absolutePath.endsWith(".jsx");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: isJsxModule ? ts.JsxEmit.React : ts.JsxEmit.Preserve,
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: absolutePath,
  });

  const module = { exports: {} as MainModule };
  moduleCache.set(absolutePath, module.exports);

  const localRequire = (specifier: string): unknown => {
    if (specifier === "server-only") return {};
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const resolved = resolveMainFile(path.dirname(absolutePath), specifier);
      return loadMainModuleAbsolute(resolved);
    }
    return nodeRequire(specifier);
  };

  const evaluator = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    `${isJsxModule ? 'const React = require("react");\n' : ""}${transpiled.outputText}`,
  ) as (
    require: (specifier: string) => unknown,
    module: { exports: MainModule },
    exports: MainModule,
    __filename: string,
    __dirname: string,
  ) => void;

  evaluator(
    localRequire,
    module,
    module.exports,
    absolutePath,
    path.dirname(absolutePath),
  );

  moduleCache.set(absolutePath, module.exports);
  return module.exports;
}

function loadMainModule(relativePath: string): MainModule {
  return loadMainModuleAbsolute(path.join(MAIN_ROOT, relativePath));
}

function loadMainDefault<T>(relativePath: string): T {
  const mod = loadMainModule(relativePath);
  return (mod.default ?? mod) as T;
}

function resolveMainBetaInviteBodyParagraphs(
  bodyText: string,
  resolveInviteTemplate: (
    body: string,
    personalization: { displayName: string; inviteCode: string; joinUrl: string },
  ) => string,
  personalization: {
    displayName: string;
    inviteCode: string;
    joinUrl: string;
  },
): string[] {
  return resolveInviteTemplate(bodyText, personalization)
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => {
      const normalized = paragraph.toLowerCase();
      return !normalized.startsWith("join link:") && !normalized.startsWith("access code:");
    })
    .filter(
      (paragraph) =>
        paragraph.trim().toLowerCase() !== "you're invited to the zcashnames beta.",
    );
}

function resolveMainWalletCta(
  helpers: {
    getWalletVariant: (walletVariantId: WalletVariantId) => MainWalletVariant | null | undefined;
    getWalletBrand: (brandSlug: MainWalletBrandSlug) => MainWalletBrand | null | undefined;
    getWalletPlatformDownloadsForBrand: (
      brandSlug: MainWalletBrandSlug,
    ) => MainWalletDownload[];
    subcategoryLabel: (subcategory: string) => string;
    resolveWalletDownloadHref: (walletVariantId: WalletVariantId | null) => string | null;
  },
  walletVariantId: WalletVariantId | null,
  baseUrl: string,
):
  | {
      walletName: string;
      platformName: string;
      logoSrc: string;
      logoAlt: string;
      primaryLink: { href: string; label: string };
      alternateLinks: { href: string; label: string }[];
    }
  | null {
  if (!walletVariantId) return null;
  const variant = helpers.getWalletVariant(walletVariantId);
  if (!variant) return null;

  const href = helpers.resolveWalletDownloadHref(walletVariantId);
  if (!href) return null;

  const brand = helpers.getWalletBrand(variant.brandSlug);
  const logoPath = brand?.appIcon?.src ?? brand?.logos?.default;
  if (!logoPath) return null;

  const alternateLinks = helpers
    .getWalletPlatformDownloadsForBrand(variant.brandSlug)
    .filter(
      (download) =>
        !(download.device === variant.device && download.subcategory === variant.subcategory),
    )
    .map((download) => ({
      href: download.href,
      label: helpers.subcategoryLabel(download.subcategory),
    }));

  return {
    walletName: variant.displayName,
    platformName: helpers.subcategoryLabel(variant.subcategory),
    logoSrc: logoPath.startsWith("http") ? logoPath : `${baseUrl}${logoPath}`,
    logoAlt: brand?.appIcon?.alt ?? brand?.logos?.alt ?? `${variant.displayName} logo`,
    primaryLink: {
      href,
      label: helpers.subcategoryLabel(variant.subcategory),
    },
    alternateLinks,
  };
}

function resolveMainWalletLogoRow(
  helpers: {
    WALLET_BRANDS: MainWalletBrand[];
  },
  baseUrl: string,
): { src: string; alt: string; size: number }[] {
  return helpers.WALLET_BRANDS
    .map((brand) => {
      if (PLACEHOLDER_WALLET_BRANDS.has(brand.slug)) return null;
      const logoPath = brand.appIcon?.src;
      if (!logoPath) return null;

      const size =
        brand.slug === "edge" || brand.slug === "unstoppable"
          ? 32
          : brand.slug === "cake"
            ? 41
            : brand.slug === "zingo" || brand.slug === "noir"
              ? 46
              : 40;

      return {
        src: logoPath.startsWith("http") ? logoPath : `${baseUrl}${logoPath}`,
        alt: brand.appIcon?.alt ?? brand.logos?.alt ?? `${brand.displayName} logo`,
        size,
      };
    })
    .filter((logo): logo is { src: string; alt: string; size: number } => logo !== null);
}

export function resolveMainPreviewSubject(
  key: MainPreviewKey,
  walletVariantId: WalletVariantId | null,
): string {
  if (key === "beta-invite") {
    const mod = loadMainModule("lib/beta/invite-template.ts");
    const fn = mod.defaultInviteSubject as
      | ((args?: { walletVariantId?: WalletVariantId | null }) => string)
      | undefined;
    return fn ? fn({ walletVariantId }) : "Accepted! ZcashNames beta test";
  }

  const subjects: Record<Exclude<MainPreviewKey, "beta-invite">, string> = {
    confirm: "Confirm your email",
    waitlist: "Early access to ZcashNames",
    "delete-confirm": "Confirm removal of Josh",
    "reservation-confirmed": "Josh, confirming your reservation",
    "reservation-resend": "Reserve your place for Zcash Names early access",
    "referral-recovery": "Your ZcashNames referral codes",
    "commission-pin": "Your access code",
    "blog-subscriber-confirm": "Confirm your subscription to ZcashNames newsletter",
    "subscriber-confirm": "Confirm your general subscription",
  };

  return subjects[key as Exclude<MainPreviewKey, "beta-invite">];
}

export async function renderMainEmailPreview(
  key: MainPreviewKey,
  context: {
    name?: string;
    code?: string;
    wallet?: string;
  },
): Promise<string> {
  const displayName = context.name?.trim() || "Josh";
  const inviteCode = context.code?.trim() || "7QFMb3jv";
  const walletVariantId = (context.wallet?.trim() || null) as WalletVariantId | null;

  if (key === "confirm") {
    const ConfirmEmail = loadMainDefault<
      (props: { name: string; confirmUrl: string }) => ReactElement
    >("components/emails/ConfirmEmail.tsx");
    return render(
      ConfirmEmail({
        name: displayName,
        confirmUrl: "https://zcashnames.com/?token=sample-confirmation-token",
      }),
    );
  }

  if (key === "waitlist") {
    const WaitlistEmail = loadMainDefault<
      (props: {
        name: string;
        referralUrl: string;
        referralCode: string;
        accessPin?: string;
      }) => ReactElement
    >("components/emails/WaitlistEmail.tsx");
    return render(
      WaitlistEmail({
        name: displayName,
        referralUrl: "https://zcashnames.com/?ref=jswihart",
        referralCode: "jswihart",
        accessPin: "924731",
      }),
    );
  }

  if (key === "delete-confirm") {
    const WaitlistDeleteConfirmEmail = loadMainDefault<
      (props: {
        email: string;
        name: string;
        confirmUrl: string;
        rowStatus: "pending" | "protected" | "reserved";
      }) => ReactElement
    >("components/emails/WaitlistDeleteConfirmEmail.tsx");
    return render(
      WaitlistDeleteConfirmEmail({
        email: "josh@example.com",
        name: displayName,
        confirmUrl:
          "https://zcashnames.com/api/campaign-click/waitlist-delete?token=sample-delete-token",
        rowStatus: "reserved",
      }),
    );
  }

  if (key === "reservation-confirmed") {
    const WaitlistReservationConfirmedEmail = loadMainDefault<
      (props: {
        name: string;
        dashboardUrl: string;
        reservationUrl: string;
        queueUrl: string;
        otherNames: Array<{
          name: string;
          status: "pending" | "protected";
        }>;
      }) => ReactElement
    >("components/emails/WaitlistReservationConfirmedEmail.tsx");
    return render(
      WaitlistReservationConfirmedEmail({
        name: displayName,
        dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
        reservationUrl:
          "https://zcashnames.com/api/campaign-click/waitlist-confirm?token=sample-reservation-token",
        queueUrl:
          "https://zcashnames.com/waitlist/view?search=Josh&searchMode=exact",
        otherNames: [
          { name: "bigmad2", status: "pending" },
          { name: "vipbrand", status: "protected" },
        ],
      }),
    );
  }

  if (key === "reservation-resend") {
    const WaitlistReservationResendEmail = loadMainDefault<
      (props: { name?: string | null; confirmUrl: string }) => ReactElement
    >("components/emails/WaitlistReservationResendEmail.tsx");
    return render(
      WaitlistReservationResendEmail({
        name: displayName,
        confirmUrl:
          "https://zcashnames.com/api/campaign-click/waitlist-confirm?token=sample-reservation-token",
      }),
    );
  }

  if (key === "referral-recovery") {
    const ReferralRecoveryEmail = loadMainDefault<
      (props: {
        entries: Array<{
          name: string;
          referralCode: string;
          referralUrl: string;
          dashboardUrl: string;
          accessPin: string;
        }>;
      }) => ReactElement
    >("components/emails/ReferralRecoveryEmail.tsx");
    return render(
      ReferralRecoveryEmail({
        entries: [
          {
            name: displayName,
            referralCode: "Recover42",
            referralUrl: "https://zcashnames.com/?ref=Recover42",
            dashboardUrl: "https://zcashnames.com/leaders/ref/Recover42",
            accessPin: "924731",
          },
          {
            name: "Zech",
            referralCode: "ZcashLead",
            referralUrl: "https://zcashnames.com/?ref=ZcashLead",
            dashboardUrl: "https://zcashnames.com/leaders/ref/ZcashLead",
            accessPin: "371924",
          },
        ],
      }),
    );
  }

  if (key === "commission-pin") {
    const CommissionPinEmail = loadMainDefault<
      (props: { name: string; pin: string; dashboardUrl: string }) => ReactElement
    >("components/emails/CommissionPinEmail.tsx");
    return render(
      CommissionPinEmail({
        name: displayName,
        pin: "924731",
        dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
      }),
    );
  }

  if (key === "beta-invite") {
    const BetaInviteEmail = loadMainDefault<
      (props: {
        displayName: string;
        joinUrl: string;
        inviteCode: string;
        bodyParagraphs: string[];
        headingText?: string;
        previewText?: string;
        walletCta?: {
          walletName: string;
          platformName: string;
          logoSrc: string;
          logoAlt: string;
          primaryLink: { href: string; label: string };
          alternateLinks: { href: string; label: string }[];
        } | null;
        walletLogoRow?: { src: string; alt: string; size: number }[] | null;
      }) => ReactElement
    >("components/emails/BetaInviteEmail.tsx");
    const templateMod = loadMainModule("lib/beta/invite-template.ts");
    const defaultInviteBody = templateMod.defaultInviteBody as
      | ((args: { displayName: string }) => string)
      | undefined;
    const resolveInviteTemplate = templateMod.resolveInviteTemplate as
      | ((
          body: string,
          personalization: { displayName: string; inviteCode: string; joinUrl: string },
        ) => string)
      | undefined;
    const walletSelectionMod = loadMainModule("lib/beta/wallet-selection.ts");
    const resolveWalletDownloadHref = walletSelectionMod.resolveWalletDownloadHref as
      | ((walletVariantId: WalletVariantId | null) => string | null)
      | undefined;
    const walletCatalogMod = loadMainModule("lib/wallets/catalog.ts");
    const WALLET_BRANDS = walletCatalogMod.WALLET_BRANDS as MainWalletBrand[] | undefined;
    const getWalletBrand = walletCatalogMod.getWalletBrand as
      | ((brandSlug: MainWalletBrandSlug) => MainWalletBrand | null | undefined)
      | undefined;
    const getWalletPlatformDownloadsForBrand =
      walletCatalogMod.getWalletPlatformDownloadsForBrand as
        | ((brandSlug: MainWalletBrandSlug) => MainWalletDownload[])
        | undefined;
    const getWalletVariant = walletCatalogMod.getWalletVariant as
      | ((walletVariantId: WalletVariantId) => MainWalletVariant | null | undefined)
      | undefined;
    const subcategoryLabel = walletCatalogMod.subcategoryLabel as
      | ((subcategory: string) => string)
      | undefined;

    if (
      !defaultInviteBody ||
      !resolveInviteTemplate ||
      !resolveWalletDownloadHref ||
      !WALLET_BRANDS ||
      !getWalletBrand ||
      !getWalletPlatformDownloadsForBrand ||
      !getWalletVariant ||
      !subcategoryLabel
    ) {
      throw new Error("Unable to load dotzcash_main beta invite preview helpers.");
    }

    const resolvedBaseUrl = "https://www.zcashnames.com";
    const resolvedJoinUrl = `${resolvedBaseUrl}/beta/join?code=${encodeURIComponent(inviteCode)}&stage=mainnet`;
    const bodyParagraphs = resolveMainBetaInviteBodyParagraphs(
      defaultInviteBody({ displayName }),
      resolveInviteTemplate,
      {
        displayName,
        inviteCode,
        joinUrl: resolvedJoinUrl,
      },
    );
    const walletCta = resolveMainWalletCta(
      {
        getWalletVariant,
        getWalletBrand,
        getWalletPlatformDownloadsForBrand,
        subcategoryLabel,
        resolveWalletDownloadHref,
      },
      walletVariantId,
      resolvedBaseUrl,
    );
    const walletLogoRow = walletCta
      ? null
      : resolveMainWalletLogoRow({ WALLET_BRANDS }, resolvedBaseUrl);
    const headingText = walletCta ? `You're invited by ${walletCta.walletName}` : "Your invitation";

    return render(
      BetaInviteEmail({
        displayName,
        joinUrl: resolvedJoinUrl,
        inviteCode,
        bodyParagraphs,
        headingText,
        walletCta,
        walletLogoRow,
      }),
    );
  }

  if (key === "blog-subscriber-confirm") {
    const BlogSubscriberConfirmEmail = loadMainDefault<
      (props: { seriesTitle: string; confirmUrl: string }) => ReactElement
    >("components/emails/BlogSubscriberConfirmEmail.tsx");
    return render(
      BlogSubscriberConfirmEmail({
        seriesTitle: "our newsletter",
        confirmUrl: "https://zcashnames.com/subscribe/confirm?token=sample-blog-confirm-token",
      }),
    );
  }

  const SubscriberConfirmEmail = loadMainDefault<
    (props: { email: string; series: string | string[]; confirmUrl: string }) => ReactElement
  >("components/emails/SubscriberConfirmEmail.tsx");
  return render(
    SubscriberConfirmEmail({
      email: "josh@example.com",
      series: ["general", "users"],
      confirmUrl: "https://zcashnames.com/subscribe/confirm?token=sample-subscriber-confirm-token",
    }),
  );
}
