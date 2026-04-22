"use client";

import { useState, useRef, useCallback } from "react";
import { resolveName } from "@/lib/zns/resolve";
import { normalizeUsername, isValidUsername } from "@/lib/zns/name";
import type { ResolveName } from "@/lib/types";
import type { Network } from "@/lib/zns/name";

interface SearchState {
  input: string;
  results: ResolveName[];
  searching: boolean;
  searchError: string | null;
}

interface UseSearchStateReturn extends SearchState {
  setInput: (value: string) => void;
  handleSearch: (nameValue: string) => Promise<void>;
  refreshResult: (name: string) => Promise<void>;
  removeResult: (query: string) => void;
  reset: () => void;
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
