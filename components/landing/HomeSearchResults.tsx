"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchState } from "@/components/hooks/useSearchState";
import { buildCardProps } from "@/lib/zns/utils";
import HomeResultCard from "./HomeResultCard";
import SearchForm from "@/components/search/SearchForm";
import ResumeReplacementDialog from "@/components/purchases/ResumeReplacementDialog";
import { getResumeToReplace, clearResume } from "@/lib/purchases/resume";
import { nameActionHref } from "@/lib/purchases/nameActionHref";
import type { ResumeSnapshot } from "@/lib/purchases/resume";
import type { Action, ResolveName } from "@/lib/types";
import { isPopularName } from "@/lib/zns/popular-names";

export default function HomeSearchResults({ network }: { network: "mainnet" | "testnet" }) {
  const router = useRouter();
  const { input, results, searching, searchError, setInput, handleSearch, removeResult } = useSearchState();
  const [pendingReplacement, setPendingReplacement] = useState<{
    action: Action;
    resolveResult: ResolveName;
    existing: ResumeSnapshot;
  } | null>(null);

  const mode = network;

  function goToAction(action: Action, resolveResult: ResolveName) {
    router.push(nameActionHref(action, resolveResult.query, network));
  }

  function handleAction(action: Action, resolveResult: ResolveName) {
    const existing = getResumeToReplace({ action, name: resolveResult.query, network });
    if (existing) {
      setPendingReplacement({ action, resolveResult, existing });
      return;
    }
    goToAction(action, resolveResult);
  }

  return (
    <>
      <SearchForm value={input} onChange={setInput} onSubmit={handleSearch} claimLoading={searching} />
      {results.length > 0 && (
        <div className="mt-4 flex w-full max-w-4xl flex-col gap-3">
          {results.map((item) => {
            const props = buildCardProps(item);
            const displayName = `${item.query}.zcash`;
            const isPopular = isPopularName(item.query);
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
      {pendingReplacement && (
        <ResumeReplacementDialog
          existing={pendingReplacement.existing}
          onCancel={() => setPendingReplacement(null)}
          onContinue={() => {
            clearResume();
            goToAction(pendingReplacement.action, pendingReplacement.resolveResult);
            setPendingReplacement(null);
          }}
        />
      )}
    </>
  );
}
