import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { createEnsOutreachBatch, getLatestEnsOutreachBatch, updateEnsOutreachItem } from "./store";
import { ensOutreachDraft, type EnsOutreachBatch, type EnsOutreachItem } from "./types";

const X_API_BASE = "https://api.x.com/2";
const MAX_X_PAGES = 32;
const ASSET_BUCKET = "ens-outreach-assets";

type ProtectedRow = { name: string; normalized_name: string; reason: string | null; evidence: unknown };
type XTweet = { id: string; text: string; created_at?: string };

function required(name: string): string { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing required environment variable: ${name}.`); return value; }
function siteUrl() { return "https://zcashnames.com"; }
function percentEncode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`); }
function oauthHeader(url: string) {
  const apiKey = required("X_API_KEY"); const apiSecret = required("X_API_SECRET"); const accessToken = required("X_ACCESS_TOKEN"); const accessTokenSecret = required("X_ACCESS_TOKEN_SECRET");
  const oauth: Record<string, string> = { oauth_consumer_key: apiKey, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_token: accessToken, oauth_version: "1.0" };
  const query = new URL(url).searchParams;
  const params = [...query.entries(), ...Object.entries(oauth)].map(([key, value]) => [percentEncode(key), percentEncode(value)] as const).sort(([a, av], [b, bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  oauth.oauth_signature = createHmac("sha1", `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`).update(`GET&${percentEncode(url.split("?")[0])}&${percentEncode(params)}`).digest("base64");
  return `OAuth ${Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`).join(", ")}`;
}
async function xGet(url: string) {
  const response = await fetch(url, { headers: { Authorization: process.env.X_READ_BEARER_TOKEN?.trim() ? `Bearer ${process.env.X_READ_BEARER_TOKEN.trim()}` : oauthHeader(url) }, cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const fallback = response.status === 401 || response.status === 403 ? " Configure X_READ_BEARER_TOKEN with a read-capable X developer token if the existing OAuth credentials lack read access." : "";
    throw new Error(`X read request failed (${response.status}): ${detail.slice(0, 240)}.${fallback}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}
function parseCandidate(row: ProtectedRow) {
  const reason = row.reason ?? "";
  const followerMatch = /@([A-Za-z0-9_]{1,15})\s+has\s+([\d,]+)\s+followers/i.exec(reason);
  const evidenceText = Array.isArray(row.evidence) ? row.evidence.join(" ") : typeof row.evidence === "string" ? row.evidence : JSON.stringify(row.evidence ?? "");
  const urlMatch = /https?:\/\/(?:www\.)?x\.com\/([A-Za-z0-9_]{1,15})/i.exec(evidenceText);
  const xUsername = followerMatch?.[1] ?? urlMatch?.[1];
  const followerCount = followerMatch ? Number(followerMatch[2].replace(/,/g, "")) : NaN;
  return xUsername && Number.isFinite(followerCount) ? { name: row.name, normalizedName: row.normalized_name, xUsername, followerCount, sourceReason: reason, sourceEvidence: evidenceText } : null;
}
export async function createOrLoadEnsOutreachBatch(force = false): Promise<EnsOutreachBatch> {
  if (!force) { const existing = await getLatestEnsOutreachBatch(); if (existing) return existing; }
  const { data, error } = await db.from("zn_protected_names").select("name, normalized_name, reason, evidence").eq("ens_priority_claim", true);
  if (error) throw new Error(`Unable to read zn_protected_names: ${error.message}`);
  const candidates = ((data ?? []) as ProtectedRow[]).map(parseCandidate).filter((item): item is NonNullable<typeof item> => !!item).sort((a, b) => a.followerCount - b.followerCount || a.name.localeCompare(b.name));
  return createEnsOutreachBatch(candidates.map((item, queueOrder) => {
    const protectedUrl = `${siteUrl()}/protected?search=${encodeURIComponent(item.name)}&searchMode=exact&details=1`;
    return { queueOrder, ...item, protectedUrl, draftText: ensOutreachDraft(item.xUsername, item.name, protectedUrl), lookupStatus: "pending" };
  }));
}
async function findLatestZcashTweet(username: string): Promise<XTweet | null> {
  const userPayload = await xGet(`${X_API_BASE}/users/by/username/${encodeURIComponent(username)}`);
  const userId = (userPayload.data as { id?: string } | undefined)?.id;
  if (!userId) return null;
  let paginationToken: string | undefined;
  for (let page = 0; page < MAX_X_PAGES; page += 1) {
    const params = new URLSearchParams({ max_results: "100", "tweet.fields": "created_at" });
    if (paginationToken) params.set("pagination_token", paginationToken);
    const payload = await xGet(`${X_API_BASE}/users/${userId}/tweets?${params}`);
    const tweets = (payload.data ?? []) as XTweet[];
    const match = tweets.find((tweet) => /\b(?:zcash|zec|privacy|zkp)\b/i.test(tweet.text));
    if (match) return match;
    paginationToken = (payload.meta as { next_token?: string } | undefined)?.next_token;
    if (!paginationToken) break;
  }
  return null;
}
async function captureStaticImage(item: EnsOutreachItem) {
  const root = path.resolve(process.env.ENS_OUTREACH_OUTPUT_DIR?.trim() || "output/ens-outreach");
  const scratch = path.join(root, item.id);
  await mkdir(scratch, { recursive: true });
  // Loading Playwright only when an image is requested keeps normal dev startup lightweight.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1080, height: 1080 } });
    const page = await context.newPage();
    await page.goto(item.protectedUrl, { waitUntil: "networkidle", timeout: 30_000 });
    const selector = process.env.ENS_OUTREACH_MODAL_SELECTOR?.trim() || '[role="dialog"], [aria-modal="true"]';
    const modal = page.locator(selector).first();
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    const assetPath = path.join(scratch, "popup.png");
    const box = await modal.boundingBox();
    if (!box) throw new Error("Protected-name modal has no measurable bounds.");
    // Keep the social asset square while giving the popup a deliberate, tight frame.
    const viewport = page.viewportSize();
    // Match the protected-page framing: the modal fills about 60% of a square image,
    // leaving enough blurred context to retain the page heading behind it.
    const side = Math.min(viewport?.width ?? 1080, viewport?.height ?? 1080, Math.ceil(Math.max(box.width, box.height) * 1.65));
    const x = Math.max(0, Math.min((viewport?.width ?? 1080) - side, Math.round(box.x + box.width / 2 - side / 2)));
    const y = Math.max(0, Math.min((viewport?.height ?? 1080) - side, Math.round(box.y + box.height / 2 - side / 2)));
    await page.screenshot({ path: assetPath, clip: { x, y, width: side, height: side } });
    await context.close();
    const asset = await readFile(assetPath);
    const base = `${item.batchId}/${item.id}`;
    const objectPath = `${base}/popup.png`;
    const { error } = await db.storage.from(ASSET_BUCKET).upload(objectPath, asset, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`Asset upload failed: ${error.message}`);
    return db.storage.from(ASSET_BUCKET).getPublicUrl(objectPath).data.publicUrl;
  } finally { await browser.close().catch(() => {}); await rm(scratch, { recursive: true, force: true }).catch(() => {}); }
}
export async function prepareEnsOutreachItems(batchId: string, limit = 5): Promise<EnsOutreachBatch> {
  const batch = await getLatestEnsOutreachBatch();
  if (!batch || batch.id !== batchId) throw new Error("Outreach batch not found.");
  const pending = batch.items.filter((item) => item.status === "pending" || item.status === "failed").slice(0, Math.max(1, Math.min(limit, 10)));
  for (const item of pending) {
    try {
      await updateEnsOutreachItem(item.id, { status: "preparing", error: null });
      const tweet = await findLatestZcashTweet(item.xUsername);
      const lookup = tweet ? { lookup_status: "matched", target_tweet_id: tweet.id, target_tweet_url: `https://x.com/${item.xUsername}/status/${tweet.id}`, target_tweet_text: tweet.text } : { lookup_status: "no_match", target_tweet_id: null, target_tweet_url: null, target_tweet_text: null };
      await updateEnsOutreachItem(item.id, { ...lookup, status: tweet ? "ready" : "no_match", error: null });
    } catch (error) { await updateEnsOutreachItem(item.id, { status: "failed", lookup_status: "failed", error: error instanceof Error ? error.message : String(error) }); }
  }
  return (await getLatestEnsOutreachBatch())!;
}

export async function generateEnsOutreachStaticImage(itemId: string): Promise<EnsOutreachBatch> {
  const batch = await getLatestEnsOutreachBatch();
  const item = batch?.items.find((entry) => entry.id === itemId);
  if (!batch || !item) throw new Error("Outreach queue item not found.");
  try {
    const assetUrl = await captureStaticImage(item);
    await updateEnsOutreachItem(item.id, { png_url: assetUrl, error: null });
  } catch (error) {
    await updateEnsOutreachItem(item.id, { error: error instanceof Error ? error.message : String(error) });
  }
  return (await getLatestEnsOutreachBatch())!;
}
