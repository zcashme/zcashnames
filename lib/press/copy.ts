export const STORY =
  "Zcash Names lets someone use alice.zcash instead of pasting a shielded address from one app into the next. The name takes the place of having to recall and enter that address. A shielded payment keeps the sender, the receiver, and the amount off public block explorers. Sharing the name works the way sharing an email address does: the name can be public, and the payment history behind it stays closed.";

export const POSITIONING = "Human-readable does not have to mean financially transparent.";

export type Qa = {
  id: string;
  question: string;
  paragraphs: string[];
};

export const LAUNCH_QUESTIONS: Qa[] = [
  {
    id: "pool",
    question: "Is the launch architecture Orchard-based or Ironwood-compatible?",
    paragraphs: [
      "Ironwood. Name Notes are Ironwood-pool notes. Ironwood reuses the Orchard protocol machinery and is a separate pool. zns-verify says Name Notes are not Orchard-pool notes.",
    ],
  },
  {
    id: "orchard-ironwood",
    question: "How did the Orchard vulnerability and Ironwood migration affect Zcash Names?",
    paragraphs: [
      "When Zcash moved from the Orchard pool to Ironwood, Zcash Names migrated its Name Notes to that pool. Ironwood is a new value pool that uses the Orchard cryptographic protocol, with its own note commitment tree, anchor, pool balance, and transaction context. The basic architecture stays, and so does the existing note-commitment primitive. Notes use the V3 plaintext format from ZIP 2005. The Orchard library exposes the V2 derivation as rcm_v2 and the V3 derivation as rcm_v3, and Ironwood bundles use V3 notes.",
      "The change for Zcash Names is rcm, the randomness that goes into the Orchard-protocol note commitment. An Orchard V2 note derives rcm from rseed through a PRF whose input is a domain separator and rho. An Ironwood V3 note first builds pre_rcm from the diversified base g_d, the transmission key pk_d, the value v, rho, and psi, then derives rcm from rseed and that pre_rcm. Changing any of those fields changes rcm, if the PRF behaves as specified. That is the quantum-recoverable note construction and its stronger binding argument. A Name Note is verified by rebuilding the Zcash note and matching its commitment to the cmx on chain. Creation, verification, scanning, test vectors, and the Mint and resolver paths that identify the pool were updated for the V3 format, the V3 rcm derivation, and the Ironwood tree.",
    ],
  },
  {
    id: "written",
    question: "What exactly is written to Zcash?",
    paragraphs: [
      "When the Mint accepts a transition, it creates a Name Note, an Ironwood output, whose memo contains action + name + unified address + expires_at + prev_rcm. The Name Note's cmx cryptographically commits to that transition.",
    ],
  },
  {
    id: "resolver",
    question: "What can a resolver see?",
    paragraphs: [
      "A resolver using the published Name Note viewing key can see every accepted Name Note: the name, claim, update, or release, the unified address, the expiration, the predecessor reference, and the chain position. It cannot derive the private OTP exchange from Name Note history. The Mint itself can see Request, Relay, and Respond memos.",
      "A reader does not have to trust a hosted resolver, or a Zcash Names database, to determine the confirmed registry history. Anyone can scan Zcash with the published viewing key, verify each Name Note's commitment and Mint authorization, check predecessor links, and derive the same state. Resolvers that follow the same protocol rules against the same canonical chain are supposed to derive the same state. Those properties follow from Zcash consensus plus the protocol rules. zns-verify is designed to work without a hosted resolver.",
      "Full self-verification of the TEE deployment also requires the attestation artifacts and verifier. Checks that cannot be reconstructed from the public Name Notes, such as OTP authorization, pricing, protected-name eligibility, and lifecycle enforcement, still rely on the Mint's attestation.",
    ],
  },
  {
    id: "sdk",
    question: "What does the SDK verify?",
    paragraphs: [
      "The zns-verify kernel parses the Name Note, derives rcm and ψ from its fields, reconstructs the note commitment, compares it with the on-chain cmx, and enforces the prev_rcm transition rule. That proves the Name Note data is bound to that Zcash output.",
    ],
  },
  {
    id: "other-chain",
    question: "Is another chain part of verification?",
    paragraphs: [
      "Protocol history is on Zcash. Policy execution is off-chain. Accepted results are bound back to Zcash. No EVM chain is part of that verification model.",
    ],
  },
  {
    id: "admin-key",
    question: "What does the admin key do?",
    paragraphs: [
      "There is a Mint spending key. Its purpose is to authorize Name Notes created by the Mint. It is inside the TEE and usable only by the approved Mint program. Possession of that key outside those constraints would be enough to create transitions that appear Mint-authorized. Key custody and remote attestation are part of the trust model.",
    ],
  },
  {
    id: "modify",
    question: "Can the operator modify a user's name?",
    paragraphs: [
      "The operator alone should not be able to modify a name. An update or a user-requested release requires the OTP authorization flow to the Ironwood receiver currently bound to the name. The Mint key is intended to be enclave-only.",
      "The Mint can release a name without that user authorization when the protocol's expiration or liveness rules require it.",
      "That guarantee depends on the TEE and key-custody assumption. The whitepaper states that compromise could permit unauthorized Name Notes, so seizure is not cryptographically impossible under every failure condition.",
    ],
  },
  {
    id: "trust-required",
    question: "Which operations require trust?",
    paragraphs: [
      "Policy authorization uses the TEE trust assumption: pricing, protected-name eligibility, OTP authorization, expiration calculations, lifecycle and liveness enforcement, external price data, and Mint key custody. Availability also depends on the Mint continuing to operate.",
    ],
  },
  {
    id: "disappears",
    question: "What happens if Zcash Names disappears?",
    paragraphs: [
      "Existing names remain reconstructible from Zcash. Anyone with the public viewing key and protocol software can rebuild the registry. Existing name-to-address mappings do not depend on a Zcash Names database.",
      "Without a functioning Mint, new claims, updates, controller releases, and required lifecycle releases cannot occur. An expired name remains in registry state until the required release Name Note appears on Zcash.",
      "The registry stays readable, and it stays frozen until a recognized Mint can resume creating transitions.",
    ],
  },
];

