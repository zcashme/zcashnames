import { WALLET_BRANDS, type WalletBrand, type WalletBrandLogoAssets } from "@/lib/wallets/catalog";

function isPartnerWithLogos(brand: WalletBrand): brand is WalletBrand & { logos: WalletBrandLogoAssets } {
  return brand.partner && !!brand.logos;
}

function ThemeLogoLayer({
  logos,
  src,
  mode,
}: {
  logos: WalletBrandLogoAssets;
  src: string;
  mode: "dark" | "light" | "mono";
}) {
  const className =
    mode === "dark"
      ? "block [[data-theme=light]_&]:hidden [[data-theme=monochrome]_&]:hidden"
      : mode === "light"
        ? "hidden [[data-theme=light]_&]:block [[data-theme=monochrome]_&]:hidden"
        : "hidden [[data-theme=monochrome]_&]:block";

  return (
    <img
      src={src}
      alt={mode === "dark" ? logos.alt : ""}
      aria-hidden={mode === "dark" ? undefined : true}
      className={`${className} h-full w-auto object-contain`}
      loading="lazy"
      decoding="async"
    />
  );
}

function PartnerLogo({ logos }: { logos: WalletBrandLogoAssets }) {
  return (
    <span className="relative inline-flex h-7 shrink-0 items-center justify-center sm:h-8 md:h-9">
      <ThemeLogoLayer logos={logos} src={logos.dark ?? logos.default} mode="dark" />
      <ThemeLogoLayer logos={logos} src={logos.light ?? logos.default} mode="light" />
      <ThemeLogoLayer logos={logos} src={logos.mono ?? logos.default} mode="mono" />
    </span>
  );
}

export default function PartnerReel() {
  const brands = WALLET_BRANDS.filter(isPartnerWithLogos);

  if (brands.length === 0) return null;

  return (
    <section className="relative z-[2] mb-12 mt-12 w-full px-5 sm:mb-14 sm:mt-14 md:mb-16 md:mt-16">
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
      <div className="mx-auto grid max-w-xl grid-cols-1 items-center justify-items-center gap-x-12 gap-y-6 sm:grid-cols-2 sm:gap-y-7 md:gap-y-8">
        {brands.map((brand) => (
          <PartnerLogo key={brand.slug} logos={brand.logos} />
        ))}
      </div>
    </section>
  );
}
