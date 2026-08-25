"use client";

import { useEffect, useState } from "react";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { detectNoirWallet, formatNoirWalletError, payWithNoir } from "@/lib/wallets/noir";

type PayWithNoirButtonProps = {
  to: string;
  amount: string;
  memo: string;
  onSent?: (txid: string) => void;
};

export default function PayWithNoirButton({
  to,
  amount,
  memo,
  onSent,
}: PayWithNoirButtonProps) {
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
    setError("");
    setBusy(true);
    try {
      const txid = await payWithNoir({ to, amount, memo });
      onSent?.(txid);
    } catch (err) {
      setError(formatNoirWalletError(err));
    } finally {
      setBusy(false);
    }
  }

  const buttonHeight = 46;
  const capRadius = buttonHeight / 2;
  const logoInset = 5;
  const logoSize = buttonHeight - logoInset * 2;
  const punchRadius = logoSize / 2 + 2;
  const punchMask = `radial-gradient(circle ${punchRadius}px at ${capRadius}px 50%, transparent ${punchRadius - 0.5}px, #000 ${punchRadius}px)`;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        aria-busy={busy}
        className="relative isolate inline-flex h-[46px] cursor-pointer items-center whitespace-nowrap rounded-full pr-5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
        style={{
          color: "var(--home-result-primary-fg)",
          paddingLeft: buttonHeight + 10,
        }}
        aria-label="Pay with Noir Wallet"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: "var(--home-result-primary-bg)",
            filter: "drop-shadow(var(--home-result-primary-shadow))",
            WebkitMaskImage: punchMask,
            WebkitMaskRepeat: "no-repeat",
            maskImage: punchMask,
            maskRepeat: "no-repeat",
          }}
        />
        <img
          src="/wallets/noir/app-icon.png"
          alt=""
          width={logoSize}
          height={logoSize}
          className="pointer-events-none absolute top-1/2 rounded-full object-cover"
          style={{
            left: logoInset,
            width: logoSize,
            height: logoSize,
            transform: "translateY(-50%)",
          }}
        />
        <span className="relative z-[1]">
          {busy ? <AnimatedLoadingLabel label="Opening Noir" active /> : "Pay with Noir Wallet"}
        </span>
      </button>
      {error ? (
        <p className="text-center text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