export const CONTROL_QUESTIONS: Qa[] = [
  {
    id: "who-controls",
    question: "Who controls the registry?",
    paragraphs: [
      "No one controls the historical registry database in the usual sense. The registry is derived from Name Notes recorded on Zcash, and anyone can independently reconstruct the same state by running a resolver.",
      "The Mint does control which new transitions it authorizes. It is the protocol's single registrar. It evaluates claims, updates, releases, pricing, authorization, and lifecycle rules before creating a Name Note. If it refuses a request or becomes unavailable, no new accepted transition is produced, so new claims, updates, and releases stop. Once a Name Note is confirmed on Zcash, the Mint cannot rewrite or delete it, and it cannot stop someone from reconstructing the existing registry.",
    ],
  },
  {
    id: "who-prices",
    question: "Who controls pricing?",
    paragraphs: [
      "Pricing is enforced by the attested Mint. The pricing policy runs inside the TEE and is bound to the approved enclave measurement. The whitepaper does not currently define decentralized governance for choosing that pricing policy, so control over which pricing policy is approved belongs to whoever governs the Zcash Names deployment. Once deployed, the TEE enforces that policy during execution.",
    ],
  },
];

export const HOW_QUESTIONS: Qa[] = [
  {
    id: "five-minutes",
    question: "Walk through the architecture.",
    paragraphs: [
      "Ethereum name services can put the naming rules and the registry state inside smart contracts. The contract decides whether a name can be claimed or updated, applies the rules, and stores the resulting state on-chain.",
      "Zcash does not have that kind of general-purpose execution environment, so those functions are split. The Mint applies the rules, Zcash records the accepted history, and resolvers reconstruct the namespace from that history.",
      "When someone claims, updates, or releases a Zcash name, the request goes to the Mint. The Mint checks whether the name is available, whether the payment is correct, whether the registration has expired, whether an Early Access code is required, and whether an update was authorized by the current controller.",
      "If the transition is valid, the Mint publishes a Name Note to Zcash. A Name Note records the accepted state transition: the operation, the name, the unified address it resolves to, the expiration, and a reference to the previous state of that name.",
      "For every accepted transition, Zcash Names derives cryptographic values from the contents of the Name Note and uses them when constructing the Zcash note commitment. The on-chain commitment is tied to the name, address, operation, expiration, and previous-state reference. A resolver decrypts the Name Note with the published viewing key, recomputes the commitment, and compares it with the commitment Zcash recorded. Changing the address, the operation, the expiration, or the predecessor breaks that match.",
      "Every Name Note points back to the previous accepted Name Note for that registration through prev_rcm. A claim starts the chain. An update points to that claim. The next update points to the previous update. A release points to the state it is releasing.",
      "A resolver scans Zcash in canonical block order, verifies each Name Note, checks that prev_rcm matches the state it currently has for that name, and applies the transition. If Zcash reorganizes, the resolver rolls back the affected blocks and replays the replacement chain. If a release and an update compete against the same state in the same block, the protocol applies a release-first rule. zns-verify derives rcm and ψ from the transition and uses them in the Ironwood note commitment.",
      "Zcash can prove that a particular Name Note was committed. It cannot prove that the Mint was correct to authorize it. Pricing, protected-name access, OTP authorization, expiration, and liveness sit in that gap. Today the whitepaper places that logic and the Mint spending key inside a TEE and uses remote attestation to bind the key to the approved Mint program and policy. The paper describes a future off-chain zero-knowledge name circuit as the path for replacing that trust assumption with a proof.",
      "The registry itself is public. The Name Note viewing key is published so anyone can reconstruct names, destination addresses, state transitions, expiration data, and predecessor links. What remains shielded is the user's payment activity. If alice.zcash resolves to a unified address, publishing that mapping does not make the transactions sent to that address public.",
      "The Mint enforces the rules. Zcash records the history. Resolvers reconstruct the namespace.",
    ],
  },
  {
    id: "early-access",
    question: "Early Access",
    paragraphs: [
      "A reservation is a 0.005 ZEC payment to secure a waitlist position and receive an Early Access code.",
      "Early Access opens on October 15, 2026, at 12:00 PM Eastern for waitlisters who reserved a name. Reservations close then. Open registration begins on October 30, after those reservations have had a chance to claim the name they are waiting for.",
      "The window is there to stop sniping and spread claims more fairly. Without it, the first transaction at the moment registration opens would take the name. Early Access sends codes to reserved participants first, in order for that specific name.",
      "That order starts from when each person joined the waitlist. Referrals move people up. Each direct referral who also completes a reservation moves the adjusted line up by 1. Every 3 indirect reserved referrals move it up by 1. A shared link by itself leaves position unchanged. Partial groups wait until they reach the full threshold. When adjusted lines tie, the earlier original waitlist line wins.",
      "A code is a chance to claim during that window. If the name is not claimed in time, eligibility can pass to the next reserved participant or to open registration. A protected name still needs its own approval.",
    ],
  },
  {
    id: "referral-rewards",
    question: "Referral rewards",
    paragraphs: [
      "Referral rewards are separate from waitlist position. Position moves when a referred person completes a reservation. The reward is paid when that person claims a name.",
      "During Early Access, a direct referral can earn up to $4 USD in ZEC for each referred signup that completes a qualifying claim. That Level I amount is one fifth of the lowest yearly price, $20. Referrals of those referrals earn at each deeper level, and each level is half the previous one. The figures shown are current-rate ZEC estimates.",
      "Payouts go to the referrer's Zcash name after that name has been reserved. Dashboard totals stay estimates until they are reviewed and paid.",
      "Rewards and access can be adjusted for abuse, fraud, duplicate accounts, self-referrals, payment reversals, or other activity that breaks the one-person, one-Early-Access-claim intent.",
    ],
  },
  {
    id: "why-reservations",
    question: "Why we introduced Reservations",
    paragraphs: [
      "Email confirmation alone is cheap to repeat. One person can open many inboxes and occupy many waitlist lines.",
      "A reservation requires an on-chain Zcash payment of 0.005 ZEC for each name. That cost makes bulk signup expensive and shows that the spot belongs to someone willing to pay.",
      "The payment secures a waitlist position and the Early Access code for that name. It turns a confirmed email into a participant in the Early Access queue. It does not purchase the name.",
      "Joining the waitlist still records interest. Until the reservation is complete, position stays unavailable. Each name has its own queue and its own payment.",
    ],
  },
  {
    id: "impersonation",
    question: "Protecting against impersonations and phishing",
    paragraphs: [
      "Some names are held before Early Access so brands, projects, community handles, legally sensitive terms, and strings that are easy to use for phishing cannot be taken by the first person who pays. The public list is at /protected. A name on that list with status protected, not yet claimed, and either no expiry or an expiry still in the future, needs an unlock code before the product will sign a claim.",
      "Eligible names are the ones people already associate with a real person, organization, brand, project, or community, plus lookalikes of those names. A parent is the canonical name. A variant points at that parent, including support handles, misspellings, and phishing lookalikes. Categories label the review. They do not replace the unlock code.",
      "Anyone can suggest a missing name at /protected/suggest. The suggestion names the string, marks it as a parent or a variant, picks a category, explains why it should be held, and attaches evidence. New suggestions enter Under review until an operator approves or rejects them. Under review by itself leaves ordinary claiming open.",
      "A protected or rejected name that has not been claimed can be disputed at /protected/dispute. Operators review the dispute on its own track. Filing a dispute leaves the claim gate as it is.",
      "The public waitlist is checked against this policy. A waitlisted name that is already protected shows that status. A name that is not protected can be suggested from the waitlist when it could be used for impersonation, fraud, or other misuse. That review is meant to settle the list before Early Access begins.",
      "The list also includes top ENS names ranked by X follower count. Those identities are already public, so a first payer at launch could impersonate them. They are held for a limited time so the person behind the name can request access. An unapproved ENS row stays pending, listed and requestable, with no unlock code, until a request is approved. The request needs to be in before Early Access on October 15, 2026, at 12:00 PM Eastern. After that, a pending ENS name with no submitted or approved request is rejected. An approved ENS name stays protected through November 1, 2026, at 12:00 PM Eastern.",
      "Protected names with no expiry stay on the list until the name is claimed or an operator changes the row. The public list shows those as never expiring. When an operator sets an expiry and the name is still unclaimed after that time, protection ends and the row is rejected.",
      "Operators manage the master list. They approve and reject suggestions, decide disputes, set or clear expiry, and issue unlock codes after they verify the right party. Approval leaves the claim price in place. The code is issued out of band. The public /protected page is the view of that list.",
      "The list has to be in place before Early Access. On October 15, reserved participants start receiving codes and can claim. Names that should be held for a real identity need to be gated before that window.",
    ],
  },
  {
    id: "names-and-addresses",
    question: "How a name points at an address",
    paragraphs: [
      "One current name points at one unified address. It does not point at several addresses at the same time. Updates can change that address later. A unified address can contain several Zcash receiver types and is still one address at the naming layer.",
      "Several names can point at the same unified address. The whitepaper defines uniqueness of names, not uniqueness of destination unified addresses. A separate policy could forbid that sharing. Because the registry is readable, that relationship is observable.",
      "Reverse lookup can show every name that has pointed at an address, and the transition history of those names. A reverse-lookup service can expose several names that share the same unified address. Querying a hosted resolver can also reveal the lookup itself and ordinary network metadata to that service.",
      "One Zcash account can have many addresses. Most wallets have one Zcash account. Some wallets allow more than one.",
    ],
  },
  {
    id: "what-stays-private",
    question: "What stays private",
    paragraphs: [
      "The name and the resolving address can be discovered. The privacy property is Zcash shielding, which keeps that address from working like a public bank statement.",
      "On a public chain, a name is tied to a public wallet, public balances, public transactions, and activity that can be analyzed. A Zcash name is tied to a unified address. The person can receive funds, and the shielded transaction history stays private.",
      "Already public, before any payment: the name, the unified address it resolves to, claim, update, and release history, expiration, and predecessor links. Name Notes are encrypted as Zcash notes, and their viewing key is published, so anyone can decrypt those registry records. A hosted resolver also sees the lookup and ordinary network metadata.",
      "Payment amounts, counterparties, and the shielded history of that unified address stay shielded. Publishing the name-to-address mapping does not create a public transaction history for those payments. A payment does not have to put the human-readable name in the transaction.",
      "Request, Relay, and Respond traffic is shielded. It is not part of the publicly readable Name Note registry, and it is not made publicly decryptable. The Mint can see those memos.",
    ],
  },
];

