import type { WalletBetaDownloadItem } from "@/lib/wallets/catalog";

type Props = {
  item: WalletBetaDownloadItem;
  sizeClassName?: string;
};

export default function WalletDownloadBadge({
  item,
  sizeClassName = "h-14 w-auto",
}: Props) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      aria-label={item.alt}
      title={item.label}
      className="inline-flex overflow-hidden rounded-[8px]"
      style={{
        background: "transparent",
        border: "none",
        boxShadow: "none",
        isolation: "isolate",
      }}
    >
      <img
        src={item.src}
        alt={item.alt}
        className={item.monoSrc
          ? `block ${sizeClassName} object-contain [[data-theme=monochrome]_&]:hidden`
          : `block ${sizeClassName} object-contain`}
        loading="lazy"
        decoding="async"
        style={{ filter: "none", mixBlendMode: "normal" }}
      />
      {item.monoSrc ? (
        <img
          src={item.monoSrc}
          alt=""
          className={`hidden ${sizeClassName} object-contain [[data-theme=monochrome]_&]:block`}
          loading="lazy"
          decoding="async"
          style={{ filter: "none", mixBlendMode: "normal" }}
        />
      ) : null}
    </a>
  );
}
