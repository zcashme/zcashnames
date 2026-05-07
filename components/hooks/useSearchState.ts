"use client";

import { useState, useRef, useCallback } from "react";
import { resolveName } from "@/lib/zns/resolve";
import { normalizeUsername, isValidUsername, formatUsdEquivalent, type Network } from "@/lib/zns/client";
import type { ResolveName, Action, ModalTarget } from "@/lib/types";

export type NameAvailabilityState = "available" | "forsale" | "unavailable" | "reserved" | "blocked";

interface CardProps {
  availabilityState: NameAvailabilityState;
  priceLabel?: string;
  usdLabel?: string;
  firstBucket?: number;
}

interface UseSearchStateReturn {
  // State
  input: string;
  results: ResolveName[];
  searching: boolean;
  searchError: string | null;
  setInput: (value: string) => void;
  // Actions
  handleSearch: (nameValue: string) => Promise<void>;
  refreshResult: (name: string) => Promise<void>;
  removeResult: (query: string) => void;
  reset: () => void;
  // Domain helpers
  buildCardProps: (result: ResolveName) => CardProps;
  getModalTarget: (result: ResolveName, action: Action) => ModalTarget | null;
}

export function useSearchState(network: Network): UseSearchStateReturn {
  const [input, setInputState] = useState("");
  const [results, setResults] = useState<ResolveName[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const setInput = useCallback((value: string) => {
    setInputState(value);
    if (searching || searchError) {
      requestIdRef.current += 1;
      setSearching(false);
      setSearchError(null);
    }
  }, [searching, searchError]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setInputState("");
    setResults([]);
    setSearching(false);
    setSearchError(null);
  }, []);

  const handleSearch = useCallback(async (nameValue: string) => {
    const name = normalizeUsername(nameValue);
    setInputState(name);

    if (!isValidUsername(name)) {
      setSearching(false);
      setSearchError("Use 1-62 characters: lowercase letters and numbers only.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    setSearchError(null);

    try {
      const res = await resolveName(name, network);
      if (requestIdRef.current !== requestId) return;
      setResults((prev) => {
        const withoutCurrent = prev.filter((item) => item.query !== res.query);
        return [res, ...withoutCurrent];
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setSearchError(
        err instanceof Error
          ? err.message
          : "Network error while searching. The indexer may be down.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setSearching(false);
      }
    }
  }, [network]);

  const refreshResult = useCallback(async (name: string) => {
    try {
      const fresh = await resolveName(name, network);
      setResults((prev) =>
        prev.map((item) => (item.query === fresh.query ? fresh : item)),
      );
    } catch {
      // Leave the stale entry in place.
    }
  }, [network]);

  const removeResult = useCallback((query: string) => {
    setResults((prev) => prev.filter((item) => item.query !== query));
  }, []);

  // ── Domain helpers ────────────────────────────────────────────────────────

  function buildCardProps(result: ResolveName): CardProps {
    switch (result.status) {
      case "available":
      case "reserved": {
        const zec = result.claimCost.zec;
        return {
          availabilityState: result.status,
          priceLabel: `~${zec.toFixed(6)} ZEC`,
          usdLabel: formatUsdEquivalent(zec, null),
          firstBucket: result.firstBucket,
        };
      }
      case "listed":
        return {
          availabilityState: "forsale",
          priceLabel: `${result.listingPrice.zec} ZEC`,
          usdLabel: formatUsdEquivalent(result.listingPrice.zec, null),
          firstBucket: result.firstBucket,
        };
      case "registered":
        return {
          availabilityState: "unavailable",
          firstBucket: result.firstBucket,
        };
      case "blocked":
        return { availabilityState: "blocked" };
    }
  }

  function getModalTarget(result: ResolveName, action: Action): ModalTarget | null {
    const hasRegistration = "registration" in result;
    const base = {
      name: result.query,
      network,
      registrationAddress: hasRegistration ? result.registration.address : undefined,
      registrationNonce: hasRegistration ? result.registration.nonce : undefined,
      registrationPubkey: hasRegistration ? result.registration.pubkey : undefined,
    };

    switch (result.status) {
      case "available":
        if (action === "claim") {
          return { ...base, action: "claim" };
        }
        return null;

      case "reserved":
        if (action === "claim") {
          return { ...base, action: "claim", isReserved: true };
        }
        return null;

      case "listed":
        switch (action) {
          case "buy":
            return {
              ...base,
              action: "buy",
              listingPriceZec: result.listingPrice.zec,
            };
          case "delist":
            return { ...base, action: "delist" };
          case "release":
            return { ...base, action: "release" };
          default:
            return null;
        }

      case "registered":
        switch (action) {
          case "update":
            return { ...base, action: "update" };
          case "list":
            return { ...base, action: "list" };
          case "release":
            return { ...base, action: "release" };
          default:
            return null;
        }

      case "blocked":
        return null;
    }
  }

  return {
    input,
    results,
    searching,
    searchError,
    setInput,
    handleSearch,
    refreshResult,
    removeResult,
    reset,
    buildCardProps,
    getModalTarget,
  };
}
