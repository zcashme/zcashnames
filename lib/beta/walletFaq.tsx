import type { ReactNode } from "react";
import type { WalletBrandSlug } from "@/lib/wallets/catalog";

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

const EDGE_FAQ: readonly WalletFaqSection[] = [
  {
    id: "beta-features",
    label: "Beta Features",
    entries: [
      {
        id: "current-features",
        question: "What features are included in this beta?",
        answer: (
          <>
            <p>
              This beta retests the core ZcashNames marketplace and wallet flows on Zcash mainnet
              and adds non-custodial name transfer to the broader launch path.
            </p>
            <p>
              Testers may see flows for claiming unassigned names, updating the address tied to a
              name, listing a name for sale, buying a listed name, and viewing their personal name
              collection.
            </p>
            <p>
              Within Edge Wallet on mobile, the focus is on in-wallet name resolution and reverse
              lookup so users can send to names and understand which name an address belongs to.
            </p>
          </>
        ),
      },
      {
        id: "using-name-in-edge",
        question: "How do I use a purchased name inside Edge Wallet?",
        answer: (
          <>
            <p>Open your ZEC wallet in Edge, tap Send, and enter the name in the recipient field.</p>
            <p>
              Use the full name with the suffix, such as <code>alice.zcash</code> or{" "}
              <code>alice.zec</code>. Edge will resolve the name to a destination address before
              you confirm the transaction.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "purchase-flow",
    label: "Purchase Flow",
    entries: [
      {
        id: "purchase-outside-edge",
        question: "If name purchases still begin outside Edge, what is the intended user flow?",
        answer: (
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
      {
        id: "beta-access",
        question: "How do I get access to the Edge beta?",
        answer: (
          <>
            <p>
              Apply through <a href="/beta/apply/edge">/beta/apply/edge</a> so your wallet
              preference, feedback, and any rewards can be attributed correctly.
            </p>
            <p>
              Approved testers receive the beta access details and setup instructions through their
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
        answer: (
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
        answer: (
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
        answer: (
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
        answer: (
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
        answer: (
          <>
            <p>
              This beta runs on public mainnet, so transactions are real even though the names are
              temporary. Service interruptions, incomplete UX, and unresolved bugs are all possible
              during the testing period.
            </p>
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
        answer: (
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

const WALLET_FAQ: Partial<Record<WalletBrandSlug, readonly WalletFaqSection[]>> = {
  edge: EDGE_FAQ,
};

export function getWalletFaq(brandSlug: WalletBrandSlug): readonly WalletFaqSection[] | null {
  return WALLET_FAQ[brandSlug] ?? null;
}

export function getWalletFaqSections(brandSlug: WalletBrandSlug) {
  const faq = getWalletFaq(brandSlug) ?? [];
  return faq.map((section) => ({ id: section.id, label: section.label }));
}

export function hasWalletFaq(brandSlug: WalletBrandSlug): boolean {
  return !!WALLET_FAQ[brandSlug]?.length;
}
