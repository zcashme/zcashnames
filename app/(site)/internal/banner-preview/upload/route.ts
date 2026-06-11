import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ASSET_DIR = path.join(process.cwd(), "public", "banner-preview-assets");

const ASSET_FILES: Record<string, string> = {
  heroFlags: "hero-flags.png",
  privacyBadge: "privacy-badge.png",
  setupGift: "setup-gift.png",
  stepDownload: "step-download.png",
  stepCreate: "step-create.png",
  stepReceive: "step-receive.png",
  walletEdge: "wallet-edge.png",
  walletUnstoppable: "wallet-unstoppable.png",
  walletCake: "wallet-cake.png",
  walletZingo: "wallet-zingo.png",
  walletZodl: "wallet-zodl.png",
  officeHours: "office-hours-icon.png",
  eventsPrivacy: "events-privacy-icon.png",
  eventsZk: "events-zk-icon.png",
  acceptedHere: "accepted-here-icon.png",
  whatIsZcash: "what-is-zcash-icon.png",
  community: "community-icon.png",
  research: "research-icon.png",
  footerArrow: "footer-arrow.png",
  footerSkyline: "footer-skyline.png",
  bottomCoins: "bottom-coins.png",
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const assetKey = formData.get("assetKey");
  const file = formData.get("file");

  if (typeof assetKey !== "string" || !(assetKey in ASSET_FILES)) {
    return NextResponse.json({ error: "Invalid asset key." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(ASSET_DIR, { recursive: true });
  await writeFile(path.join(ASSET_DIR, ASSET_FILES[assetKey]), buffer);

  return NextResponse.json({ ok: true, file: ASSET_FILES[assetKey] });
}
