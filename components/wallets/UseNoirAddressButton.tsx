"use client";

import { useEffect, useState } from "react";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import {
  detectNoirWallet,
  formatNoirWalletError,
  getNoirShieldedAddress,
  getNoirTransparentAddress,
} from "@/lib/wallets/noir";
import { isValidTransparentAddress, validateAddress } from "@/lib/zns/utils";
import type { Network } from "@/lib/types";

type UseNoirAddressButtonProps = {
  disabled?: boolean;
  kind?: "shielded" | "transparent";
  network?: Network;
  onAddress: (address: string) => void;
};

export default function UseNoirAddressButton({
  disabled = false,
  kind = "shielded",
  network = "mainnet",
  onAddress,
}: UseNoirAddressButtonProps) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void detectNoirWallet().then((found) => {
      if (!cancelled) setAvailable(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  async function handleClick() {
    if (busy || disabled) return;
    setError("");
    setBusy(true);
    try {
      const address =
        kind === "transparent"
          ? await getNoirTransparentAddress()
          : await getNoirShieldedAddress();
      if (kind === "transparent") {
        if (!isValidTransparentAddress(address, network)) {
          throw new Error(
            network === "testnet"
              ? "Noir Wallet did not return a valid testnet transparent address."
              : "Noir Wallet did not return a valid mainnet transparent address.",
          );
        }
      } else {
        const validation = validateAddress(address);
        if (
          validation.status === "invalid" ||
          validation.status === "viewkey" ||
          validation.status === "tex"
        ) {
          throw new Error(validation.warning || "Noir Wallet returned an invalid Zcash address.");
        }
      }
      onAddress(address);
    } catch (err) {
      setError(formatNoirWalletError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || busy}
        aria-busy={busy}
        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-border-muted bg-transparent px-3.5 py-1.5 text-xs font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <img
          src="/wallets/noir/app-icon.png"
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-full object-cover"
        />
        {busy ? (
          <AnimatedLoadingLabel label="Opening Noir" active />
        ) : kind === "transparent" ? (
          "Use Noir payout address"
        ) : (
          "Use Noir address"
        )}
      </button>
      {error ? (
        <p className="text-left text-xs" style={{ color: "var(--accent-red, #e05252)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
