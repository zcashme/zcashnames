"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { switchToNetwork } from "@/lib/beta/actions";

export type ZnsMode = "waitlist" | "mainnet" | "testnet";

type ZnsContextValue = {
  zns: { mode: ZnsMode };
  hasBeta: boolean;
  setMode: (m: ZnsMode) => void;
};

export const NetworkContext = createContext<ZnsContextValue>({
  zns: { mode: "waitlist" },
  hasBeta: false,
  setMode: () => {},
});

export function useZns() {
  return useContext(NetworkContext);
}

export function NetworkProvider({
  children,
  initialMode = "waitlist",
  hasBeta = false,
}: {
  children: React.ReactNode;
  initialMode?: ZnsMode;
  hasBeta?: boolean;
}) {
  const [zns, setZns] = useState<{ mode: ZnsMode }>({ mode: initialMode });

  const setMode = useCallback((mode: ZnsMode) => {
    setZns({ mode });
    if (mode !== "waitlist") switchToNetwork(mode);
  }, []);

  return (
    <NetworkContext.Provider value={{ zns, hasBeta, setMode }}>
      {children}
    </NetworkContext.Provider>
  );
}