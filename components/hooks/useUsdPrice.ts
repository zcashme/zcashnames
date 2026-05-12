"use client";

import { useEffect, useState } from "react";
import { getExchangeRate } from "@/lib/exchange-rate";

// Fetches the ZEC→USD exchange rate once on mount. Returns null while loading
// or on fetch failure — consumers handle the null state as "price unavailable."
export function useUsdPrice(): number | null {
  const [usdPerZec, setUsdPerZec] = useState<number | null>(null);

  useEffect(() => {
    getExchangeRate().then(setUsdPerZec).catch(() => {});
  }, []);

  return usdPerZec;
}