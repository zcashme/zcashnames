"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const POSTER_WIDTH = 1200;
const POSTER_HEIGHT = 3000;
const DEFAULT_EXPORT_WIDTH = 2400;
const ASSET_BASE = "/banner-preview-assets";

const BANNER_ASSETS = [
  { key: "heroFlags", file: "hero-flags.png", label: "Crossed NS and Zcash flags" },
  { key: "privacyBadge", file: "privacy-badge.png", label: "Privacy is Normal badge icon" },
  { key: "setupGift", file: "setup-gift.png", label: "Setup reward gift icon" },
  { key: "stepDownload", file: "step-download.png", label: "Download step icon" },
  { key: "stepCreate", file: "step-create.png", label: "Create address step icon" },
  { key: "stepReceive", file: "step-receive.png", label: "Receive ZEC step icon" },
  { key: "walletEdge", file: "wallet-edge.png", label: "Edge wallet logo" },
  { key: "walletUnstoppable", file: "wallet-unstoppable.png", label: "Unstoppable wallet logo" },
  { key: "walletCake", file: "wallet-cake.png", label: "Cake wallet logo" },
  { key: "walletZingo", file: "wallet-zingo.png", label: "Zingo wallet logo" },
  { key: "walletZodl", file: "wallet-zodl.png", label: "Zodl wallet logo" },
  { key: "officeHours", file: "office-hours-icon.png", label: "Office hours card icon" },
  { key: "eventsPrivacy", file: "events-privacy-icon.png", label: "Privacy is Normal event icon" },
  { key: "eventsZk", file: "events-zk-icon.png", label: "Zero Knowledge event icon" },
  { key: "acceptedHere", file: "accepted-here-icon.png", label: "Accepted here storefront icon" },
  { key: "whatIsZcash", file: "what-is-zcash-icon.png", label: "What is Zcash card icon" },
  { key: "community", file: "community-icon.png", label: "Community card icon" },
  { key: "research", file: "research-icon.png", label: "Research card icon" },
  { key: "footerArrow", file: "footer-arrow.png", label: "Footer direction arrow" },
  { key: "footerSkyline", file: "footer-skyline.png", label: "Footer skyline illustration" },
  { key: "bottomCoins", file: "bottom-coins.png", label: "Bottom row of Zcash symbols" },
] as const;

type BannerAssetKey = (typeof BANNER_ASSETS)[number]["key"];

const walletItems = [
  { assetKey: "walletEdge", titleKey: "walletEdgeTitle", qrKey: "walletEdge" },
  { assetKey: "walletUnstoppable", titleKey: "walletUnstoppableTitle", qrKey: "walletUnstoppable" },
  { assetKey: "walletCake", titleKey: "walletCakeTitle", qrKey: "walletCake" },
  { assetKey: "walletZingo", titleKey: "walletZingoTitle", qrKey: "walletZingo" },
  { assetKey: "walletZodl", titleKey: "walletZodlTitle", qrKey: "walletZodl" },
] as const;

const TEXT_DEFAULTS = {
  heroTitleTop: "Zcash",
  heroTitleBottom: "Network School",
  heroSubLeft: "ZCASH HUB",
  heroSubSeparator: "*",
  heroSubRight: "NETWORK SCHOOL MALAYSIA",
  privacyLine: "Privacy is Normal.",
  setupIntro: "Get started in",
  setupNumber: "60",
  setupUnit: "seconds",
  setupRewardTop: "Receive ~5 USD",
  setupRewardBottom: "in ZEC after setup!",
  setupRewardNote: "*Ask during office hours for details.",
  onboardingTitle: "START USING ZCASH",
  step1Number: "1",
  step1Line1: "Download",
  step1Line2: "a wallet",
  step2Number: "2",
  step2Line1: "Create",
  step2Line2: "your address",
  step3Number: "3",
  step3Line1: "Receive",
  step3Line2: "your first ZEC",
  walletChooser: "CHOOSE YOUR WALLET",
  walletEdgeTitle: "edge",
  walletUnstoppableTitle: "unstoppable\nwallet",
  walletCakeTitle: "cake\nwallet",
  walletZingoTitle: "zingo!\nwallet",
  walletZodlTitle: "zodl\nwallet",
  helpLine: "Need help? Join us during Zcash Office Hours!",
  officeTitle: "ZCASH OFFICE HOURS",
  officeIntro: "Weekly / Everyone welcome!",
  officeBullets: "Wallet usage\nShielded transactions\nSecurity basics\nEcosystem updates\nTroubleshooting",
  officeScan1: "Scan for schedule",
  officeScan2: "and location",
  eventsTitle: "EDUCATIONAL EVENTS",
  eventsPrivacy1: "Privacy is Normal",
  eventsPrivacy2: "with Andre",
  eventsPrivacy3: "2x per month",
  eventsPrivacy4: "20-60 participants",
  eventsZk1: "Zero Knowledge",
  eventsZk2: "Proofs 101",
  eventsZk3: "with James",
  eventsZk4: "2x per month",
  eventsZk5: "20-60 participants",
  eventsScan1: "Scan to view upcoming",
  eventsScan2: "events and RSVP",
  acceptedTitle: "ZCASH ACCEPTED HERE",
  acceptedLine1: "Pay privately",
  acceptedLine2: "with Zcash",
  acceptedBullets: "Fast\nLow fees\nPrivacy-preserving",
  acceptedLearn1: "Learn how to accept",
  acceptedLearn2: "Zcash payments",
  whatTitle: "WHAT IS ZCASH?",
  whatBullets: "Privacy-preserving digital cash\nUses zero-knowledge proofs\nOpen-source protocol\nYou control your financial privacy",
  whatLearn: "Learn more",
  communityTitle: "JOIN THE COMMUNITY",
  communityBullets: "Zcash Community Forum\nZecHub\nCoinholder Governance\nContribution Opportunities",
  communityLearn1: "Get involved and help",
  communityLearn2: "build the future of privacy.",
  researchTitle: "USER RESEARCH IN PROGRESS",
  researchLine1: "We conduct interviews with",
  researchLine2: "residents and businesses",
  researchLine3: "to improve Zcash.",
  researchLine4: "No personal data",
  researchLine5: "is collected.",
  researchLearn: "Learn more",
  footerHub: "ZCASH HUB",
  footerDirection: "THIS WAY",
  footerLocation: "13TH FLOOR * VIP8",
  skylineBadge: "NS",
} as const;

type TextKey = keyof typeof TEXT_DEFAULTS;
type TextState = Record<TextKey, string>;

