"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { WALLET_BRANDS, type WalletBrand, type WalletBrandAppIcon } from "@/lib/wallets/catalog";

const PROXIMITY_RADIUS = 140;
type PartnerReelItem = {
  id: string;
  displayName: string;
  iconSrc: string;
};

type PartnerIconLayout = { scale: number; x?: number; y?: number };

const PARTNER_ICON_LAYOUT_BY_ID: Partial<Record<string, PartnerIconLayout>> = {
  edge: { scale: 0.70, y: 1 },
  cake: { scale: 0.98, x: 1, y: 1 },
  unstoppable: { scale: 0.62 },
  zipher: { scale: 1.25, y: -1},
  zingo: { scale: 1.2, x: 2, y: 1 },
  noir: { scale: 1.2 },
  cipherscan: { scale: 0.65 },
};

function isPartnerWithAppIcon(brand: WalletBrand): brand is WalletBrand & { appIcon: WalletBrandAppIcon } {
  return brand.partner && !!brand.appIcon;
}

function toPartnerReelItem(brand: WalletBrand & { appIcon: WalletBrandAppIcon }): PartnerReelItem {
  return {
    id: brand.slug,
    displayName: brand.displayName.replace(/\s+Wallet$/, ""),
    iconSrc: brand.appIcon.src,
  };
}

const EXTRA_PARTNERS: readonly PartnerReelItem[] = [
  {
    id: "cipherscan",
    displayName: "Cipherscan",
    iconSrc: "/icons/cipherscan.png",
  },
];

const PARTNER_ORDER = ["zingo", "cipherscan", "unstoppable", "edge", "zipher", "noir", "cake"] as const;

function PartnerIcon({
  item,
  register,
}: {
  item: PartnerReelItem;
  register: (id: string, node: HTMLDivElement | null) => void;
}) {
  const iconLayout = PARTNER_ICON_LAYOUT_BY_ID[item.id] ?? { scale: 1 };
  const iconTransform = `translate(${iconLayout.x ?? 0}px, ${iconLayout.y ?? 0}px) scale(${iconLayout.scale})`;

  return (
    <div
      ref={(node) => register(item.id, node)}
      className="flex flex-col items-center gap-2.5 text-center transition-[transform,box-shadow] duration-200 ease-out will-change-transform"
      style={{
        transform: "translateZ(0) scale(var(--partner-scale, 1))",
        boxShadow: "0 14px 28px rgba(0, 0, 0, var(--partner-shadow-opacity, 0))",
      }}
    >
      <div className="flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <img
          src={item.iconSrc}
          alt=""
          aria-hidden="true"
          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
          style={{ transform: iconTransform }}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className="text-xs font-semibold leading-tight sm:text-sm" style={{ color: "var(--fg-muted)" }}>
        {item.displayName}
      </span>
    </div>
  );
}

function partnerRowClasses(index: number, total: number) {
  if (total === 7) {
    if (index < 2) return "col-span-3";
    if (index < 5) return "col-span-2";
    return "col-span-3";
  }

  return "col-span-3 sm:col-span-2";
}

export default function PartnerReel() {
  const partners = [...WALLET_BRANDS.filter(isPartnerWithAppIcon).map(toPartnerReelItem), ...EXTRA_PARTNERS].sort(
    (a, b) => PARTNER_ORDER.indexOf(a.id as (typeof PARTNER_ORDER)[number]) - PARTNER_ORDER.indexOf(b.id as (typeof PARTNER_ORDER)[number]),
  );
  const iconRefs = useRef(new Map<string, HTMLDivElement>());

  if (partners.length === 0) return null;

  const register = (slug: string, node: HTMLDivElement | null) => {
    if (node) {
      iconRefs.current.set(slug, node);
      return;
    }
    iconRefs.current.delete(slug);
  };

  const resetIcons = () => {
    for (const node of iconRefs.current.values()) {
      node.style.setProperty("--partner-scale", "1");
      node.style.setProperty("--partner-shadow-opacity", "0");
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;

    for (const node of iconRefs.current.values()) {
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      const influence = Math.max(0, 1 - distance / PROXIMITY_RADIUS);
      const eased = influence * influence;

      node.style.setProperty("--partner-scale", `${1 + eased * 0.24}`);
      node.style.setProperty("--partner-shadow-opacity", `${eased * 0.16}`);
    }
  };

  return (
    <section
      className="relative z-[2] mb-12 mt-12 w-full px-5 sm:mb-14 sm:mt-14 md:mb-16 md:mt-16"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetIcons}
    >
      <div className="mb-10 flex items-center justify-center gap-3.5">
        <span
          className="block h-px w-[clamp(24px,9vw,96px)] shrink-0"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-from) 0%, var(--feature-heading-line-to) 100%)" }}
          aria-hidden="true"
        />
        <p
          className="relative z-[1] m-0 whitespace-nowrap bg-clip-text px-3.5 text-transparent type-kicker"
          style={{ backgroundImage: "var(--feature-heading-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Supported By
        </p>
        <span
          className="block h-px w-[clamp(24px,9vw,96px)] shrink-0"
          style={{ background: "linear-gradient(90deg, var(--feature-heading-line-to) 0%, var(--feature-heading-line-from) 100%)" }}
          aria-hidden="true"
        />
      </div>
      <p
        className="type-section-subtitle mx-auto mb-10 max-w-2xl text-center"
        style={{ color: "var(--fg-muted)" }}
      >
        Wallets, apps, and ecosystem teams already helping bring Zcash names to life. To integrate, visit the{" "}
        <a href="/docs/zns-developer-guide" className="underline" style={{ color: "var(--fg-body)" }}>
          developer guide
        </a>
        .
      </p>
      <div className="mx-auto grid max-w-[28rem] grid-cols-6 items-start justify-items-center gap-x-6 gap-y-8 sm:max-w-[34rem] sm:gap-x-8 sm:gap-y-10">
        {partners.map((item, index) => (
          <div key={item.id} className={partnerRowClasses(index, partners.length)}>
            <PartnerIcon item={item} register={register} />
          </div>
        ))}
      </div>
    </section>
  );
}
