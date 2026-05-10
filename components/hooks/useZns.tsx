"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { switchToNetwork, clearStageCookie } from "@/lib/beta/actions";

export type ZnsMode = "waitlist" | "mainnet" | "testnet";

type ZnsContextValue = {
  zns: { mode: ZnsMode };
  setMode: (m: ZnsMode) => void;
};

export const NetworkContext = createContext<ZnsContextValue>({
  zns: { mode: "waitlist" },
  setMode: () => {},
});

export function useZns() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [zns, setZns] = useState<{ mode: ZnsMode }>({ mode: "waitlist" });

  const setMode = useCallback((mode: ZnsMode) => {
    setZns({ mode });
    if (mode === "waitlist") clearStageCookie();
    else switchToNetwork(mode);
  }, []);

  return (
    <NetworkContext.Provider value={{ zns, setMode }}>
      {children}
    </NetworkContext.Provider>
  );
}