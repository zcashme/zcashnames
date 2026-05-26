"use client";

import { useState, useRef, useCallback } from "react";
import { resolveName } from "@/lib/zns/resolve";
import { normalizeUsername, isValidUsername } from "@/lib/zns/utils";
import { useZns } from "@/components/hooks/useZns";
import type { ResolveName } from "@/lib/types";

//
// Search state machine for the home page name search.
//
// Handles the full lifecycle of a name lookup:
//   1. User types a name → normalised and validated client-side
//   2. Valid name → resolveName() server action is called
//   3. Result is prepended to the results list (most recent first)
//   4. After a purchase, refreshResult() re-resolves that one name
//   5. Dismiss button removes a result from the list
//
// Race condition protection: each search gets a monotonically increasing
// requestId. When a response arrives, we discard it if a newer request
// was already made. This prevents a slow response from overwriting a
// fast one (e.g. typing "al" then "alice" before the first resolves).
//

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
}

export function useSearchState(): UseSearchStateReturn {
  const { zns } = useZns();
  const network = zns.mode === "waitlist" ? "testnet" : zns.mode;
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
  }, [zns.mode]);

  const refreshResult = useCallback(async (name: string) => {
    try {
      const fresh = await resolveName(name, network);
      setResults((prev) =>
        prev.map((item) => (item.query === fresh.query ? fresh : item)),
      );
    } catch {
      // Leave the stale entry in place.
    }
  }, [zns.mode]);

  const removeResult = useCallback((query: string) => {
    setResults((prev) => prev.filter((item) => item.query !== query));
  }, []);

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
  };
}
