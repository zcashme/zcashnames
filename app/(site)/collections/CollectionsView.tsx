/**
 * CollectionsView — client orchestrator for the collections page.
 *
 * The names you're collecting live in the URL (?names=) so a collection is a
 * shareable link, resolved server-side into one graph. ?focus= picks the name
 * whose full detail panel shows (reusing the explorer's ExplorerNameDetail);
 * tapping a node in the graph just changes the focus, in place.
 *
 * Empty state is a full hero (headline + a single search pill); once there are
 * results it collapses to a compact header so the graph gets the room. Network
 * is inherited from the shared stage cookie (set on the home page).
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ExplorerNameDetail from "@/app/(site)/explorer/ExplorerNameDetail";
import { useUsdPrice } from "@/components/hooks/useUsdPrice";
import CollectionGraph from "./CollectionGraph";
import { encodeNames, decodeNames } from "./codec";
import { normalizeUsername, isValidUsername, validateAddress } from "@/lib/zns/utils";
import type { Collection } from "@/lib/zns/collection";
import type { Network, ResolveName, ZnsEvent, Action } from "@/lib/types";

// A seed is valid if it's a registrable name or a unified address.
function isValidSeed(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (validateAddress(t).status === "unified") return true;
  return isValidUsername(normalizeUsername(t));
}

export default function CollectionsView({
  network,
  collection,
  focused,
  nameResult,
  nameEvents,
}: {
  network: Network;
  collection: Collection;
  focused: string | null;
  nameResult: ResolveName | null;
  nameEvents: ZnsEvent[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const usdPerZec = useUsdPrice();
  const [isPending, startTransition] = useTransition();

  const urlNames = decodeNames(searchParams.get("c"));
  const [input, setInput] = useState("");
  // On the rendered collection, the add control starts collapsed and expands
  // into the search bar on click (and stays open). The hero is always open.
  const [addOpen, setAddOpen] = useState(false);

  // The name list rides in one base64url ?c= token; focus stays a plain param.
  function urlFor(names: string[], focus?: string | null) {
    const parts: string[] = [];
    const token = encodeNames(names);
    if (token) parts.push(`c=${token}`);
    if (focus) parts.push(`focus=${encodeURIComponent(focus)}`);
    return parts.length > 0 ? `/collections?${parts.join("&")}` : "/collections";
  }

  function addSeed(raw: string) {
    const t = raw.trim();
    if (!isValidSeed(t)) return;
    const key = t.toLowerCase();
    const focus = validateAddress(t).status === "unified" ? undefined : normalizeUsername(t);
    const next = urlNames.some((s) => s.toLowerCase() === key) ? urlNames : [...urlNames, t];
    startTransition(() => router.push(urlFor(next, focus)));
    setInput("");
  }

  function removeSeed(seed: string) {
    const key = seed.toLowerCase();
    startTransition(() => router.push(urlFor(urlNames.filter((s) => s.toLowerCase() !== key))));
  }

  // A node tap focuses that name (in place) — the detail panel above follows.
  function focusName(name: string) {
    startTransition(() => router.push(urlFor(urlNames, name)));
  }

  // Detail-panel actions (list/update/buy) hand off to the explorer, where the
  // Zip321Modal flow already lives — Collections triggers, never reimplements.
  function openInExplorer(action: Action) {
    if (!focused) return;
    const params = new URLSearchParams({ name: focused });
    if (network !== "mainnet") params.set("env", network);
    router.push(`/explorer?${params.toString()}#${action.toLowerCase()}`);
  }

  const badSeeds = collection.seeds.filter((s) => s.status !== "found");
  const isEmpty = urlNames.length === 0;

  // The expanded search pill. `autoFocus` is used when it's revealed by the
  // collapsed Add button on the rendered collection, so the cursor lands ready.
  const renderPill = (autoFocus: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addSeed(input);
      }}
      className="flex w-full items-center gap-2 rounded-full border p-1.5 pl-4"
      style={{
        background: "var(--color-raised)",
        borderColor: "var(--leaders-card-border)",
        boxShadow: "0 12px 34px rgba(0,0,0,0.14)",
      }}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional: revealed on user click
        autoFocus={autoFocus}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search a name or address"
        aria-label="Add a name or address"
        className="min-w-0 flex-1 bg-transparent py-2 text-[0.98rem] outline-none placeholder:text-fg-dim"
        style={{ color: "var(--fg-heading)" }}
      />
      <button type="submit" disabled={!isValidSeed(input)} className="home-result-action is-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-40">
        Add
      </button>
    </form>
  );

  return (
    <div className="flex flex-col">
      <SiteRouteTitle title="Collections" />

      {isEmpty ? (
        /* ── Hero ─────────────────────────────────────────────────────────── */
        <div className="relative flex flex-col items-center gap-7 px-2 pt-[11vh] text-center sm:pt-[14vh]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
            style={{ background: "var(--hero-headline-accent)" }}
          />
          <h1
            className="font-bold"
            style={{ fontSize: "clamp(2.5rem, 5vw + 0.5rem, 5rem)", letterSpacing: "-0.02em", lineHeight: 0.98 }}
          >
            <span className="hero-headline-primary">Every name </span>
            <span className="hero-headline-accent">you own.</span>
          </h1>
          <div className="w-full max-w-xl">{renderPill(false)}</div>
        </div>
      ) : (
        /* ── Results ──────────────────────────────────────────────────────── */
        <div className={`flex flex-col gap-6 pt-2 transition-opacity ${isPending ? "opacity-60" : ""}`}>
          <div className="flex flex-col gap-4">
            <h1 className="font-bold" style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)", letterSpacing: "-0.02em" }}>
              <span className="hero-headline-primary">Your </span>
              <span className="hero-headline-accent">collection</span>
            </h1>
            <div className="max-w-xl">
              {addOpen ? (
                renderPill(true)
              ) : (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.85rem] font-semibold text-fg-heading transition-colors hover:opacity-80"
                  style={{
                    background: "var(--color-raised)",
                    borderColor: "var(--leaders-card-border)",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Add a name
                </button>
              )}
            </div>
          </div>

          {/* Active names */}
          <div className="flex flex-wrap items-center gap-2">
            {urlNames.map((seed) => (
              <span
                key={seed}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.78rem] font-semibold text-fg-heading"
                style={{ borderColor: "var(--leaders-card-border)", background: "var(--color-raised)" }}
              >
                <span className="max-w-[12rem] truncate">{seed}</span>
                <button
                  type="button"
                  onClick={() => removeSeed(seed)}
                  className="cursor-pointer text-fg-muted transition-colors hover:text-fg-heading"
                  aria-label={`Remove ${seed}`}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          {/* Names that didn't resolve */}
          {badSeeds.length > 0 && (
            <div className="flex flex-col gap-1 text-[0.78rem] text-fg-muted">
              {badSeeds.map((s) => (
                <p key={s.seed}>
                  <span className="font-mono font-semibold">{s.seed}</span>{" "}
                  {s.status === "unregistered" && "— valid name, not registered yet."}
                  {s.status === "empty" && "— no names point at this address."}
                  {s.status === "invalid" && "— not a valid name or unified address."}
                </p>
              ))}
            </div>
          )}

          {/* The graph — every collected name on one canvas */}
          {collection.clusters.length > 0 && (
            <CollectionGraph clusters={collection.clusters} focused={focused} onNameClick={focusName} />
          )}

          {/* Focused name detail (reuses the explorer's panel) */}
          {nameResult && focused && (
            <ExplorerNameDetail
              query={focused}
              result={nameResult}
              events={nameEvents}
              isPending={isPending && !nameResult}
              usdPerZec={usdPerZec}
              onAction={openInExplorer}
            />
          )}

        </div>
      )}
    </div>
  );
}