function pickQuestions(ids: readonly string[]): Qa[] {
  const byId = new Map([...HOW_QUESTIONS, ...LAUNCH_QUESTIONS, ...CONTROL_QUESTIONS].map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`Missing press question ${id}`);
    return item;
  });
}

export const HOW_GETTING_A_NAME = pickQuestions([
  "early-access",
  "referral-rewards",
  "why-reservations",
  "impersonation",
]);
export const HOW_NAME_IN_USE = pickQuestions(["names-and-addresses", "what-stays-private"]);

export const HOW_DESIGN = pickQuestions(["written", "five-minutes"]);
export const QUESTIONS_WHO_CAN_CHANGE = pickQuestions([
  "who-controls",
  "admin-key",
  "modify",
  "who-prices",
  "disappears",
]);
export const QUESTIONS_TRUST = pickQuestions(["resolver", "trust-required", "sdk", "other-chain"]);

export const WALLETS = [
  { name: "Cake", href: "https://cakewallet.com/", icon: "/wallets/cake/app-icon.png" },
  { name: "Edge", href: "https://edge.app/", icon: "/icons/edge.png" },
  { name: "Unstoppable", href: "https://unstoppable.money/", icon: "/wallets/unstoppable/app-icon.png", badge: "Next Release" },
  { name: "Noir", href: "https://www.zknoir.com/", icon: "/wallets/noir/app-icon.png" },
  { name: "Zucchini", href: "https://zucchinifi.xyz/", icon: "/icons/zucchini.png" },
  { name: "Nozy", href: "https://leonine-dao.github.io/Nozy-wallet/", icon: "/icons/nozy.png" },
] as const;

