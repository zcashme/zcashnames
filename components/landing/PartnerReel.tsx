"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
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
  },
  {
    id: "developer-guide",
    displayName: "Developer Guide",
    href: "/docs/zns-developer-guide",
    kind: "cta",
  },
];

const PARTNER_ORDER = ["zingo", "cipherscan", "unstoppable", "edge", "zipher", "noir", "cake", "developer-guide"] as const;

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

function WalletsLink() {
  return (
    <LandingActionLink
      proximityId="wallets-link"
      href="/beta/wallets"
      label="Wallets"
      showArrow={false}
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <path d="M4.75 7.25A2.25 2.25 0 0 1 7 5h10.25A1.75 1.75 0 0 1 19 6.75v1.5H8.25A2.25 2.25 0 0 0 6 10.5v3A2.25 2.25 0 0 0 8.25 15.75H19v1.5A1.75 1.75 0 0 1 17.25 19H7A2.25 2.25 0 0 1 4.75 16.75v-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M6 10.5A1.75 1.75 0 0 1 7.75 8.75H19.25V15.25H7.75A1.75 1.75 0 0 1 6 13.5v-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="15.75" cy="12" r="1" fill="currentColor" />
        </svg>
      }
    />
  );
}

function PartnerIcon({ item }: { item: PartnerReelItem }) {
  const cardRef = useRef<HTMLAnchorElement | HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10,
      y: ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  if (item.kind === "cta" && item.href) {
    return (
      <a
        ref={(node) => {
          cardRef.current = node;
        }}
        href={item.href}
        className="group flex min-w-[10rem] flex-col items-center gap-2 px-7 py-4 text-center transition-[transform,color] duration-300 ease-out"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(860px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovering ? 1.08 : 1})`,
          transformStyle: "preserve-3d",
          boxShadow: isHovering ? "0 22px 36px rgba(0, 0, 0, 0.14)" : "none",
        }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center text-[2rem] font-semibold leading-none transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20 sm:text-[2.4rem]"
          style={{
            color: isHovering ? "var(--fg-heading)" : "var(--fg-body)",
            transform: "translateZ(22px)",
          }}
        >
          +
        </div>
        <span
          className="text-xs font-semibold leading-tight transition-colors duration-300 group-hover:text-fg-heading sm:text-sm"
          style={{ color: "var(--fg-muted)", transform: "translateZ(16px)" }}
        >
          {item.displayName}
        </span>
      </a>
    );
  }

  const iconLayout = PARTNER_ICON_LAYOUT_BY_ID[item.id] ?? { scale: 1 };
  const iconTransform = `translate(${iconLayout.x ?? 0}px, ${iconLayout.y ?? 0}px) scale(${iconLayout.scale})`;

  const content = (
    <>
      <div className="flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <img
          src={item.iconSrc ?? ""}
          alt=""
          aria-hidden="true"
          className="h-16 w-16 object-contain transition-transform duration-300 sm:h-20 sm:w-20"
          style={{ transform: `${iconTransform} translateZ(22px)` }}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span
        className="text-xs font-semibold leading-tight transition-colors duration-300 group-hover:text-fg-heading sm:text-sm"
        style={{ color: "var(--fg-muted)", transform: "translateZ(16px)" }}
      >
        {item.displayName}
      </span>
    </>
  );

  if (item.href) {
    return (
      <a
        ref={(node) => {
          cardRef.current = node;
        }}
        href={item.href}
        className="group flex min-w-[10rem] flex-col items-center gap-2 px-7 py-4 text-center transition-[transform,color] duration-300 ease-out"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(860px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovering ? 1.08 : 1})`,
          transformStyle: "preserve-3d",
          boxShadow: isHovering ? "0 22px 36px rgba(0, 0, 0, 0.14)" : "none",
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      ref={(node) => {
        cardRef.current = node;
      }}
      className="group flex min-w-[10rem] flex-col items-center gap-2 px-7 py-4 text-center transition-[transform,color] duration-300 ease-out"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(860px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovering ? 1.08 : 1})`,
        transformStyle: "preserve-3d",
        boxShadow: isHovering ? "0 22px 36px rgba(0, 0, 0, 0.14)" : "none",
      }}
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

export default function PartnerReel() {
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
    <section id="supported-by" className="relative z-[2] my-24 w-full px-5">
      <div className="mb-14 flex justify-center">
        <SectionHeaderPill id="supported-by-pill" title="Supported By" />
      </div>
      <p
        className="type-section-subtitle mx-auto mb-16 max-w-2xl text-center"
        style={{ color: "var(--fg-muted)" }}
      >
        Wallets, apps, and ecosystem teams already helping bring Zcash names to life. To integrate, visit the{" "}
        <a href="/docs/zns-developer-guide" className="underline" style={{ color: "var(--fg-body)" }}>
          developer guide
        </a>
        .
      </p>

      <div className="mx-auto max-w-6xl">
        <MarqueeRow items={partners} direction="left" speed={20} />
      </div>

      <div className="mt-8 flex justify-center">
        <WalletsLink />
      </div>
    </section>
  );
}
