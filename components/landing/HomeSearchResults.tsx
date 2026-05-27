"use client";

import { useState } from "react";
import { useSearchState } from "@/components/hooks/useSearchState";
import { buildCardProps } from "@/lib/zns/utils";
import HomeResultCard from "./HomeResultCard";
import SearchForm from "@/components/search/SearchForm";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import ResumeBanner from "@/components/purchases/ResumeBanner";
import { usePurchaseResume } from "@/components/hooks/usePurchaseResume";
import { resolveName } from "@/lib/zns/resolve";
import type { Action, ResolveName } from "@/lib/types";

const POPULAR_NAMES = new Set([
  "adam", "alex", "alice", "anna", "bob", "chris", "david", "emma", "ethan",
  "jack", "james", "john", "leo", "lucas", "maria", "max", "mike", "noah",
  "olivia", "satoshi",
]);

export default function HomeSearchResults({ network }: { network: "mainnet" | "testnet" }) {
  const { input, results, searching, searchError, setInput, handleSearch, refreshResult, removeResult } = useSearchState();
  const [modalState, setModalState] = useState<{ action: Action; resolveResult: ResolveName } | null>(null);
  const { snapshot, visible, dismiss } = usePurchaseResume();

  const mode = network;

  async function handleResume() {
    if (!snapshot) return;
    // Refetch the latest registration state so the modal opens with truth,
    // not a stale resolveResult from when the user first started the flow.
    const fresh = await resolveName(snapshot.name, snapshot.network);
    setModalState({ action: snapshot.action, resolveResult: fresh });
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
          network={network}
          resolveResult={modalState.resolveResult}
          onClose={() => setModalState(null)}
          onSuccess={() => refreshResult(modalState.resolveResult.query)}
        />
      )}
      {visible && snapshot && (
        <ResumeBanner
          snapshot={snapshot}
          hiddenByFullModal={!!modalState}
          onResume={handleResume}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}