export const APPS = [
  { name: "Cipherscan", href: "https://cipherscan.app", icon: "/icons/cipherscan.png" },
  { name: "Shieldedscan", href: "https://shieldedscan.xyz", icon: "/icons/shieldedscan.svg" },
  { name: "Cyze", href: "https://github.com/USCMig/Cyze", icon: "/icons/cyze.svg" },
  {
    name: "ZDEX",
    href: "https://zdex.finance",
    icon: "/icons/zdex.png",
    lightIcon: "/icons/zdex-light.png",
    iconClassName: "h-8 w-[4.75rem] object-contain",
  },
  { name: "zec-os", href: "https://www.zec-os.com/", icon: "/icons/zec-os.svg" },
  { name: "Zcash.me", href: "https://zcash.me", icon: "/icons/zcashme.svg" },
] as const;

export const LAUNCH_PRICES: { length: string; yearly: string; forever: string }[] = [
  { length: "6 or longer", yearly: "$20", forever: "$60" },
  { length: "5", yearly: "$100", forever: "$300" },
  { length: "4", yearly: "$400", forever: "$1,200" },
  { length: "3", yearly: "$800", forever: "$2,400" },
  { length: "2", yearly: "$2,500", forever: "$7,500" },
  { length: "1", yearly: "$10,000", forever: "$30,000" },
];
