import type { WalletBrand } from "@/lib/wallets/catalog";

interface WalletBrandLogoProps {
  brand: WalletBrand | null;
  className?: string;
}

const logoStyle: React.CSSProperties = {
  width: "min(100%, 320px)",
  height: "auto",
  maxHeight: 76,
  objectFit: "contain",
};

export default function WalletBrandLogo({ brand, className = "" }: WalletBrandLogoProps) {
  const logos = brand?.logos;
  if (!logos) return null;

  const darkLogo = logos.dark ?? logos.default;
  const lightLogo = logos.light ?? logos.default;
  const monoLogo = logos.mono ?? logos.default;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`.trim()}>
      <img
        src={darkLogo}
        alt={logos.alt}
        className="block [[data-theme=light]_&]:hidden [[data-theme=monochrome]_&]:hidden"
        style={logoStyle}
      />
      <img
        src={lightLogo}
        alt=""
        aria-hidden="true"
        className="hidden [[data-theme=light]_&]:block [[data-theme=monochrome]_&]:hidden"
        style={logoStyle}
      />
      <img
        src={monoLogo}
        alt=""
        aria-hidden="true"
        className="hidden [[data-theme=monochrome]_&]:block"
        style={logoStyle}
      />
    </div>
  );
}

