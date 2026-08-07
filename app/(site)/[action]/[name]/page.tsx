import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import NameActionForm from "@/components/purchases/NameActionForm";
import { NameStatusBadge } from "@/components/NameStatus";
import { ACTION_LABELS } from "@/lib/types";
import type { Action, NameAvailabilityState, Network, ResolveName } from "@/lib/types";
import { resolveName } from "@/lib/zns/resolve";
import { normalizeUsername, isValidUsername } from "@/lib/zns/utils";
import { isPopularName } from "@/lib/zns/popular-names";
import {
  explorerNameHref,
  isActionAllowed,
  parseNetworkParam,
  slugToAction,
} from "@/lib/purchases/nameActionHref";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ action: string; name: string }>;
  searchParams?: Promise<{ network?: string }>;
};

function toAvailabilityState(result: ResolveName): NameAvailabilityState {
  if (result.status === "available") return "available";
  if (result.status === "listed") return "forsale";
  if (result.status === "registered") return "unavailable";
  if (result.status === "protected") return "protected";
  return "blocked";
}

function priceZecFor(result: ResolveName): number | null {
  if (result.status === "available" || result.status === "protected") {
    return result.claimCost.zec;
  }
  if (result.status === "listed") {
    return result.listingPrice.zec;
  }
  return null;
}

/** Mirrors NameStatus.statusSupportsPrice without importing the client module. */
function statusSupportsPrice(status: NameAvailabilityState): boolean {
  return status === "available" || status === "forsale" || status === "protected";
}

/**
 * Feature chips for the action-page status row / hero.
 * Available / for-sale mirror the home search result card; protected names
 * (zn_protected_names status=protected) also get a Protected chip.
 */
function featureChipsFor(
  availability: NameAvailabilityState,
  name: string,
): string[] {
  const charLabel = `${name.length} characters`;
  const popular = isPopularName(name);
  const chips: string[] = [];

  if (availability === "available") {
    chips.push(charLabel, "No previous owners");
    if (popular) chips.push("Popular name");
  } else if (availability === "forsale") {
    chips.push(charLabel);
    if (popular) chips.push("Popular name");
  } else if (availability === "protected") {
    // Claimable protected names: available-style chips + Protected
    chips.push(charLabel, "No previous owners");
    if (popular) chips.push("Popular name");
    chips.push("Protected");
  }

  return chips;
}

function FeatureChips({
  chips,
  placement,
}: {
  chips: string[];
  placement: "inline" | "hero";
}) {
  if (chips.length === 0) return null;
  return (
    <div className={`name-action-chips name-action-chips--${placement}`}>
      {chips.map((chip) => (
        <span key={`${placement}-${chip}`} className="home-result-trust-pill">
          {chip}
        </span>
      ))}
    </div>
  );
}

function heroCopy(action: Action): string {
  switch (action) {
    case "CLAIM":
      return "Register this name to your Zcash address.";
    case "BUY":
      return "Purchase a listed name.";
    case "UPDATE":
      return "Point this name at a new unified address.";
    case "LIST":
      return "List this name for sale.";
    case "DELIST":
      return "Remove this name from the marketplace.";
    case "RELEASE":
      return "Relinquish ownership so others can claim this name.";
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { action: actionSlug, name: rawName } = await params;
  const action = slugToAction(actionSlug);
  if (!action) return { title: "Name Action - Zcash Names" };
  const name = normalizeUsername(decodeURIComponent(rawName));
  return {
    title: `${ACTION_LABELS[action]} ${name} - Zcash Names`,
    description: heroCopy(action),
    robots: { index: false, follow: false },
  };
}

export default async function NameActionPage({ params, searchParams }: PageProps) {
  const { action: actionSlug, name: rawName } = await params;
  const sp = (await searchParams) ?? {};
  const action = slugToAction(actionSlug);
  if (!action) notFound();

  const name = normalizeUsername(decodeURIComponent(rawName));
  if (!isValidUsername(name)) notFound();

  const network: Network = parseNetworkParam(sp.network);
  const resolveResult = await resolveName(name, network);
  const gate = isActionAllowed(action, resolveResult, network);
  const backHref = explorerNameHref(name, network);
  const title = `${ACTION_LABELS[action]} ${name}`;
  const availability = toAvailabilityState(resolveResult);
  const priceZec = priceZecFor(resolveResult);
  const showPrice = statusSupportsPrice(availability) && priceZec != null;
  const featureChips = featureChipsFor(availability, name);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title={title} href={`/${actionSlug}/${encodeURIComponent(name)}`} />

      <div className="name-action-column mx-auto w-full max-w-2xl">
        <div className="name-action-status-row mb-4">
          <div className="name-action-status-left flex min-w-0 flex-wrap items-center gap-2.5">
            <NameStatusBadge status={availability} />
            {showPrice ? (
              <p className="m-0 text-[var(--home-result-price-color)] text-[clamp(1.02rem,1.85vw,1.3rem)] font-extrabold tracking-[-0.012em]">
                {priceZec} ZEC
              </p>
            ) : null}
          </div>
          <FeatureChips chips={featureChips} placement="inline" />
        </div>

        <section
          className="w-full rounded-t-2xl border border-b-0 px-6 py-8 sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <div className="grid gap-4">
            <FeatureChips chips={featureChips} placement="hero" />
            <h1 className="text-center text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl">
              <span className="action-hero-name">{name}</span>
            </h1>
            <p
              className="mx-auto max-w-3xl text-center text-base leading-8 sm:text-lg"
              style={{ color: "var(--fg-body)" }}
            >
              {heroCopy(action)}
            </p>
          </div>
        </section>

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-[-1rem] z-10 block h-8 w-px"
            style={{ background: "var(--faq-border)" }}
          />
          {gate.ok ? (
            <NameActionForm
              action={action}
              name={name}
              network={network}
              resolveResult={resolveResult}
              returnHref={backHref}
            />
          ) : (
            <div
              className="w-full rounded-2xl border px-5 py-8 sm:px-6 sm:py-10 text-center"
              style={{
                borderColor: "var(--faq-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
                boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              }}
            >
              <h2
                className="text-lg font-bold"
                style={{ color: "var(--fg-heading)" }}
              >
                Action unavailable
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--fg-body)" }}>
                {gate.reason}
              </p>
              {gate.link ? (
                <p className="mt-2 text-sm" style={{ color: "var(--fg-body)" }}>
                  {gate.link.prefix ?? ""}
                  <Link
                    href={gate.link.href}
                    className="font-semibold underline underline-offset-2"
                    style={{ color: "var(--fg-heading)" }}
                  >
                    {gate.link.label}
                  </Link>
                  {gate.link.suffix ?? ""}
                </p>
              ) : null}
              <Link
                href={backHref}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                View on Explorer
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
