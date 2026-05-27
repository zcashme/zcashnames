"use client";

import { useState } from "react";
import { useSearchState } from "@/components/hooks/useSearchState";
import { buildCardProps } from "@/lib/zns/utils";
import HomeResultCard from "./HomeResultCard";
import SearchForm from "@/components/search/SearchForm";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import ResumeReplacementDialog from "@/components/purchases/ResumeReplacementDialog";
import { getResumeToReplace } from "@/lib/purchases/resume";
import type { ResumeSnapshot } from "@/lib/purchases/resume";
import type { Action, ResolveName } from "@/lib/types";

const POPULAR_NAMES = new Set([
  "adam", "alex", "alice", "anna", "bob", "chris", "david", "emma", "ethan",
  "jack", "james", "john", "leo", "lucas", "maria", "max", "mike", "noah",
  "olivia", "satoshi",
]);

export default function HomeSearchResults({ network }: { network: "mainnet" | "testnet" }) {
  const { input, results, searching, searchError, setInput, handleSearch, refreshResult, removeResult } = useSearchState();
  const [modalState, setModalState] = useState<{ action: Action; resolveResult: ResolveName } | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<{
    action: Action;
    resolveResult: ResolveName;
    existing: ResumeSnapshot;
  } | null>(null);

  const mode = network;

  function handleAction(action: Action, resolveResult: ResolveName) {
    const existing = getResumeToReplace({ action, name: resolveResult.query, network });
    if (existing) {
      setPendingReplacement({ action, resolveResult, existing });
      return;
    }
    setModalState({ action, resolveResult });
  }

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
                network={mode}
                {...props}
                isPopularName={isPopular}
                onAction={(action) => handleAction(action, item)}
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
          network={network}
          resolveResult={modalState.resolveResult}
          onClose={() => setModalState(null)}
          onSuccess={() => refreshResult(modalState.resolveResult.query)}
        />
      )}
      {pendingReplacement && (
        <ResumeReplacementDialog
          existing={pendingReplacement.existing}
          onCancel={() => setPendingReplacement(null)}
          onContinue={() => {
            setModalState({ action: pendingReplacement.action, resolveResult: pendingReplacement.resolveResult });
            setPendingReplacement(null);
          }}
        />
      )}
    </>
  );
}
