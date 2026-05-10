// Search orchestrator: wires useZns (network mode) + useSearchState (input/query/results cache)
// into SearchForm + HomeResultCard list + Zip321Modal for purchase flow.
// Gated to non-waitlist mode; returns null on waitlist.
// NOTE: Not used by the current HomePageClient, which inlines this pattern directly.
"use client";

import { useState } from "react";
import { useZns } from "@/components/hooks/useZns";
import { useSearchState } from "@/components/hooks/useSearchState";
import HomeResultCard from "./HomeResultCard";
import SearchForm from "@/components/search/SearchForm";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import type { Action, ResolveName } from "@/lib/types";

const POPULAR_NAMES = new Set([
  "adam", "alex", "alice", "anna", "bob", "chris", "david", "emma", "ethan",
  "jack", "james", "john", "leo", "lucas", "maria", "max", "mike", "noah",
  "olivia", "satoshi",
]);

export default function HomeSearchResults() {
  const { zns } = useZns();
  if (zns.mode === "waitlist") return null;

  const { input, results, searching, searchError, setInput, handleSearch, refreshResult, removeResult, buildCardProps } = useSearchState();
  const [modalState, setModalState] = useState<{ action: Action; resolveResult: ResolveName } | null>(null);

  return (
    <>
      <SearchForm value={input} onChange={setInput} onSubmit={handleSearch} claimLoading={searching} />
      {results.length > 0 && (
        <div className="mt-4 flex w-full max-w-4xl flex-col gap-3">
          {results.map((item) => {
            const props = buildCardProps(item);
            const displayName = `${item.query}.zcash`;
            const isPopular = POPULAR_NAMES.has(item.query);
            return (
              <HomeResultCard
                key={item.query}
                displayName={displayName}
                network={zns.mode}
                {...props}
                isPopularName={isPopular}
                onAction={(action) => setModalState({ action, resolveResult: item })}
                onDismiss={() => removeResult(item.query)}
              />
            );
          })}
        </div>
      )}
      {searchError && (
        <p className="home-search-error rounded-xl border px-4 py-3 text-sm font-semibold">{searchError}</p>
      )}
      {modalState && (
        <Zip321Modal
          action={modalState.action}
          name={modalState.resolveResult.query}
          network={zns.mode}
          resolveResult={modalState.resolveResult}
          onClose={() => setModalState(null)}
          onSuccess={() => refreshResult(modalState.resolveResult.query)}
        />
      )}
    </>
  );
}