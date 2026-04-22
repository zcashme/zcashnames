"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsdPerZec as fetchUsdPerZec } from "@/lib/zns/resolve";

export function useUsdPrice(): number | null {
  const [usdPerZec, setUsdPerZec] = useState<number | null>(null);

  useEffect(() => {
    fetchUsdPerZec().then(setUsdPerZec).catch(() => {
      // Silently fail - USD price is non-critical
    });
  }, []);

  return usdPerZec;
}