const QR_DEFAULTS = {
  setup: "https://zcashhub.com/",
  walletEdge: "https://edge.app/",
  walletUnstoppable: "https://unstoppable.money/",
  walletCake: "https://cakewallet.com/",
  walletZingo: "https://zingo.pm/",
  walletZodl: "https://zodl.com/",
  officeHours: "https://zcashhub.com/office-hours",
  events: "https://zcashhub.com/events",
  accepted: "https://zcashhub.com/accept-zcash",
  whatIsZcash: "https://z.cash/",
  community: "https://forum.zcashcommunity.com/",
  research: "https://zcashhub.com/research",
} as const;

type QrKey = keyof typeof QR_DEFAULTS;
type QrState = Record<QrKey, string>;

const TEXT_GROUPS: Array<{ title: string; fields: Array<{ key: TextKey; label: string; multiline?: boolean }> }> = [
  {
    title: "Hero",
    fields: [
      { key: "heroTitleTop", label: "Top title" },
      { key: "heroTitleBottom", label: "Bottom title" },
      { key: "heroSubLeft", label: "Subline left" },
      { key: "heroSubSeparator", label: "Subline separator" },
      { key: "heroSubRight", label: "Subline right" },
      { key: "privacyLine", label: "Privacy line" },
    ],
  },
  {
    title: "Setup Banner",
    fields: [
      { key: "setupIntro", label: "Setup intro" },
      { key: "setupNumber", label: "Setup number" },
      { key: "setupUnit", label: "Setup unit" },
      { key: "setupRewardTop", label: "Reward line 1" },
      { key: "setupRewardBottom", label: "Reward line 2" },
      { key: "setupRewardNote", label: "Reward note" },
    ],
  },
  {
    title: "Onboarding",
    fields: [
      { key: "onboardingTitle", label: "Onboarding title" },
      { key: "step1Number", label: "Step 1 number" },
      { key: "step1Line1", label: "Step 1 line 1" },
      { key: "step1Line2", label: "Step 1 line 2" },
      { key: "step2Number", label: "Step 2 number" },
      { key: "step2Line1", label: "Step 2 line 1" },
      { key: "step2Line2", label: "Step 2 line 2" },
      { key: "step3Number", label: "Step 3 number" },
      { key: "step3Line1", label: "Step 3 line 1" },
      { key: "step3Line2", label: "Step 3 line 2" },
      { key: "walletChooser", label: "Wallet chooser title" },
      { key: "walletEdgeTitle", label: "Edge wallet label", multiline: true },
      { key: "walletUnstoppableTitle", label: "Unstoppable wallet label", multiline: true },
      { key: "walletCakeTitle", label: "Cake wallet label", multiline: true },
      { key: "walletZingoTitle", label: "Zingo wallet label", multiline: true },
      { key: "walletZodlTitle", label: "Zodl wallet label", multiline: true },
      { key: "helpLine", label: "Help line" },
    ],
  },
  {
    title: "Cards",
    fields: [
      { key: "officeTitle", label: "Office card title" },
      { key: "officeIntro", label: "Office intro" },
      { key: "officeBullets", label: "Office bullets", multiline: true },
      { key: "officeScan1", label: "Office scan line 1" },
      { key: "officeScan2", label: "Office scan line 2" },
      { key: "eventsTitle", label: "Events card title" },
      { key: "eventsPrivacy1", label: "Events privacy line 1" },
      { key: "eventsPrivacy2", label: "Events privacy line 2" },
      { key: "eventsPrivacy3", label: "Events privacy line 3" },
      { key: "eventsPrivacy4", label: "Events privacy line 4" },
      { key: "eventsZk1", label: "Events ZK line 1" },
      { key: "eventsZk2", label: "Events ZK line 2" },
      { key: "eventsZk3", label: "Events ZK line 3" },
      { key: "eventsZk4", label: "Events ZK line 4" },
      { key: "eventsZk5", label: "Events ZK line 5" },
      { key: "eventsScan1", label: "Events scan line 1" },
      { key: "eventsScan2", label: "Events scan line 2" },
      { key: "acceptedTitle", label: "Accepted card title" },
      { key: "acceptedLine1", label: "Accepted line 1" },
      { key: "acceptedLine2", label: "Accepted line 2" },
      { key: "acceptedBullets", label: "Accepted bullets", multiline: true },
      { key: "acceptedLearn1", label: "Accepted learn line 1" },
      { key: "acceptedLearn2", label: "Accepted learn line 2" },
      { key: "whatTitle", label: "What is Zcash title" },
      { key: "whatBullets", label: "What is Zcash bullets", multiline: true },
      { key: "whatLearn", label: "What is Zcash learn" },
      { key: "communityTitle", label: "Community title" },
      { key: "communityBullets", label: "Community bullets", multiline: true },
      { key: "communityLearn1", label: "Community learn line 1" },
      { key: "communityLearn2", label: "Community learn line 2" },
      { key: "researchTitle", label: "Research title" },
      { key: "researchLine1", label: "Research line 1" },
      { key: "researchLine2", label: "Research line 2" },
      { key: "researchLine3", label: "Research line 3" },
      { key: "researchLine4", label: "Research line 4" },
      { key: "researchLine5", label: "Research line 5" },
      { key: "researchLearn", label: "Research learn" },
    ],
  },
  {
    title: "Footer",
    fields: [
      { key: "footerHub", label: "Footer hub label" },
      { key: "footerDirection", label: "Footer direction label" },
      { key: "footerLocation", label: "Footer location line" },
      { key: "skylineBadge", label: "Skyline badge text" },
    ],
  },
];

const QR_FIELDS: Array<{ key: QrKey; label: string }> = [
  { key: "setup", label: "Top-left setup QR" },
  { key: "walletEdge", label: "Edge wallet QR" },
  { key: "walletUnstoppable", label: "Unstoppable wallet QR" },
  { key: "walletCake", label: "Cake wallet QR" },
  { key: "walletZingo", label: "Zingo wallet QR" },
  { key: "walletZodl", label: "Zodl wallet QR" },
  { key: "officeHours", label: "Office hours QR" },
  { key: "events", label: "Events QR" },
  { key: "accepted", label: "Accepted here QR" },
  { key: "whatIsZcash", label: "What is Zcash QR" },
  { key: "community", label: "Community QR" },
  { key: "research", label: "Research QR" },
];

function getAssetPath(file: string, version = 0) {
  return `${ASSET_BASE}/${file}?v=${version}`;
}

function splitLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

