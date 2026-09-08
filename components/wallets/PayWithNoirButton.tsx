"use client";

import { useEffect, useState } from "react";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { detectNoirWallet, formatNoirWalletError, payWithNoir } from "@/lib/wallets/noir";

type PayWithNoirButtonProps = {
  to: string;
  amount: string;
  memo?: string;
  forceVisible?: boolean;
  joined?: boolean;
  onSent?: (txid: string, startedAt: number) => void;
  onError?: (message: string) => void;
};

export default function PayWithNoirButton({
  to,
  amount,
  memo,
  forceVisible = false,
  joined = false,
  onSent,
  onError,
}: PayWithNoirButtonProps) {
  const [available, setAvailable] = useState(forceVisible);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (forceVisible) return;
    let cancelled = false;
    void detectNoirWallet().then((found) => {
      if (!cancelled) setAvailable(found);
    });
    return () => {
      cancelled = true;
    };
  }, [forceVisible]);

  if (!available) return null;

  async function handleClick() {
    if (busy || sent) return;
    setError("");
    onError?.("");
    setBusy(true);
    const startedAt = Date.now();
    try {
      const txid = await payWithNoir({ to, amount, memo });
      setSent(true);
      onSent?.(txid, startedAt);
    } catch (err) {
      const message = formatNoirWalletError(err);
      setError(message);
      onError?.(message);
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
  const radiusClass = joined ? "rounded-none" : "rounded-full";

  const button = (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy || sent}
      aria-busy={busy}
      className={`relative isolate inline-flex h-[46px] cursor-pointer items-center whitespace-nowrap pr-5 text-sm font-semibold transition-[filter,transform] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100 ${radiusClass} ${
        joined ? "" : "hover:-translate-y-0.5 disabled:hover:translate-y-0"
      }`}
      style={{
        color: "var(--home-result-primary-fg)",
        paddingLeft: buttonHeight + 10,
      }}
      aria-label="Pay with Noir Wallet"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${radiusClass}`}
        style={{
          background: "var(--home-result-primary-bg)",
          filter: joined ? undefined : "drop-shadow(var(--home-result-primary-shadow))",
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
        {busy ? (
          <AnimatedLoadingLabel label="Opening Noir" active />
        ) : sent ? (
          "Sent with Noir Wallet"
        ) : (
          "Pay with Noir Wallet"
        )}
      </span>
    </button>
  );

  if (joined) return button;

  return (
    <div className="flex w-fit max-w-full flex-col items-center gap-2">
      {button}
      {error ? (
        <p
          className="w-0 min-w-full break-words text-center text-sm"
          style={{ color: "var(--accent-red, #e05252)" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
