import type { ReactNode } from "react";
import {
  getWalletBrand,
  getWalletVariantsForBrand,
  type WalletBrand,
  type WalletBrandSlug,
  type WalletFeatures,
  type WalletVariant,
} from "@/lib/wallets/catalog";

export type WalletFaqEntry = {
  id: string;
  question: string;
  answer: ReactNode;
};

export type WalletFaqSection = {
  id: string;
  label: string;
  entries: readonly WalletFaqEntry[];
};

type WalletFaqSectionTemplate = {
  id: string;
  label: string;
  entries: readonly WalletFaqEntryTemplate[];
};

type WalletFaqEntryTemplate = {
  id: string;
  question: string;
  answer: (context: WalletFaqContext) => ReactNode;
};

type WalletFaqEntryOverride = {
  question?: string;
  answer?: (context: WalletFaqContext) => ReactNode;
};

type WalletFaqOverrideMap = Partial<Record<string, WalletFaqEntryOverride>>;

type AggregatedNameActions = {
  list: boolean;
  claim: boolean;
  delist: boolean;
  release: boolean;
  buy: boolean;
};

type WalletFaqCapabilities = {
  hasVariants: boolean;
  supportsResolveName: boolean;
  supportsReverseLookup: boolean;
  supportsViewCollection: boolean;
  supportsViewExplorer: boolean;
  supportsViewProfile: boolean;
  supportsImportContact: boolean;
  supportsExportContact: boolean;
  supportsScanUri: boolean;
  supportsTapUri: boolean;
  supportsPasteUri: boolean;
  supportsUploadQr: boolean;
  supportsAnyNameActions: boolean;
  supportsAllNameActions: boolean;
  supportsClaim: boolean;
  supportsList: boolean;
  supportsBuy: boolean;
  supportsControlOnlyWarning: boolean;
  variantCount: number;
  hasMixedResolveName: boolean;
  warnings: string[];
  nameActions: AggregatedNameActions;
};

type WalletFaqContext = {
  brand: WalletBrand;
  variants: WalletVariant[];
  capabilities: WalletFaqCapabilities;
};

function aggregateFeature(
  variants: readonly WalletVariant[],
  selector: (features: WalletFeatures) => boolean,
) {
  const values = variants.map((variant) => selector(variant.features));
  return {
    any: values.some(Boolean),
    all: values.length > 0 && values.every(Boolean),
  };
}

function aggregateNameActions(variants: readonly WalletVariant[]): AggregatedNameActions {
  const actions: (keyof AggregatedNameActions)[] = ["list", "claim", "delist", "release", "buy"];
  return actions.reduce<AggregatedNameActions>((acc, key) => {
    acc[key] = variants.some((variant) => variant.features.nameActions[key]);
    return acc;
  }, {
    list: false,
    claim: false,
    delist: false,
    release: false,
    buy: false,
  });
}

function getWalletFaqContext(brandSlug: WalletBrandSlug): WalletFaqContext | null {
  const brand = getWalletBrand(brandSlug);
  if (!brand) return null;

  const variants = getWalletVariantsForBrand(brandSlug);
  const resolveName = aggregateFeature(variants, (features) => features.resolveName);
  const reverseLookup = aggregateFeature(variants, (features) => features.reverseLookup);
  const viewCollection = aggregateFeature(variants, (features) => features.viewCollection);
  const viewExplorer = aggregateFeature(variants, (features) => features.viewExplorer);
  const viewProfile = aggregateFeature(variants, (features) => features.viewProfile);
  const importContact = aggregateFeature(variants, (features) => features.importContact);
  const exportContact = aggregateFeature(variants, (features) => features.exportContact);
  const scanUri = aggregateFeature(variants, (features) => features.scanURI);
  const tapUri = aggregateFeature(variants, (features) => features.tapURI);
  const pasteUri = aggregateFeature(variants, (features) => features.pasteURI);
  const uploadQr = aggregateFeature(variants, (features) => features.uploadQR);
  const nameActions = aggregateNameActions(variants);
  const warnings = Array.from(
    new Set(
      variants
        .map((variant) => variant.warning?.trim())
        .filter((warning): warning is string => !!warning),
    ),
  );

  const capabilities: WalletFaqCapabilities = {
    hasVariants: variants.length > 0,
    supportsResolveName: resolveName.any,
    supportsReverseLookup: reverseLookup.any,
    supportsViewCollection: viewCollection.any,
    supportsViewExplorer: viewExplorer.any,
    supportsViewProfile: viewProfile.any,
    supportsImportContact: importContact.any,
    supportsExportContact: exportContact.any,
    supportsScanUri: scanUri.any,
    supportsTapUri: tapUri.any,
    supportsPasteUri: pasteUri.any,
    supportsUploadQr: uploadQr.any,
    supportsAnyNameActions: Object.values(nameActions).some(Boolean),
    supportsAllNameActions: Object.values(nameActions).every(Boolean),
    supportsClaim: nameActions.claim,
    supportsList: nameActions.list,
    supportsBuy: nameActions.buy,
    supportsControlOnlyWarning: warnings.some((warning) => warning.includes("cannot send ZEC to names")),
    variantCount: variants.length,
    hasMixedResolveName: resolveName.any && !resolveName.all,
    warnings,
    nameActions,
  };

  return { brand, variants, capabilities };
}

