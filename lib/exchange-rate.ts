"use server";

const CACHE_TTL_MS = 60_000;

const providers = [
  { url: "https://api.coinbase.com/v2/prices/ZEC-USD/spot", parse: parseCoinbase },
  { url: "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd", parse: parseCoingecko },
  { url: "https://api.kraken.com/0/public/Ticker?pair=ZECUSD", parse: parseKraken },
];

function toPositiveFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCoinbase(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const amount = (payload as { data?: { amount?: unknown } }).data?.amount;
  return toPositiveFiniteNumber(amount);
}

function parseCoingecko(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const usd = (payload as { zcash?: { usd?: unknown } }).zcash?.usd;
  return toPositiveFiniteNumber(usd);
}

function parseKraken(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const result = (
    payload as { result?: Record<string, { c?: unknown[] }> }
  ).result;
  if (!result || typeof result !== "object") return null;
  const firstPair = Object.values(result)[0];
  if (!firstPair || !Array.isArray(firstPair.c) || firstPair.c.length === 0)
    return null;
  return toPositiveFiniteNumber(firstPair.c[0]);
}

let cached: { rate: number; expires: number } | null = null;
let inFlight: Promise<number | null> | null = null;

async function fetchFreshRate(): Promise<number | null> {
  try {
    const rate = await Promise.any(
      providers.map(async ({ url, parse }) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const rate = parse(await res.json());
        if (!rate) throw new Error("parse failed");
        return rate;
      }),
    );
    return rate;
  } catch {
    return null;
  }
}

export async function getExchangeRate(): Promise<number | null> {
  if (cached && Date.now() < cached.expires) return cached.rate;

  if (inFlight) return inFlight;

  inFlight = fetchFreshRate().then((rate) => {
    if (rate) cached = { rate, expires: Date.now() + CACHE_TTL_MS };
    inFlight = null;
    return rate;
  });

  return inFlight;
}