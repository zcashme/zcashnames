"use client";

import { useEffect, useState } from "react";
import PayWithNoirButton from "@/components/verify/PayWithNoirButton";
import RebateAvailableToggle from "@/components/verify/RebateAvailableToggle";
import { detectNoirWallet } from "@/lib/wallets/noir";
import { truncateUnifiedAddress } from "@/lib/waitlist/rebate-address";

type NoirReservePaymentActionsProps = {
  to: string;
  amount: string;
  memo: string;
  name: string;
  paymentAddress: string;
  verifyToken: string;
  rowId: string;
  rebateEnabled: boolean;
  rebateUnifiedAddress: string | null;
  onRebateEnabled: (unifiedAddress: string) => void;
  onRebateDisabled: () => void;
  onSent: (txid: string) => void;
};

export default function NoirReservePaymentActions({
  to,
  amount,
  memo,
  name,
  paymentAddress,
  verifyToken,
  rowId,
  rebateEnabled,
  rebateUnifiedAddress,
  onRebateEnabled,
  onRebateDisabled,
  onSent,
}: NoirReservePaymentActionsProps) {
  const [available, setAvailable] = useState(false);
  const [payError, setPayError] = useState("");

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

  return (
    <div className="flex w-full flex-col items-center">
      <div className="inline-flex max-w-full flex-col items-stretch">
        <div
          className="inline-flex items-stretch overflow-hidden rounded-full"
          style={{ boxShadow: "var(--home-result-primary-shadow)" }}
        >
          <PayWithNoirButton
            to={to}
            amount={amount}
            memo={memo}
            forceVisible
            joined
            onSent={onSent}
            onError={setPayError}
          />
          <RebateAvailableToggle
            enabled={rebateEnabled}
            savedAddress={rebateUnifiedAddress}
            name={name}
            paymentAddress={paymentAddress}
            verifyToken={verifyToken}
            rowId={rowId}
            onEnabled={onRebateEnabled}
            onDisabled={onRebateDisabled}
          />
        </div>
        {rebateEnabled && rebateUnifiedAddress ? (
          <p
            className="mt-1.5 w-0 min-w-full text-center text-xs break-words"
            style={{ color: "var(--fg-muted)" }}
          >
            Rebate address {truncateUnifiedAddress(rebateUnifiedAddress)}
          </p>
        ) : null}
        {payError ? (
          <p
            className="mt-1.5 w-0 min-w-full text-center text-sm break-words"
            style={{ color: "var(--accent-red, #e05252)" }}
          >
            {payError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
