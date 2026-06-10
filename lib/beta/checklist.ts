// Canonical beta-test checklist. UI and persistence key off item.id.

type ChecklistGroup = "user";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
  section?: string;
  link?: { href: string };
  group: ChecklistGroup;
}

export const BETA_CHECKLIST: ChecklistItem[] = [
  {
    id: "ux-e1",
    label: "General Feedback",
    hint: "Report issues, inconsistencies, feature requests, or UI improvements.",
    group: "user",
  },
  {
    id: "ux-a1",
    label: "1. Buy a listed name",
    hint: "Find any name for sale in the Name Explorer. Buy it, then type the name in the wallet to confirm it resolves to your address.",
    section: "Wallet Flows",
    group: "user",
  },
  {
    id: "ux-a2",
    label: "2. List name for sale",
    hint: "List the name you bought. Confirm it appears for sale in the Name Explorer and still resolves in the wallet.",
    section: "Wallet Flows",
    group: "user",
  },
  {
    id: "ux-a3",
    label: "3. Delist name",
    hint: "Remove the name from the market. Confirm it no longer appears for sale in the Name Explorer and still resolves in the wallet.",
    section: "Wallet Flows",
    group: "user",
  },
  {
    id: "ux-a4",
    label: "4. Release name",
    hint: "Let go of the name. Confirm it can be claimed again and no longer resolves in the wallet.",
    section: "Wallet Flows",
    group: "user",
  },
  {
    id: "ux-a5",
    label: "5. Claim the name you want",
    hint: "Claim the name you want to keep. Type the name in the wallet to confirm it resolves to your address.",
    section: "Wallet Flows",
    group: "user",
  },
  {
    id: "ux-a6",
    label: "6. List claimed name for sale",
    hint: "List the name you claimed for a price you are willing to buy back. Confirm it appears for sale in the Name Explorer and still resolves in the wallet.",
    section: "Wallet Flows",
    group: "user",
  },
  {
    id: "ux-a7",
    label: "7. Purchase your listing",
    hint: "Buy the name you listed. Confirm the listing closes, the name still resolves in the wallet, and the seller receives the proceeds.",
    section: "Wallet Flows",
    group: "user",
  },
];
