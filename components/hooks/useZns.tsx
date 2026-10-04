"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type ZnsMode = "mainnet" | "testnet";

type ZnsContextValue = {
  zns: { mode: ZnsMode };
  setMode: (m: ZnsMode) => void;
};

export const NetworkContext = createContext<ZnsContextValue>({
  zns: { mode: "testnet" },
  setMode: () => {},
});

export function useZns() {
  return useContext(NetworkContext);
}

export function NetworkProvider({
  children,
  initialMode = "testnet",
}: {
  children: React.ReactNode;
  initialMode?: ZnsMode;
}) {
  const [zns, setZns] = useState<{ mode: ZnsMode }>({ mode: initialMode });

  const setMode = useCallback((mode: ZnsMode) => {
    setZns({ mode });
  }, []);

  return (
    <NetworkContext.Provider value={{ zns, setMode }}>
      {children}
    </NetworkContext.Provider>
  );
}
