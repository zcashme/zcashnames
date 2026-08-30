"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import LandingActionLink from "@/components/landing/LandingActionLink";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";
import { WALLET_BRANDS, type WalletBrand, type WalletBrandAppIcon } from "@/lib/wallets/catalog";

type PartnerReelItem = {
  id: string;
  displayName: string;
  iconSrc?: string;
  href?: string;
  kind?: "partner" | "cta";
};

type PartnerIconLayout = { scale: number; x?: number; y?: number };

const PARTNER_ICON_LAYOUT_BY_ID: Partial<Record<string, PartnerIconLayout>> = {
  edge: { scale: 0.70, y: 1 },
  cake: { scale: 0.98, x: 1, y: 1 },
  unstoppable: { scale: 0.62 },
  zipher: { scale: 1.25, y: -1 },
  zingo: { scale: 1.2, x: 2, y: 1 },
  noir: { scale: 1.2 },
  cipherscan: { scale: 0.65 },
};

const EXTRA_PARTNERS: readonly PartnerReelItem[] = [
  {
    id: "cipherscan",
    displayName: "Cipherscan",
    iconSrc: "/icons/cipherscan.png",
    href: "https://cipherscan.app",
  },
  {
    id: "cyze",
    displayName: "Cyze",
    iconSrc: "/icons/cyze.svg",
    href: "https://github.com/USCMig/Cyze",
  },
  {
    id: "developer-guide",
    displayName: "Developer Guide",
    href: "/docs/zns-developer-guide",
    kind: "cta",
  },
];

const PARTNER_ORDER = ["zingo", "cipherscan", "cyze", "unstoppable", "edge", "zipher", "noir", "cake", "developer-guide"] as const;

function isPartnerWithAppIcon(brand: WalletBrand): brand is WalletBrand & { appIcon: WalletBrandAppIcon } {
  return brand.partner && !!brand.appIcon;
}

function toPartnerReelItem(brand: WalletBrand & { appIcon: WalletBrandAppIcon }): PartnerReelItem {
  return {
    id: brand.slug,
    displayName: brand.displayName.replace(/\s+Wallet$/, ""),
    iconSrc: brand.appIcon.src,
    href: `/beta/${brand.slug}`,
  };
}

function normalizeOffset(offset: number, width: number): number {
  if (width <= 0) return 0;

  let next = offset;
  while (next <= -width) next += width;
  while (next > 0) next -= width;
  return next;
}

function IntegrateZnsLink() {
  return (
    <LandingActionLink
      proximityId="integrate-zns-link"
      href="/docs/zns-developer-guide"
      label="Integrate ZNS"
      variant="text"
      showArrow
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <path d="m8.5 5-5 7 5 7M15.5 5l5 7-5 7M14 4l-4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    />
  );
}

function PartnerIcon({ item }: { item: PartnerReelItem }) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  if (item.kind === "cta" && item.href) {
    return (
      <a
        href={item.href}
        className="group relative flex min-w-[10rem] flex-col items-center gap-2 px-7 py-4 text-center transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--partner-card-border-hover)]"
        onMouseEnter={() => setIsHighlighted(true)}
        onMouseLeave={() => setIsHighlighted(false)}
        onFocus={() => setIsHighlighted(true)}
        onBlur={() => setIsHighlighted(false)}
      >
        <div
          className="flex h-16 w-16 items-center justify-center text-[2rem] font-semibold leading-none sm:h-20 sm:w-20 sm:text-[2.4rem]"
          style={{
            color: "var(--fg-body)",
            transform: `scale(${isHighlighted ? 1.16 : 1})`,
            transition: "transform 200ms ease-out",
          }}
        >
          +
        </div>
        <span
          className="text-xs font-semibold leading-tight transition-colors duration-200 sm:text-sm"
          style={{ color: "var(--fg-muted)" }}
        >
          {item.displayName}
        </span>
      </a>
    );
  }

  const iconLayout = PARTNER_ICON_LAYOUT_BY_ID[item.id] ?? { scale: 1 };
  const iconTransform = `translate(${iconLayout.x ?? 0}px, ${iconLayout.y ?? 0}px) scale(${iconLayout.scale * (isHighlighted ? 1.16 : 1)})`;

  const content = (
    <>
      <div className="flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <img
          src={item.iconSrc ?? ""}
          alt=""
          aria-hidden="true"
          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
          style={{ transform: iconTransform, transition: "transform 200ms ease-out" }}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span
        className="text-xs font-semibold leading-tight transition-colors duration-200 sm:text-sm"
        style={{ color: "var(--fg-muted)" }}
      >
        {item.displayName}
      </span>
    </>
  );

  if (item.href) {
    const isExternal = /^https?:\/\//.test(item.href);

    return (
      <a
        href={item.href}
        className="group relative flex min-w-[10rem] flex-col items-center gap-2 px-7 py-4 text-center transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--partner-card-border-hover)]"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onMouseEnter={() => setIsHighlighted(true)}
        onMouseLeave={() => setIsHighlighted(false)}
        onFocus={() => setIsHighlighted(true)}
        onBlur={() => setIsHighlighted(false)}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className="group relative flex min-w-[10rem] flex-col items-center gap-2 px-7 py-4 text-center transition-colors duration-200 ease-out"
      onMouseEnter={() => setIsHighlighted(true)}
      onMouseLeave={() => setIsHighlighted(false)}
    >
      {content}
    </div>
  );
}