function downloadFile(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

function CoinGlyph({ x, y, scale = 1, color = "#ffffff" }: { x: number; y: number; scale?: number; color?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M0-24l11 5v11L-7 15H11v9H-19V15L-1-8H-14v-9H0z"
      fill={color}
    />
  );
}

function useBannerAssetAvailability(assetVersions: Record<BannerAssetKey, number>) {
  const [availability, setAvailability] = useState<Record<BannerAssetKey, boolean>>(
    Object.fromEntries(BANNER_ASSETS.map((asset) => [asset.key, false])) as Record<BannerAssetKey, boolean>,
  );

  useEffect(() => {
    let cancelled = false;

    async function checkAssets() {
      const checks = await Promise.all(
        BANNER_ASSETS.map(
          (asset) =>
            new Promise<[BannerAssetKey, boolean]>((resolve) => {
              const image = new window.Image();
              image.onload = () => resolve([asset.key, true]);
              image.onerror = () => resolve([asset.key, false]);
              image.src = getAssetPath(asset.file, assetVersions[asset.key]);
            }),
        ),
      );

      if (cancelled) return;
      setAvailability(Object.fromEntries(checks) as Record<BannerAssetKey, boolean>);
    }

    void checkAssets();
    return () => {
      cancelled = true;
    };
  }, [assetVersions]);

  return availability;
}

function PosterQr({
  x,
  y,
  size,
  value,
  framed = false,
}: {
  x: number;
  y: number;
  size: number;
  value: string;
  framed?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {framed ? <rect width={size} height={size} rx="14" fill="#fff" stroke="#f3bf58" strokeWidth="3" /> : null}
      <foreignObject x={framed ? 10 : 0} y={framed ? 10 : 0} width={framed ? size - 20 : size} height={framed ? size - 20 : size}>
        <div style={{ width: "100%", height: "100%", background: "#ffffff" }}>
          <QRCodeSVG value={value} width="100%" height="100%" bgColor="#ffffff" fgColor="#111111" level="M" marginSize={0} />
        </div>
      </foreignObject>
    </g>
  );
}

function StepBadge({ x, y, value }: { x: number; y: number; value: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="26" fill="#f4b126" />
      <text y="10" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="800" fontFamily="Arial, sans-serif">
        {value}
      </text>
    </g>
  );
}

function Bullet({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="10" fill="none" stroke="#f4b126" strokeWidth="3" />
      <path d="M-4 0l3 3 6-7" fill="none" stroke="#f4b126" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="24" y="6" fill="#20242c" fontSize="30" fontWeight="500" fontFamily="Arial, sans-serif">
        {text}
      </text>
    </g>
  );
}

function PosterCard({
  x,
  y,
  width,
  height,
  title,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height={height} rx="24" fill="#fffdfa" stroke="#f0cb81" strokeWidth="2" />
      <path d={`M0 0h${width}v78H0z`} fill="#171a1f" />
      <text x={width / 2} y="51" textAnchor="middle" fill="#f4f6fb" fontSize="34" fontWeight="800" fontFamily="Arial, sans-serif">
        {title}
      </text>
      {children}
    </g>
  );
}

function AssetImage({
  available,
  href,
  x,
  y,
  width,
  height,
  fallback,
}: {
  available: boolean;
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fallback: ReactNode;
}) {
  if (!available) return <>{fallback}</>;

  return <image href={href} x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid meet" />;
}

function WalletMark({ name, x, y }: { name: BannerAssetKey; x: number; y: number }) {
  if (name === "walletEdge") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d="M0 20l42-20v34L0 54z" fill="#90afff" />
        <path d="M42 0l24 14v34L42 34z" fill="#4f79ff" />
        <path d="M0 54l42-20 24 14L24 68z" fill="#2f59ff" />
      </g>
    );
  }

  if (name === "walletUnstoppable") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d="M8 10c0-7 6-10 14-10h22c8 0 14 3 14 10v26c0 18-12 32-25 32S8 54 8 36z" fill="#5c63ff" />
        <path d="M22 0v36c0 7 5 12 11 12s11-5 11-12V0" fill="#ffffff" opacity="0.95" />
      </g>
    );
  }

  if (name === "walletCake") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <rect x="4" y="6" width="60" height="60" rx="16" fill="#7b4dff" />
        <path d="M18 28l16-10 16 10-16 10z" fill="#d0b6ff" />
        <path d="M18 42l16-10 16 10-16 10z" fill="#f0b24c" />
        <path d="M18 54l16-10 16 10-16 10z" fill="#a684ff" />
      </g>
    );
  }

  if (name === "walletZingo") {
    return (
      <g transform={`translate(${x} ${y}) rotate(-8)`}>
        <path d="M0 18L70 0l-8 18h22L16 36l8-18z" fill="#f7b51d" stroke="#121212" strokeWidth="5" />
        <text x="42" y="24" textAnchor="middle" fill="#121212" fontSize="24" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif">
          ZINGO!
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M34 0l28 12v22c0 18-12 28-28 36C18 62 6 52 6 34V12z" fill="#111111" />
      <path d="M34 12l10 4v10l-14 18h14v8H22v-8l14-18H24v-8h20V12z" fill="#ffffff" />
    </g>
  );
}

function Skyline({ badge }: { badge: string }) {
  return (
    <g stroke="#1b1d24" strokeWidth="2.5" fill="none" opacity="0.62">
      <path d="M0 92h372" />
      <path d="M18 92V64l24-20 22 20v28" />
      <path d="M48 44V14l14-8 14 8v30" />
      <path d="M86 92V54l20-12 20 12v38" />
      <path d="M138 92V22l28-18 28 18v70" />
      <path d="M194 92V34l18-10 18 10v58" />
      <path d="M244 92V52l20-14 20 14v40" />
      <path d="M302 92V62l18-12 18 12v30" />
      <path d="M344 92V48l12-8 12 8v44" />
      <path d="M0 92c18-10 40-14 64-14 24 0 40 4 62 10 16 4 36 4 54 0 20-5 42-10 68-10 24 0 40 3 62 10 18 5 36 5 62 0" />
      <rect x="176" y="18" width="38" height="50" rx="6" />
      <path d="M195 18v50M185 40h20" />
      <text x="195" y="49" textAnchor="middle" fill="#e4a52c" fontSize="26" fontWeight="700" fontFamily="Georgia, serif">
        {badge}
      </text>
    </g>
  );
}