function walletDisplay(context: WalletFaqContext): string {
  return context.brand.displayName;
}

function supportedVersionPhrase(context: WalletFaqContext): string {
  return context.capabilities.hasMixedResolveName ? "on supported versions" : "in the current beta";
}

function listWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function purchaseMethods(context: WalletFaqContext): string[] {
  const methods: string[] = [];
  if (context.capabilities.supportsScanUri) methods.push("scan the payment QR");
  if (context.capabilities.supportsTapUri) methods.push("tap the payment link from a supported device");
  if (context.capabilities.supportsPasteUri) methods.push("paste the ZIP-321 URI into the wallet");
  if (context.capabilities.supportsUploadQr) methods.push("upload a saved or captured QR image");
  return methods;
}

const BASE_FAQ_TEMPLATE: readonly WalletFaqSectionTemplate[] = [
  {
    id: "beta-features",
    label: "Beta Features",
    entries: [
      {
        id: "current-features",
        question: "What features are included in this beta?",
        answer: (context) => {
          const { brand, capabilities } = context;
          return (
            <>
              <p>
                This beta retests the core ZcashNames marketplace and wallet flows on Zcash mainnet
                and continues the rollout of non-custodial name transfer.
              </p>
              <p>
                Testers may see flows for claiming unassigned names, updating the address tied to a
                name, listing a name for sale, buying a listed name, and viewing personal name data
                where supported.
              </p>
              {capabilities.supportsResolveName ? (
                <p>
                  In {walletDisplay(context)}, the current focus includes in-wallet name resolution{" "}
                  {supportedVersionPhrase(context)}
                  {capabilities.supportsReverseLookup ? " and reverse lookup where available." : "."}
                </p>
              ) : capabilities.supportsAnyNameActions ? (
                <p>
                  In {walletDisplay(context)}, the focus is on supported control and marketplace
                  actions rather than recipient-field send-to-name flows.
                </p>
              ) : (
                <p>
                  In {walletDisplay(context)}, the beta currently emphasizes compatible payment
                  request handling and broader ZcashNames testing rather than full in-wallet name
                  resolution.
                </p>
              )}
              {brand.slug !== "edge" && capabilities.supportsControlOnlyWarning ? (
                <p>
                  Some supported versions of {walletDisplay(context)} can control names during beta
                  without directly sending ZEC to names from the recipient field.
                </p>
              ) : null}
            </>
          );
        },
      },
      {
        id: "using-name",
        question: "How do I use a purchased name with this wallet?",
        answer: (context) => {
          const { capabilities } = context;
          if (capabilities.supportsResolveName) {
            return (
              <>
                <p>
                  Open your ZEC wallet in {walletDisplay(context)} and enter the name in the
                  recipient field on supported versions.
                </p>
                <p>
                  Use the full name with the suffix, such as <code>alice.zcash</code> or{" "}
                  <code>alice.zec</code>. {walletDisplay(context)} can resolve the name to a
                  destination address before you confirm when that flow is supported.
                </p>
                {capabilities.supportsReverseLookup ? (
                  <p>
                    Some supported versions also surface reverse-lookup context so an address can be
                    associated back to a name during testing.
                  </p>
                ) : null}
              </>
            );
          }

          if (capabilities.supportsAnyNameActions) {
            return (
              <>
                <p>
                  During this beta, {walletDisplay(context)} is better suited for supported name
                  control or marketplace actions than for typing a name directly into a send field.
                </p>
                <p>
                  After acquiring a name, use the beta tools and supported wallet actions to manage
                  listings, purchases, collections, or related flows that your version supports.
                </p>
              </>
            );
          }

          return (
            <>
              <p>
                During this beta, {walletDisplay(context)} should be treated as a compatible wallet
                for supported payment-request handling rather than a full in-wallet name experience.
              </p>
              <p>
                Name registration and management may still begin through the ZcashNames flow, with
                wallet usage varying by app version and platform.
              </p>
            </>
          );
        },
      },
    ],
  },
  {
    id: "purchase-flow",
    label: "Purchase Flow",
    entries: [
      {
        id: "purchase-flow",
        question: "How does the purchase or claim flow work with this wallet?",
        answer: (context) => {
          const methods = purchaseMethods(context);
          return (
            <>
              <p>
                To claim or buy a name, the user sends a specific memo and amount to the registrar
                wallet. ZcashNames provides this as a ZIP-321 payment request.
              </p>
              {methods.length > 0 ? (
                <>
                  <p>
                    With {walletDisplay(context)}, the best supported methods are {listWithAnd(methods)}.
                  </p>
                  <p>
                    If a direct wallet flow is not available on the user&rsquo;s version, they can
                    still fall back to copying the address, memo, and amount manually.
                  </p>
                </>
              ) : (
                <p>
                  If the wallet does not expose direct QR or URI handling for this flow, the user
                  can still complete the request by copying the address, memo, and amount manually.
                </p>
              )}
            </>
          );
        },
      },
      {
        id: "beta-access",
        question: "How do I get access to this wallet beta?",
        answer: (context) => (
          <>
            <p>
              Apply through <a href={`/beta/apply/${context.brand.slug}`}>/beta/apply/{context.brand.slug}</a>{" "}
              so your wallet preference, feedback, and any rewards can be attributed correctly.
            </p>
            <p>
              Approved testers receive beta access details and setup instructions through their
              selected contact method once the round is open.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "pricing-lifecycle",
    label: "Pricing and Lifecycle",
    entries: [
      {
        id: "discounted-pricing",
        question: "Is beta pricing discounted?",
        answer: () => (
          <>
            <p>
              Yes. Beta pricing is currently set at 1% of planned launch pricing so testers can
              exercise real mainnet flows at a lower cost.
            </p>
            <p>
              Claim fees and listing fees may be refundable during testing if requested through the
              feedback panel. Secondary-market purchases between users should be treated as real
              trades and are not generally refundable by the ZcashNames team.
            </p>
          </>
        ),
      },
      {
        id: "beta-reset",
        question: "Will beta names be revoked later?",
        answer: () => (
          <>
            <p>
              Yes. Names created during beta are temporary and are expected to be reset before
              Early Access begins.
            </p>
            <p>
              Beta participation helps test the system, but it does not preserve ownership of a
              specific name into Early Access or public launch.
            </p>
          </>
        ),
      },
      {
        id: "future-access",
        question: "Will beta testers get first access to buy names again later?",
        answer: () => (
          <>
            <p>
              Early Access is expected to use the waitlist and referral system to determine who can
              buy before open registration.
            </p>
            <p>
              Joining early and referring others improves your position, but it does not guarantee
              access to any specific name if multiple users want the same one.
            </p>
          </>
        ),
      },
      {
        id: "future-pricing",
        question: "What pricing should users expect after beta?",
        answer: () => (
          <>
            <p>
              The current plan is for standard names, generally seven characters or more, to start
              around $100 USD denominated in ZEC.
            </p>
            <p>
              Very short names may use a different pricing model, and ZEC-denominated amounts are
              expected to adjust with the ZEC/USD exchange rate over time.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "risks-rewards",
    label: "Risks and Rewards",
    entries: [
      {
        id: "risks-limitations",
        question: "What risks or limitations should testers understand?",
        answer: (context) => (
          <>
            <p>
              This beta runs on public mainnet, so transactions are real even though the names are
              temporary. Service interruptions, incomplete UX, and unresolved bugs are all possible
              during the testing period.
            </p>
            {context.capabilities.supportsControlOnlyWarning ? (
              <p>
                Some wallet versions currently support name-control or marketplace flows more fully
                than direct send-to-name behavior, so testers should follow the supported beta paths
                for their version.
              </p>
            ) : null}
            <p>
              Some debugging may require log review or reproduction details. As with any beta,
              testers should avoid treating temporary beta names as permanent identity assets.
            </p>
          </>
        ),
      },
      {
        id: "testing-incentives",
        question: "Why participate in testing now?",
        answer: () => (
          <>
            <p>
              Beta testers help shape the live wallet experience and may qualify for bug-bounty
              rewards when they report confirmed, reproducible issues through the feedback panel.
            </p>
            <p>
              Current reward targets are 0.05 ZEC for minor confirmed bugs and 0.5 ZEC for
              critical confirmed bugs, with rewards typically going to the first valid report.
            </p>
          </>
        ),
      },
    ],
  },
] as const;

const EDGE_ENTRY_OVERRIDES: WalletFaqOverrideMap = {
  "current-features": {
    answer: () => (
      <>
        <p>
          This beta retests the core ZcashNames marketplace and wallet flows on Zcash mainnet and
          adds non-custodial name transfer to the broader launch path.
        </p>
        <p>
          Testers may see flows for claiming unassigned names, updating the address tied to a name,
          listing a name for sale, buying a listed name, and viewing their personal name
          collection.
        </p>
        <p>
          Within Edge Wallet on mobile, the focus is on in-wallet name resolution and reverse
          lookup so users can send to names and understand which name an address belongs to.
        </p>
      </>
    ),
  },
  "using-name": {
    question: "How do I use a purchased name inside Edge Wallet?",
    answer: () => (
      <>
        <p>Open your ZEC wallet in Edge, tap Send, and enter the name in the recipient field.</p>
        <p>
          Use the full name with the suffix, such as <code>alice.zcash</code> or{" "}
          <code>alice.zec</code>. Edge will resolve the name to a destination address before you
          confirm the transaction.
        </p>
      </>
    ),
  },
  "purchase-flow": {
    question: "If name purchases still begin outside Edge, what is the intended user flow?",
    answer: () => (
      <>
        <p>
          To claim or buy a name, the user sends a specific memo and amount to the registrar
          wallet. ZcashNames provides this as a ZIP-321 payment request.
        </p>
        <p>For Edge users, the preferred order is:</p>
        <ul className="list-disc pl-5">
          <li>Scan the QR code directly from Edge.</li>
          <li>On mobile, tap the QR or payment link to open the wallet if the device supports it.</li>
          <li>Save or screenshot the QR and upload it into Edge if scanning is more convenient.</li>
          <li>Copy and paste the ZIP-321 URI into the ZEC address field so Edge can parse it.</li>
          <li>As a fallback, copy the address, memo, and amount into the wallet manually.</li>
        </ul>
        <p>
          A future beta may expose more of this marketplace flow directly inside partner wallet
          experiences.
        </p>
      </>
    ),
  },
  "beta-access": {
    question: "How do I get access to the Edge beta?",
    answer: () => (
      <>
        <p>
          Apply through <a href="/beta/apply/edge">/beta/apply/edge</a> so your wallet preference,
          feedback, and any rewards can be attributed correctly.
        </p>
        <p>
          Approved testers receive the beta access details and setup instructions through their
          selected contact method once the round is open.
        </p>
      </>
    ),
  },
};

const WALLET_ENTRY_OVERRIDES: Partial<Record<WalletBrandSlug, WalletFaqOverrideMap>> = {
  edge: EDGE_ENTRY_OVERRIDES,
};

function buildFaqSections(context: WalletFaqContext): WalletFaqSection[] {
  const overrides = WALLET_ENTRY_OVERRIDES[context.brand.slug] ?? {};

  return BASE_FAQ_TEMPLATE.map((section) => ({
    id: section.id,
    label: section.label,
    entries: section.entries.map((entry) => {
      const override = overrides[entry.id];
      return {
        id: entry.id,
        question: override?.question ?? entry.question,
        answer: override?.answer ? override.answer(context) : entry.answer(context),
      };
    }),
  }));
}

export function getWalletFaq(brandSlug: WalletBrandSlug): readonly WalletFaqSection[] | null {
  const context = getWalletFaqContext(brandSlug);
  if (!context) return null;
  return buildFaqSections(context);
}

export function getWalletFaqSections(brandSlug: WalletBrandSlug) {
  const faq = getWalletFaq(brandSlug) ?? [];
  return faq.map((section) => ({ id: section.id, label: section.label }));
}

export function hasWalletFaq(brandSlug: WalletBrandSlug): boolean {
  return !!getWalletBrand(brandSlug);
}