function MarqueeRow({
  items,
  direction,
  speed,
}: {
  items: PartnerReelItem[];
  direction: "left" | "right";
  speed: number;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const segmentRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef(0);
  const offsetRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastPointerXRef = useRef(0);
  const hoveredRef = useRef(false);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const applyTransform = (offset: number) => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
  };

  useEffect(() => {
    const measure = () => {
      const width = segmentRef.current?.scrollWidth ?? 0;
      widthRef.current = width;
      setSegmentWidth(width);
      offsetRef.current = direction === "right" ? -width : 0;
      applyTransform(offsetRef.current);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    if (segmentRef.current) observer.observe(segmentRef.current);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [direction, items]);

  useEffect(() => {
    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const width = widthRef.current;
      if (width > 0 && !hoveredRef.current && !draggingRef.current) {
        const elapsed = (timestamp - lastTimestampRef.current) / 1000;
        const delta = speed * elapsed * (direction === "left" ? -1 : 1);
        offsetRef.current = normalizeOffset(offsetRef.current + delta, width);
        applyTransform(offsetRef.current);
      }

      lastTimestampRef.current = timestamp;
      frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      lastTimestampRef.current = null;
    };
  }, [direction, speed]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (segmentWidth <= 0) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    draggingRef.current = true;
    pointerIdRef.current = event.pointerId;
    lastPointerXRef.current = event.clientX;
    lastTimestampRef.current = null;
    hoveredRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId || segmentWidth <= 0) return;

    const deltaX = event.clientX - lastPointerXRef.current;
    lastPointerXRef.current = event.clientX;
    offsetRef.current = normalizeOffset(offsetRef.current + deltaX, segmentWidth);
    applyTransform(offsetRef.current);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;

    draggingRef.current = false;
    pointerIdRef.current = null;
    hoveredRef.current = isHovered;
    setIsDragging(false);
    lastTimestampRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleMouseEnter = () => {
    hoveredRef.current = true;
    setIsHovered(true);
    lastTimestampRef.current = null;
  };

  const handleMouseLeave = () => {
    if (draggingRef.current) return;
    hoveredRef.current = false;
    setIsHovered(false);
    lastTimestampRef.current = null;
  };

  const rowIsPaused = isHovered || isDragging;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 sm:w-16"
        style={{ background: "linear-gradient(90deg, var(--color-background) 0%, transparent 100%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 sm:w-16"
        style={{ background: "linear-gradient(270deg, var(--color-background) 0%, transparent 100%)" }}
        aria-hidden="true"
      />
      <div
        ref={viewportRef}
        className={`overflow-hidden px-2 py-2 sm:px-3 ${rowIsPaused ? "cursor-grab" : "cursor-default"} ${isDragging ? "cursor-grabbing" : ""}`}
        style={{
          touchAction: "pan-y",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          <div ref={segmentRef} className="flex">
            {items.map((item, index) => (
              <div
                key={`${direction}-a-${item.id}`}
                className={`flex items-stretch ${index > 0 ? "border-l" : ""}`}
                style={{ borderColor: "var(--partner-card-border)" }}
              >
                <PartnerIcon item={item} />
              </div>
            ))}
          </div>
          <div className="flex border-l" style={{ borderColor: "var(--partner-card-border)" }} aria-hidden="true">
            {items.map((item, index) => (
              <div
                key={`${direction}-b-${item.id}`}
                className={`flex items-stretch ${index > 0 ? "border-l" : ""}`}
                style={{ borderColor: "var(--partner-card-border)" }}
              >
                <PartnerIcon item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerReel({ compactTopSpacing = false }: { compactTopSpacing?: boolean }) {
  const partners = useMemo(
    () =>
      [...WALLET_BRANDS.filter(isPartnerWithAppIcon).map(toPartnerReelItem), ...EXTRA_PARTNERS].sort(
        (a, b) =>
          PARTNER_ORDER.indexOf(a.id as (typeof PARTNER_ORDER)[number]) -
          PARTNER_ORDER.indexOf(b.id as (typeof PARTNER_ORDER)[number]),
      ),
    [],
  );

  if (partners.length === 0) return null;

  return (
    <section
      id="supporters"
      className={`relative z-[2] mb-24 w-full px-5 ${compactTopSpacing ? "mt-4 sm:mt-16" : "mt-24"}`}
    >
      <div className="mb-6 text-center">
        <SectionHeaderPill id="supported-by-pill" title="Partners" variant="pill" />
      </div>

      <div className="mx-auto max-w-6xl">
        <MarqueeRow items={partners} direction="left" speed={20} />
      </div>

      <div className="mt-5 flex justify-center">
        <IntegrateZnsLink />
      </div>
    </section>
  );
}
