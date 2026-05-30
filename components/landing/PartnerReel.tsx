"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { WALLET_BRANDS, type WalletBrand, type WalletBrandAppIcon } from "@/lib/wallets/catalog";

const PROXIMITY_RADIUS = 140;

function isPartnerWithAppIcon(brand: WalletBrand): brand is WalletBrand & { appIcon: WalletBrandAppIcon } {
  return brand.partner && !!brand.appIcon;
}

function PartnerIcon({
  brand,
  register,
}: {
  brand: WalletBrand & { appIcon: WalletBrandAppIcon };
  register: (slug: string, node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={(node) => register(brand.slug, node)}
      className="flex flex-col items-center gap-2.5 text-center transition-[transform,box-shadow] duration-200 ease-out will-change-transform"
      style={{
        transform: "translateZ(0) scale(var(--partner-scale, 1))",
        boxShadow: "0 14px 28px rgba(0, 0, 0, var(--partner-shadow-opacity, 0))",
      }}
    >
      <img
        src={brand.appIcon.src}
        alt=""
        aria-hidden="true"
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        loading="lazy"
        decoding="async"
      />
      <span className="text-xs font-semibold leading-tight sm:text-sm" style={{ color: "var(--fg-muted)" }}>
        {brand.displayName}
      </span>
    </div>
  );
}

export default function PartnerReel() {
  const brands = WALLET_BRANDS.filter(isPartnerWithAppIcon);
  const iconRefs = useRef(new Map<string, HTMLDivElement>());

  if (brands.length === 0) return null;

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
      <div className="mx-auto grid max-w-sm grid-cols-2 items-start justify-items-center gap-x-12 gap-y-8 sm:max-w-md sm:gap-x-14 sm:gap-y-10">
        {brands.map((brand) => (
          <PartnerIcon key={brand.slug} brand={brand} register={register} />
        ))}
      </div>
    </section>
  );
}
