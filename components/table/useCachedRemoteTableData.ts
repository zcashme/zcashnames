"use client";

import { useEffect, useRef, useState } from "react";

function writeCachedValue<T>(cache: Map<string, T>, key: string, value: T, cacheLimit: number) {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);

  while (cache.size > cacheLimit) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export default function useCachedRemoteTableData<T>({
  initialCacheKey,
  initialData,
  queryKey,
  cacheLimit,
  enabled = true,
  forceRefreshToken,
  fetchData,
}: {
  initialCacheKey: string;
  initialData: T;
  queryKey: string;
  cacheLimit: number;
  enabled?: boolean;
  forceRefreshToken?: number;
  fetchData: () => Promise<T>;
}) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, T>>(new Map());
  const lastForceRefreshTokenRef = useRef(forceRefreshToken);
  const fetchDataRef = useRef(fetchData);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    writeCachedValue(cacheRef.current, initialCacheKey, initialData, cacheLimit);
    setData(initialData);
    setLoadError(null);
  }, [cacheLimit, initialCacheKey, initialData]);

  useEffect(() => {
    if (!enabled) return;

    const forceRefresh = forceRefreshToken !== lastForceRefreshTokenRef.current;
    lastForceRefreshTokenRef.current = forceRefreshToken;
    const cachedData = forceRefresh ? null : cacheRef.current.get(queryKey);

    if (cachedData) {
      setData(cachedData);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsRefreshing(true);
    setLoadError(null);

    async function refreshData() {
      try {
        const nextData = await fetchDataRef.current();
        if (cancelled) return;
        writeCachedValue(cacheRef.current, queryKey, nextData, cacheLimit);
        setData(nextData);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Failed to refresh table rows.");
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void refreshData();

    return () => {
      cancelled = true;
    };
  }, [cacheLimit, enabled, forceRefreshToken, queryKey]);

  return {
    data,
    isRefreshing,
    loadError,
    setData,
    setLoadError,
  };
}