function PosterSvg({
  svgId,
  assetAvailability,
  assetVersions,
  text,
  qr,
}: {
  svgId: string;
  assetAvailability: Record<BannerAssetKey, boolean>;
  assetVersions: Record<BannerAssetKey, number>;
  text: TextState;
  qr: QrState;
}) {
  const assetHref = useMemo(
    () =>
      Object.fromEntries(
        BANNER_ASSETS.map((asset) => [asset.key, getAssetPath(asset.file, assetVersions[asset.key])]),
      ) as Record<BannerAssetKey, string>,
    [assetVersions],
  );

  return (
    <svg
      id={svgId}
      xmlns="http://www.w3.org/2000/svg"
      width={POSTER_WIDTH}
      height={POSTER_HEIGHT}
      viewBox={`0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}`}
      role="img"
      aria-label="Zcash Network School banner preview poster"
    >
      <defs>
        <radialGradient id="poster-bg" cx="50%" cy="0%" r="86%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="72%" stopColor="#fffef9" />
          <stop offset="100%" stopColor="#f6f2e9" />
        </radialGradient>
      </defs>

      <rect width={POSTER_WIDTH} height={POSTER_HEIGHT} fill="url(#poster-bg)" />

      <g opacity="0.14">
        {Array.from({ length: 22 }).map((_, row) =>
          Array.from({ length: 13 }).map((__, column) => (
            <rect
              key={`${row}-${column}`}
              x={48 + column * 88}
              y={18 + row * 34}
              width="12"
              height="12"
              rx="2"
              fill="#95a0b3"
            />
          )),
        )}
      </g>

      <AssetImage
        available={assetAvailability.heroFlags}
        href={assetHref.heroFlags}
        x={290}
        y={38}
        width={620}
        height={250}
        fallback={
          <g transform="translate(318 66)">
            <g transform="rotate(-7 130 60)">
              <path d="M0 34c38 18 74 5 118 0 40-4 71 8 117 2v88c-40 8-80-4-119 1-39 4-78 13-116-4z" fill="#ffffff" stroke="#d7d7d7" strokeWidth="2" />
              <path d="M8 30C44 48 80 36 118 30c45-8 74 6 109 3" fill="none" stroke="#efefef" strokeWidth="8" opacity="0.72" />
              <path d="M95 41l36-8 28 12-2 34-22 22-39-4-12-34z" fill="none" stroke="#111111" strokeWidth="5" />
              <text x="125" y="78" textAnchor="middle" fill="#111111" fontSize="38" fontWeight="700" fontFamily="Georgia, serif">
                NS
              </text>
            </g>
            <g transform="translate(194 0) rotate(6 126 62)">
              <path d="M0 34c38 18 74 5 118 0 40-4 71 8 117 2v88c-40 8-80-4-119 1-39 4-78 13-116-4z" fill="#f4b126" />
              <path d="M8 30C44 48 80 36 118 30c45-8 74 6 109 3" fill="none" stroke="#ffd36c" strokeWidth="8" opacity="0.55" />
              <CoinGlyph x={128} y={66} scale={1.2} color="#ffffff" />
            </g>
            <path d="M126 0v158M318 0v158" stroke="#7c7f88" strokeWidth="7" strokeLinecap="round" />
            <path d="M126 154L318 154" stroke="#7c7f88" strokeWidth="7" strokeLinecap="round" transform="rotate(60 222 154)" />
            <path d="M126 154L318 154" stroke="#7c7f88" strokeWidth="7" strokeLinecap="round" transform="rotate(-60 222 154)" />
            <circle cx="126" cy="0" r="8" fill="#999ca3" />
            <circle cx="318" cy="0" r="8" fill="#999ca3" />
          </g>
        }
      />

      <text x="600" y="398" textAnchor="middle" fill="#14161d" fontSize="126" fontFamily="Georgia, Times New Roman, serif">
        {text.heroTitleTop}
      </text>
      <text x="600" y="534" textAnchor="middle" fill="#14161d" fontSize="118" fontFamily="Georgia, Times New Roman, serif">
        {text.heroTitleBottom}
      </text>

      <line x1="140" x2="420" y1="598" y2="598" stroke="#d7d9df" strokeWidth="2" />
      <line x1="780" x2="1060" y1="598" y2="598" stroke="#d7d9df" strokeWidth="2" />
      <text x="318" y="607" textAnchor="middle" fill="#f1ab18" fontSize="34" fontWeight="800" letterSpacing="4" fontFamily="Arial, sans-serif">
        {text.heroSubLeft}
      </text>
      <text x="600" y="607" textAnchor="middle" fill="#1d222b" fontSize="34" fontWeight="700" letterSpacing="4" fontFamily="Arial, sans-serif">
        {text.heroSubSeparator}
      </text>
      <text x="782" y="607" textAnchor="middle" fill="#1d222b" fontSize="34" fontWeight="500" letterSpacing="4" fontFamily="Arial, sans-serif">
        {text.heroSubRight}
      </text>

      <g transform="translate(600 700)">
        <AssetImage
          available={assetAvailability.privacyBadge}
          href={assetHref.privacyBadge}
          x={-36}
          y={-36}
          width={72}
          height={72}
          fallback={
            <>
              <circle r="36" fill="#f4b126" />
              <CoinGlyph x={0} y={0} scale={1} color="#ffffff" />
            </>
          }
        />
        <text x="58" y="16" fill="#1b1e25" fontSize="64" fontWeight="600" fontFamily="Georgia, Times New Roman, serif">
          {text.privacyLine}
        </text>
      </g>

      <g transform="translate(140 770)">
        <rect width="920" height="166" rx="28" fill="#fffdfa" stroke="#f3bf58" strokeWidth="3" />
        <PosterQr value={qr.setup} x={18} y={18} size={130} framed />
        <text x="204" y="60" fill="#20242c" fontSize="30" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.setupIntro}
        </text>
        <text x="200" y="132" fill="#f3ad1e" fontSize="84" fontWeight="900" fontFamily="Arial, sans-serif">
          {text.setupNumber}
        </text>
        <text x="332" y="132" fill="#20242c" fontSize="28" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.setupUnit}
        </text>
        <line x1="520" y1="28" x2="520" y2="138" stroke="#e6e7ea" strokeWidth="2" />
        <AssetImage
          available={assetAvailability.setupGift}
          href={assetHref.setupGift}
          x={580}
          y={50}
          width={68}
          height={68}
          fallback={
            <>
              <circle cx="614" cy="84" r="34" fill="#f4b126" />
              <rect x="598" y="73" width="32" height="24" rx="4" fill="#ffffff" />
              <path d="M606 73c0-10 5-16 8-16 3 0 8 6 8 16M614 73c0-10 5-16 8-16 3 0 8 6 8 16" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              <path d="M614 76v18M605 85h18" stroke="#f4b126" strokeWidth="4" strokeLinecap="round" />
            </>
          }
        />
        <text x="668" y="76" fill="#20242c" fontSize="28" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.setupRewardTop}
        </text>
        <text x="668" y="112" fill="#20242c" fontSize="28" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.setupRewardBottom}
        </text>
        <text x="586" y="144" fill="#7a7f87" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.setupRewardNote}
        </text>
      </g>

      <g transform="translate(52 970)">
        <rect width="1096" height="20" rx="10" fill="#15181f" />
        <rect y="20" width="1096" height="774" rx="24" fill="#ffffff" stroke="#c8ccd3" strokeWidth="2" />
        <text x="548" y="54" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="800" fontFamily="Arial, sans-serif">
          {text.onboardingTitle}
        </text>

        <StepBadge x={88} y={114} value={text.step1Number} />
        <AssetImage
          available={assetAvailability.stepDownload}
          href={assetHref.stepDownload}
          x={123}
          y={82}
          width={64}
          height={64}
          fallback={
            <>
              <circle cx="155" cy="114" r="32" fill="#f7f8fb" stroke="#d8dce4" strokeWidth="2" />
              <path d="M155 90v36M142 116l13 13 13-13M140 136h30" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </>
          }
        />
        <text x="208" y="108" fill="#1b1d24" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.step1Line1}
        </text>
        <text x="208" y="140" fill="#1b1d24" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.step1Line2}
        </text>

        <path d="M385 114h44" stroke="#d9dce2" strokeWidth="4" strokeLinecap="round" />
        <path d="M415 98l16 16-16 16" fill="none" stroke="#d9dce2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        <StepBadge x={458} y={114} value={text.step2Number} />
        <AssetImage
          available={assetAvailability.stepCreate}
          href={assetHref.stepCreate}
          x={493}
          y={82}
          width={64}
          height={64}
          fallback={
            <>
              <circle cx="525" cy="114" r="32" fill="#f7f8fb" stroke="#d8dce4" strokeWidth="2" />
              <circle cx="525" cy="103" r="9" fill="none" stroke="#111111" strokeWidth="4" />
              <path d="M507 132c8-12 28-12 36 0" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
            </>
          }
        />
        <text x="578" y="108" fill="#1b1d24" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.step2Line1}
        </text>
        <text x="578" y="140" fill="#1b1d24" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.step2Line2}
        </text>

        <path d="M760 114h44" stroke="#d9dce2" strokeWidth="4" strokeLinecap="round" />
        <path d="M790 98l16 16-16 16" fill="none" stroke="#d9dce2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        <StepBadge x={828} y={114} value={text.step3Number} />
        <AssetImage
          available={assetAvailability.stepReceive}
          href={assetHref.stepReceive}
          x={863}
          y={82}
          width={64}
          height={64}
          fallback={
            <>
              <circle cx="895" cy="114" r="32" fill="#f7f8fb" stroke="#d8dce4" strokeWidth="2" />
              <path d="M895 90l18 8v16c0 12-8 20-18 26-10-6-18-14-18-26V98z" fill="#111111" />
              <CoinGlyph x={895} y={117} scale={0.7} color="#ffffff" />
            </>
          }
        />
        <text x="946" y="108" fill="#1b1d24" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.step3Line1}
        </text>
        <text x="946" y="140" fill="#1b1d24" fontSize="24" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.step3Line2}
        </text>

        <line x1="56" x2="374" y1="204" y2="204" stroke="#d8dce1" strokeWidth="2" />
        <line x1="724" x2="1042" y1="204" y2="204" stroke="#d8dce1" strokeWidth="2" />
        <text x="548" y="214" textAnchor="middle" fill="#1b1d24" fontSize="20" fontWeight="500" letterSpacing="1.6" fontFamily="Arial, sans-serif">
          {text.walletChooser}
        </text>

        {walletItems.map((wallet, index) => {
          const columnWidth = 1096 / 5;
          const left = index * columnWidth;
          const center = left + columnWidth / 2;
          const lines = splitLines(text[wallet.titleKey]);

          return (
            <g key={wallet.assetKey} transform={`translate(${left} 228)`}>
              {index > 0 ? <line x1="0" x2="0" y1="0" y2="290" stroke="#d8dce1" strokeWidth="2" /> : null}
              <AssetImage
                available={assetAvailability[wallet.assetKey]}
                href={assetHref[wallet.assetKey]}
                x={58}
                y={24}
                width={104}
                height={84}
                fallback={<WalletMark name={wallet.assetKey} x={74} y={34} />}
              />
              {lines.map((line, lineIndex) => (
                <text
                  key={`${wallet.assetKey}-${line}-${lineIndex}`}
                  x={center - left}
                  y={154 + lineIndex * 26}
                  textAnchor="middle"
                  fill="#20242c"
                  fontSize="24"
                  fontWeight="700"
                  fontFamily="Arial, sans-serif"
                >
                  {line}
                </text>
              ))}
              <PosterQr value={qr[wallet.qrKey]} x={58} y={184} size={104} />
            </g>
          );
        })}

        <g transform="translate(30 698)">
          <rect width="1036" height="56" rx="18" fill="#f5f6f9" />
          <circle cx="32" cy="28" r="18" fill="none" stroke="#f4b126" strokeWidth="3" />
          <text x="32" y="35" textAnchor="middle" fill="#f4b126" fontSize="28" fontWeight="700" fontFamily="Georgia, serif">
            ?
          </text>
          <text x="68" y="36" fill="#1d2027" fontSize="26" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.helpLine}
          </text>
        </g>
      </g>

      <PosterCard x={52} y={1808} width={356} height={548} title={text.officeTitle}>
        <AssetImage
          available={assetAvailability.officeHours}
          href={assetHref.officeHours}
          x={124}
          y={86}
          width={108}
          height={108}
          fallback={
            <g transform="translate(178 140)">
              <circle r="54" fill="#fff8ed" />
              <rect x="-22" y="-18" width="44" height="36" rx="8" fill="none" stroke="#f4b126" strokeWidth="4" />
              <path d="M-12-26v14M12-26v14M-22-4h44M-8 10l8 8 14-18" fill="none" stroke="#f4b126" strokeWidth="4" strokeLinecap="round" />
            </g>
          }
        />
        <text x="36" y="240" fill="#20242c" fontSize="22" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.officeIntro}
        </text>
        {splitLines(text.officeBullets).map((item, index) => (
          <Bullet key={`office-${item}-${index}`} x={56} y={290 + index * 42} text={item} />
        ))}
        <line x1="36" x2="320" y1="438" y2="438" stroke="#d8dce1" strokeWidth="2" />
        <text x="36" y="486" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.officeScan1}
        </text>
        <text x="36" y="514" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.officeScan2}
        </text>
        <PosterQr value={qr.officeHours} x={236} y={440} size={86} />
      </PosterCard>

      <PosterCard x={422} y={1808} width={356} height={548} title={text.eventsTitle}>
        <g transform="translate(34 114)">
          <AssetImage
            available={assetAvailability.eventsPrivacy}
            href={assetHref.eventsPrivacy}
            x={0}
            y={0}
            width={84}
            height={84}
            fallback={
              <>
                <circle cx="42" cy="42" r="32" fill="#f4b126" />
                <CoinGlyph x={42} y={42} scale={0.55} color="#ffffff" />
              </>
            }
          />
          <text x="96" y="36" fill="#1c2028" fontSize="23" fontWeight="800" fontFamily="Arial, sans-serif">
            {text.eventsPrivacy1}
          </text>
          <text x="96" y="66" fill="#1c2028" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.eventsPrivacy2}
          </text>
          <text x="96" y="104" fill="#1c2028" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.eventsPrivacy3}
          </text>
          <text x="96" y="132" fill="#1c2028" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.eventsPrivacy4}
          </text>
        </g>
        <line x1="28" x2="328" y1="278" y2="278" stroke="#d8dce1" strokeWidth="2" />
        <g transform="translate(34 306)">
          <AssetImage
            available={assetAvailability.eventsZk}
            href={assetHref.eventsZk}
            x={0}
            y={0}
            width={84}
            height={84}
            fallback={
              <>
                <circle cx="42" cy="42" r="32" fill="#f4b126" />
                <text x="42" y="35" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="Arial, sans-serif">
                  z
                </text>
                <text x="42" y="55" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" fontFamily="Arial, sans-serif">
                  z
                </text>
              </>
            }
          />
          <text x="96" y="28" fill="#1c2028" fontSize="23" fontWeight="800" fontFamily="Arial, sans-serif">
            {text.eventsZk1}
          </text>
          <text x="96" y="56" fill="#1c2028" fontSize="23" fontWeight="800" fontFamily="Arial, sans-serif">
            {text.eventsZk2}
          </text>
          <text x="96" y="86" fill="#1c2028" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.eventsZk3}
          </text>
          <text x="96" y="118" fill="#1c2028" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.eventsZk4}
          </text>
          <text x="96" y="146" fill="#1c2028" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
            {text.eventsZk5}
          </text>
        </g>
        <text x="36" y="490" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.eventsScan1}
        </text>
        <text x="36" y="518" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.eventsScan2}
        </text>
        <PosterQr value={qr.events} x={236} y={442} size={86} />
      </PosterCard>

      <PosterCard x={792} y={1808} width={356} height={548} title={text.acceptedTitle}>
        <AssetImage
          available={assetAvailability.acceptedHere}
          href={assetHref.acceptedHere}
          x={56}
          y={132}
          width={252}
          height={190}
          fallback={
            <g transform="translate(188 178)">
              <circle cx="-86" cy="40" r="46" fill="#f4b126" />
              <CoinGlyph x={-86} y={40} scale={0.8} color="#ffffff" />
              <path d="M-16 0h88l18 18v48H-34V18z" fill="none" stroke="#22252d" strokeWidth="4" />
              <path d="M-22 0H78" stroke="#f4b126" strokeWidth="18" strokeLinecap="round" />
              <path d="M-16 0l-12 18M12 0L0 18M40 0L28 18M68 0L56 18M96 0L84 18" stroke="#f7cf73" strokeWidth="12" strokeLinecap="round" />
              <path d="M-8 18v46M66 18v46M-8 42H66" stroke="#22252d" strokeWidth="4" />
            </g>
          }
        />
        <text x="178" y="348" textAnchor="middle" fill="#20242c" fontSize="22" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.acceptedLine1}
        </text>
        <text x="178" y="380" textAnchor="middle" fill="#20242c" fontSize="22" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.acceptedLine2}
        </text>
        {splitLines(text.acceptedBullets).map((item, index) => (
          <Bullet key={`accepted-${item}-${index}`} x={82} y={434 + index * 42} text={item} />
        ))}
        <line x1="52" x2="304" y1="560" y2="560" stroke="#d8dce1" strokeWidth="2" />
        <text x="52" y="592" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.acceptedLearn1}
        </text>
        <text x="52" y="620" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.acceptedLearn2}
        </text>
        <PosterQr value={qr.accepted} x={240} y={544} size={86} />
      </PosterCard>

      <PosterCard x={52} y={2390} width={356} height={430} title={text.whatTitle}>
        <AssetImage
          available={assetAvailability.whatIsZcash}
          href={assetHref.whatIsZcash}
          x={30}
          y={92}
          width={72}
          height={72}
          fallback={
            <g transform="translate(54 116)">
              <circle cx="30" cy="30" r="34" fill="#f4b126" />
              <CoinGlyph x={30} y={30} scale={0.62} color="#ffffff" />
            </g>
          }
        />
        {splitLines(text.whatBullets).map((item, index) => (
          <g key={`what-${item}-${index}`} transform={`translate(108 ${144 + index * 56})`}>
            <circle cx="-12" cy="-8" r="4" fill="#1d2027" />
            <text fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
              {item}
            </text>
          </g>
        ))}
        <line x1="36" x2="320" y1="344" y2="344" stroke="#d8dce1" strokeWidth="2" />
        <text x="100" y="388" textAnchor="middle" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.whatLearn}
        </text>
        <PosterQr value={qr.whatIsZcash} x={236} y={338} size={86} />
      </PosterCard>

      <PosterCard x={422} y={2390} width={356} height={430} title={text.communityTitle}>
        <AssetImage
          available={assetAvailability.community}
          href={assetHref.community}
          x={26}
          y={108}
          width={92}
          height={80}
          fallback={
            <g transform="translate(44 132)">
              <circle cx="24" cy="0" r="12" fill="#f4b126" />
              <circle cx="0" cy="12" r="10" fill="#f4b126" />
              <circle cx="48" cy="12" r="10" fill="#f4b126" />
              <path d="M-6 42c10-18 44-18 54 0M16 32c8-14 28-14 36 0" fill="none" stroke="#f4b126" strokeWidth="6" strokeLinecap="round" />
            </g>
          }
        />
        {splitLines(text.communityBullets).map((item, index) => (
          <g key={`community-${item}-${index}`} transform={`translate(86 ${166 + index * 50})`}>
            <circle cx="-30" cy="-10" r="13" fill="#f4b126" />
            <text x="-30" y="-4" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="800" fontFamily="Arial, sans-serif">
              {index + 1}
            </text>
            <text fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
              {item}
            </text>
          </g>
        ))}
        <line x1="36" x2="320" y1="344" y2="344" stroke="#d8dce1" strokeWidth="2" />
        <text x="36" y="388" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.communityLearn1}
        </text>
        <text x="36" y="416" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.communityLearn2}
        </text>
        <PosterQr value={qr.community} x={236} y={338} size={86} />
      </PosterCard>

      <PosterCard x={792} y={2390} width={356} height={430} title={text.researchTitle}>
        <AssetImage
          available={assetAvailability.research}
          href={assetHref.research}
          x={40}
          y={110}
          width={88}
          height={92}
          fallback={
            <g transform="translate(52 122)">
              <rect x="0" y="0" width="64" height="76" rx="10" fill="none" stroke="#f4b126" strokeWidth="4" />
              <path d="M18 0v-12h28V0M16 22h32M16 40h32M16 58h20" fill="none" stroke="#f4b126" strokeWidth="4" strokeLinecap="round" />
              <path d="M46 54l6 6 12-14" fill="none" stroke="#f4b126" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          }
        />
        <text x="132" y="146" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.researchLine1}
        </text>
        <text x="132" y="174" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.researchLine2}
        </text>
        <text x="132" y="202" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.researchLine3}
        </text>
        <line x1="36" x2="320" y1="260" y2="260" stroke="#d8dce1" strokeWidth="2" />
        <text x="52" y="316" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.researchLine4}
        </text>
        <text x="52" y="344" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.researchLine5}
        </text>
        <line x1="36" x2="320" y1="366" y2="366" stroke="#d8dce1" strokeWidth="2" />
        <text x="52" y="410" fill="#20242c" fontSize="18" fontWeight="500" fontFamily="Arial, sans-serif">
          {text.researchLearn}
        </text>
        <PosterQr value={qr.research} x={236} y={338} size={86} />
      </PosterCard>

      <g transform="translate(52 2848)">
        <rect width="1096" height="108" rx="22" fill="#fffdfa" stroke="#d8dce1" strokeWidth="2" />
        <AssetImage
          available={assetAvailability.footerArrow}
          href={assetHref.footerArrow}
          x={36}
          y={12}
          width={84}
          height={84}
          fallback={
            <g transform="translate(78 54)">
              <circle r="42" fill="#171a1f" />
              <path d="M-16 0h24M6-10l10 10-10 10" fill="none" stroke="#f4b126" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          }
        />
        <text x="164" y="56" fill="#f2aa17" fontSize="58" fontWeight="900" fontFamily="Arial, sans-serif">
          {text.footerHub}
        </text>
        <text x="498" y="56" fill="#1f232b" fontSize="58" fontWeight="700" fontFamily="Arial, sans-serif">
          {text.footerDirection}
        </text>
        <text x="210" y="92" fill="#1f232b" fontSize="24" fontWeight="500" letterSpacing="6" fontFamily="Arial, sans-serif">
          {text.footerLocation}
        </text>
        <AssetImage
          available={assetAvailability.footerSkyline}
          href={assetHref.footerSkyline}
          x={664}
          y={8}
          width={372}
          height={92}
          fallback={
            <g transform="translate(664 8)">
              <Skyline badge={text.skylineBadge} />
            </g>
          }
        />
      </g>

      <AssetImage
        available={assetAvailability.bottomCoins}
        href={assetHref.bottomCoins}
        x={0}
        y={2920}
        width={POSTER_WIDTH}
        height={120}
        fallback={
          <g transform="translate(0 2920)">
            {Array.from({ length: 12 }).map((_, index) => {
              const cx = 66 + index * 96 + (index % 2 === 0 ? 0 : 8);
              const radius = 32 + (index % 4) * 6;
              return (
                <g key={cx} transform={`translate(${cx} ${48 + (index % 3) * 10})`}>
                  <circle r={radius} fill="#f4b126" opacity="0.9" />
                  <CoinGlyph x={0} y={0} scale={radius / 34} color="#ffffff" />
                  <ellipse cy={72} rx={radius * 1.2} ry="12" fill="#ffffff" opacity="0.34" />
                </g>
              );
            })}
          </g>
        }
      />
    </svg>
  );
}

