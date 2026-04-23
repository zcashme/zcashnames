"use client";

import { useEffect, useState } from "react";
import { getExchangeRate } from "@/lib/exchange-rate";

export function useUsdPrice(): number | null {
  const [usdPerZec, setUsdPerZec] = useState<number | null>(null);

  useEffect(() => {
    getExchangeRate().then(setUsdPerZec).catch(() => {});
  }, []);

  return usdPerZec;
}