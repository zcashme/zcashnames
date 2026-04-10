/**
 * Link grid for the docs welcome page. The groups below are meant to route
 * different reader types to the one page that can move them forward fastest.
 */

interface LinkItem {
  label: string;
  href: string;
}

interface Section {
  title: string;
  links: LinkItem[];
}

const SECTIONS: Section[] = [
  {
    title: "Start Here",
    links: [
      { label: "What is ZcashNames?", href: "/docs/learn/what-is-zns" },
      { label: "I use zcash.me", href: "/docs/learn/what-is-zns#already-using-zcashme" },
      { label: "I already claimed a name", href: "/docs/use/managing" },
      { label: "Will this expose me?", href: "/docs/learn/privacy" },
    ],
  },
  {
    title: "Introduction",
    links: [
      { label: "How it works", href: "/docs/learn/how-it-works" },
      { label: "Trust model", href: "/docs/learn/trust-model" },
      { label: "Privacy", href: "/docs/learn/privacy" },
      { label: "Name Lifecycle", href: "/docs/learn/name-lifecycle" },
      { label: "Pricing", href: "/docs/learn/pricing" },
    ],
  },
  {
    title: "Use ZNS",
    links: [
      { label: "Claiming a Name", href: "/docs/use/claiming" },
      { label: "Buying & Selling", href: "/docs/use/buying-and-selling" },
      { label: "Managing Names", href: "/docs/use/managing" },
      { label: "OTP Verification", href: "/docs/use/otp-verification" },
      { label: "Wallet Compatibility", href: "/docs/use/wallets" },
    ],
  },
  {
    title: "Integrate",
    links: [
      { label: "First Steps", href: "/docs/integrate" },
      { label: "Wallet: Resolve a Name", href: "/docs/integrate/wallet-resolution" },
      { label: "Explorer Integration", href: "/docs/integrate/explorer-integration" },
      { label: "Testing", href: "/docs/integrate/testing" },
    ],
  },
  {
    title: "SDKs",
    links: [
      { label: "Libraries", href: "/docs/sdk" },
      { label: "TypeScript Reference", href: "/docs/sdk/typescript" },
      { label: "Direct RPC", href: "/docs/sdk/direct-rpc" },
    ],
  },
  {
    title: "Protocol",
    links: [
      { label: "Overview", href: "/docs/protocol/overview" },
      { label: "Memo Format", href: "/docs/protocol/memo-format" },
      { label: "Signature Scheme", href: "/docs/protocol/signatures" },
      { label: "Pricing", href: "/docs/protocol/pricing" },
      { label: "Address Types", href: "/docs/protocol/address-types" },
    ],
  },
  {
    title: "Indexer & RPC",
    links: [
      { label: "Running an Indexer", href: "/docs/indexer/running" },
      { label: "JSON-RPC Reference", href: "/docs/indexer/rpc-reference" },
      { label: "Verifying State", href: "/docs/indexer/verifying-state" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "FAQ", href: "/docs/faq" },
      { label: "Terminology", href: "/docs/terminology" },
      { label: "Ecosystem", href: "/docs/ecosystem" },
      { label: "Live Explorer", href: "/explorer" },
      { label: "GitHub - zcashnames", href: "https://github.com/zcashme/zcashnames" },
      { label: "GitHub - ZNS Indexer", href: "https://github.com/zcashme/ZNS" },
    ],
  },
];

export function WhereToStart() {
  return (
    <div className="not-prose grid gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-3">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="!mt-0 text-base font-bold">{section.title}</h3>
          <ul className="mt-3 space-y-2 list-none p-0">
            {section.links.map((link) => (
              <li key={link.href} className="list-none">
                <a
                  href={link.href}
                  className="text-sm text-blue-600 dark:text-blue-400 no-underline hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