export default function InternalBannerPreviewPage() {
  const svgIdRef = useRef(`banner-preview-${Math.random().toString(36).slice(2)}`);
  const [exportWidth, setExportWidth] = useState(DEFAULT_EXPORT_WIDTH);
  const [text, setText] = useState<TextState>({ ...TEXT_DEFAULTS });
  const [qr, setQr] = useState<QrState>({ ...QR_DEFAULTS });
  const [uploading, setUploading] = useState<Record<BannerAssetKey, boolean>>(
    Object.fromEntries(BANNER_ASSETS.map((asset) => [asset.key, false])) as Record<BannerAssetKey, boolean>,
  );
  const [assetVersions, setAssetVersions] = useState<Record<BannerAssetKey, number>>(
    Object.fromEntries(BANNER_ASSETS.map((asset) => [asset.key, 0])) as Record<BannerAssetKey, number>,
  );
  const exportHeight = useMemo(() => Math.round((exportWidth / POSTER_WIDTH) * POSTER_HEIGHT), [exportWidth]);
  const assetAvailability = useBannerAssetAvailability(assetVersions);

  async function handleDownloadSvg() {
    const svgElement = document.getElementById(svgIdRef.current) as unknown as SVGSVGElement | null;
    if (!svgElement) return;

    const serialized = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `banner-preview-${POSTER_WIDTH}x${POSTER_HEIGHT}.svg`);
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPng() {
    const svgElement = document.getElementById(svgIdRef.current) as unknown as SVGSVGElement | null;
    if (!svgElement) return;

    const serialized = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to render SVG for PNG export."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }

    context.fillStyle = "#fffef9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL("image/png");
    downloadFile(pngUrl, `banner-preview-${exportWidth}x${exportHeight}.png`);
  }

  function updateText(key: TextKey, value: string) {
    setText((current) => ({ ...current, [key]: value }));
  }

  function updateQr(key: QrKey, value: string) {
    setQr((current) => ({ ...current, [key]: value }));
  }

  async function handleAssetUpload(assetKey: BannerAssetKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading((current) => ({ ...current, [assetKey]: true }));

    try {
      const formData = new FormData();
      formData.append("assetKey", assetKey);
      formData.append("file", file);

      const response = await fetch("/internal/banner-preview/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      setAssetVersions((current) => ({ ...current, [assetKey]: current[assetKey] + 1 }));
    } finally {
      setUploading((current) => ({ ...current, [assetKey]: false }));
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[#ece9e1] px-4 py-6 text-[#171a1f] sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <header className="rounded-3xl border border-[#d8d2c4] bg-[#fffdf8] p-5 shadow-[0_18px_80px_rgba(33,26,13,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ba8417]">Internal</p>
              <h1 className="text-3xl font-black tracking-tight">Banner Preview</h1>
              <p className="max-w-4xl text-sm leading-6 text-[#565b65]">
                Local-only 2:5 poster preview. Assets can be uploaded into fixed slots, and all poster copy below is editable live.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-full border border-[#ddd6c6] bg-white px-3 py-2 text-sm font-semibold">
                <span>PNG width</span>
                <select
                  value={exportWidth}
                  onChange={(event) => setExportWidth(Number(event.target.value))}
                  className="rounded-md border border-[#ddd6c6] bg-white px-2 py-1 outline-none"
                >
                  <option value={1200}>1200 px</option>
                  <option value={1800}>1800 px</option>
                  <option value={2400}>2400 px</option>
                  <option value={3000}>3000 px</option>
                  <option value={3600}>3600 px</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleDownloadSvg()}
                className="rounded-full border border-[#d2ccbe] bg-white px-4 py-2 text-sm font-semibold text-[#171a1f] transition-colors hover:border-[#171a1f]"
              >
                Download SVG
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPng()}
                className="rounded-full bg-[#171a1f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Download PNG
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#737983]">
            <span className="rounded-full border border-[#e0dbcf] px-3 py-1">Poster ratio 2:5</span>
            <span className="rounded-full border border-[#e0dbcf] px-3 py-1">Base artboard 1200 x 3000</span>
            <span className="rounded-full border border-[#e0dbcf] px-3 py-1">PNG export {exportWidth} x {exportHeight}</span>
          </div>
        </header>

        <div className="overflow-auto rounded-[32px] border border-[#d8d2c4] bg-[radial-gradient(circle_at_top,_#ffffff,_#f2ede3)] p-4 shadow-[0_24px_100px_rgba(33,26,13,0.12)]">
          <div className="mx-auto w-full max-w-[760px] min-w-[320px]">
            <PosterSvg
              svgId={svgIdRef.current}
              assetAvailability={assetAvailability}
              assetVersions={assetVersions}
              text={text}
              qr={qr}
            />
          </div>
        </div>

        <section className="rounded-3xl border border-[#d8d2c4] bg-[#fffdf8] p-5 shadow-[0_18px_80px_rgba(33,26,13,0.08)]">
          <div className="mb-4">
            <h2 className="text-lg font-black tracking-tight">Replaceable Assets</h2>
            <p className="mt-1 text-sm leading-6 text-[#565b65]">
              The bottom Zcash symbols are not the same as the “What is Zcash” card icon. They now have their own slot: <code className="rounded bg-[#f5f1e8] px-1.5 py-0.5 text-xs">bottom-coins.png</code>.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#565b65]">
              Files are saved into <code className="rounded bg-[#f5f1e8] px-1.5 py-0.5 text-xs">public/banner-preview-assets/</code> with the fixed filename shown below.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {BANNER_ASSETS.map((asset) => (
              <div key={asset.key} className="rounded-2xl border border-[#e7e1d3] bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#171a1f]">{asset.label}</p>
                    <p className="mt-1 font-mono text-xs text-[#6d7380]">{asset.file}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      assetAvailability[asset.key] ? "bg-[#e9f7ef] text-[#1b7a3f]" : "bg-[#f4efe4] text-[#8a6a1d]"
                    }`}
                  >
                    {assetAvailability[asset.key] ? "found" : "missing"}
                  </span>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#737983]">
                    {uploading[asset.key] ? "Uploading..." : assetAvailability[asset.key] ? "Replace file" : "Upload file"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleAssetUpload(asset.key, event)}
                    disabled={uploading[asset.key]}
                    className="mt-2 block w-full rounded-xl border border-[#ddd6c6] bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8d2c4] bg-[#fffdf8] p-5 shadow-[0_18px_80px_rgba(33,26,13,0.08)]">
          <div className="mb-4">
            <h2 className="text-lg font-black tracking-tight">QR Links</h2>
            <p className="mt-1 text-sm leading-6 text-[#565b65]">
              Changing a link here immediately changes the matching QR code on the poster.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {QR_FIELDS.map((field) => (
              <label key={field.key} className="grid gap-2 rounded-2xl border border-[#e7e1d3] bg-white p-4">
                <span className="text-sm font-semibold text-[#171a1f]">{field.label}</span>
                <input
                  type="text"
                  value={qr[field.key]}
                  onChange={(event) => updateQr(field.key, event.target.value)}
                  className="rounded-2xl border border-[#ddd6c6] bg-white px-3 py-2 text-sm outline-none focus:border-[#171a1f]"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8d2c4] bg-[#fffdf8] p-5 shadow-[0_18px_80px_rgba(33,26,13,0.08)]">
          <div className="mb-4">
            <h2 className="text-lg font-black tracking-tight">Editable Text</h2>
            <p className="mt-1 text-sm leading-6 text-[#565b65]">
              Every visible text block on the poster can be edited here. Multi-line fields should use one line per visible line.
            </p>
          </div>
          <div className="grid gap-5">
            {TEXT_GROUPS.map((group) => (
              <section key={group.title} className="rounded-2xl border border-[#e7e1d3] bg-white p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#8a6a1d]">{group.title}</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <label key={field.key} className="grid gap-2">
                      <span className="text-sm font-semibold text-[#171a1f]">{field.label}</span>
                      {field.multiline ? (
                        <textarea
                          value={text[field.key]}
                          onChange={(event) => updateText(field.key, event.target.value)}
                          rows={4}
                          className="rounded-2xl border border-[#ddd6c6] bg-white px-3 py-2 text-sm outline-none focus:border-[#171a1f]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={text[field.key]}
                          onChange={(event) => updateText(field.key, event.target.value)}
                          className="rounded-2xl border border-[#ddd6c6] bg-white px-3 py-2 text-sm outline-none focus:border-[#171a1f]"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
