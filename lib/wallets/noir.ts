const POSITIVE_ZEC = /^\d+(\.\d{1,8})?$/;
const DETECT_TIMEOUT_MS = 3000;

export type NoirPayment = {
  to: string;
  amount: string;
  memo?: string;
};

type RawNoirWallet = {
  isNoirWallet?: boolean;
  zcash?: unknown;
};

let detectPromise: Promise<boolean> | null = null;

function getRawNoirWallet(): RawNoirWallet | null {
  if (typeof window === "undefined") return null;
  const raw = (window as Window & { noirwallet?: RawNoirWallet }).noirwallet;
  if (!raw?.isNoirWallet || !raw.zcash) return null;
  return raw;
}

async function loadSdk() {
  return import("@noir-wallet/sdk");
}

export function detectNoirWallet(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!detectPromise) {
    detectPromise = new Promise((resolve) => {
      if (getRawNoirWallet()) {
        resolve(true);
        return;
      }

      let handled = false;
      const finish = () => {
        if (handled) return;
        handled = true;
        window.removeEventListener("noirwallet#initialized", finish);
        resolve(getRawNoirWallet() !== null);
      };

      window.addEventListener("noirwallet#initialized", finish, { once: true });
      window.setTimeout(finish, DETECT_TIMEOUT_MS);
    });
  }
  return detectPromise;
}

export function formatNoirWalletError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 4001 || code === "4001") return "Request cancelled in Noir Wallet.";
  }
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return "Noir Wallet could not complete this request.";
  const lower = message.toLowerCase();
  if (lower.includes("reject") || lower.includes("denied") || lower.includes("cancel")) {
    return "Request cancelled in Noir Wallet.";
  }
  if (lower.includes("not installed")) {
    return "Noir Wallet is not available.";
  }
  return message;
}

export async function payWithNoir(payment: NoirPayment): Promise<string> {
  const to = payment.to.trim();
  const amount = payment.amount.trim();
  const memo = payment.memo?.trim() || undefined;

  if (!to) throw new Error("Missing payment address.");
  if (!POSITIVE_ZEC.test(amount) || Number(amount) <= 0) {
    throw new Error("Enter a valid ZEC amount.");
  }

  const { getNoirWallet } = await loadSdk();
  const wallet = getNoirWallet();
  if (!wallet) throw new Error("Noir Wallet is not available.");

  const existing = await wallet.zcash.getAccounts();
  if (!existing) {
    await wallet.zcash.connect();
  }

  return wallet.zcash.sendTransaction({
    to,
    amount,
    ...(memo ? { memo } : {}),
    fundingSource: "shielded",
  });
}

export async function getNoirShieldedAddress(): Promise<string> {
  const { getNoirWallet } = await loadSdk();
  const wallet = getNoirWallet();
  if (!wallet) throw new Error("Noir Wallet is not available.");

  const existing = await wallet.zcash.getAccounts();
  const connection = existing ?? (await wallet.zcash.connect());
  const shielded = connection.shielded?.trim() || "";
  if (!shielded) {
    throw new Error("Noir Wallet did not return a shielded address.");
  }
  return shielded;
}
