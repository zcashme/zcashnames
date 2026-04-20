import Image from "next/image";

const logoPaths = {
  light: "/brandkit/zcashnames-primary-logo-black-transparent-377x403.svg",
  dark: "/brandkit/zcashnames-primary-logo-white-transparent-377x403.svg",
  monochrome: "/brandkit/zcashnames-primary-logo-monochrome-green-transparent-377x403.svg",
};

export default function ZcashNamesLogoMark({
  alt = "ZcashNames",
  size = 40,
  className = "",
  priority = false,
}: {
  alt?: string;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={logoPaths.dark}
        alt={alt}
        width={377}
        height={403}
        priority={priority}
        className="theme-chrome-media block h-full w-full object-contain [[data-theme=light]_&]:hidden [[data-theme=monochrome]_&]:hidden"
      />
      <Image
        src={logoPaths.light}
        alt=""
        width={377}
        height={403}
        priority={priority}
        className="theme-chrome-media hidden h-full w-full object-contain [[data-theme=light]_&]:block"
      />
      <span
        className="absolute inset-0 hidden [[data-theme=monochrome]_&]:block pointer-events-none"
        style={{
          background: "var(--fg-heading)",
          WebkitMaskImage: `url('${logoPaths.monochrome}')`,
          maskImage: `url('${logoPaths.monochrome}')`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
        aria-hidden="true"
      />
    </span>
  );
}
