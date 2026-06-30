"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { switchToNetwork } from "@/lib/beta/actions";

export type NetworkMode = "mainnet" | "testnet";

type ZnsContextValue = {
  zns: { mode: NetworkMode };
  hasBeta: boolean;
  setMode: (m: NetworkMode) => void;
};

export const NetworkContext = createContext<ZnsContextValue>({
  zns: { mode: "mainnet" },
  hasBeta: false,
  setMode: () => {},
});

export function useZns() {
  return useContext(NetworkContext);
}

export function NetworkProvider({
  children,
  initialMode = "mainnet",
  hasBeta = false,
}: {
  children: React.ReactNode;
  initialMode?: NetworkMode;
  hasBeta?: boolean;
}) {
  const [zns, setZns] = useState<{ mode: NetworkMode }>({ mode: initialMode });

  const setMode = useCallback((mode: NetworkMode) => {
    setZns({ mode });
    switchToNetwork(mode);
  }, []);

  return (
    <NetworkContext.Provider value={{ zns, hasBeta, setMode }}>
      {children}
    </NetworkContext.Provider>
  );
}
