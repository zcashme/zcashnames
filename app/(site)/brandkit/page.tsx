import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Brand Kit | ZcashNames",
  description: "Download ZcashNames logo, banner, and brand lockup assets.",
};

type Asset = {
  name: string;
  file: string;
  svgFile?: string;
  dimensions: string;
  mode: "Dark" | "Light" | "Monochrome" | "Black" | "White";
  transparent?: boolean;
  surface: "dark" | "light" | "mono" | "checker";
};

type AssetGroup = {
  title: string;
  description: string;
  assets: Asset[];
};

type Filters = {
  type: string;
  logo: string;
  variation: string;
  mode: string;
  background: string;
};

const assetBase = "/brandkit/";

const groups: AssetGroup[] = [
  {
    title: "Primary Logo",
    description: "Transparent logo marks derived from the rough primary ZcashNames mark.",
    assets: [
      logo("Primary Logo Black", "zcashnames-primary-logo-black-transparent-377x403.png", "377x403", "Black", "checker", true),
      logo("Primary Logo White", "zcashnames-primary-logo-white-transparent-377x403.png", "377x403", "White", "checker", true),
      logo("Primary Logo Monochrome Green", "zcashnames-primary-logo-monochrome-green-transparent-377x403.png", "377x403", "Monochrome", "checker", true),
    ],
  },
  {
    title: "Secondary Logo",
    description: "Transparent logo marks derived from the rotated Zcash mark.",
    assets: [
      logo("Secondary Logo Black", "zcashnames-secondary-logo-black-transparent-545x554.png", "545x554", "Black", "checker", true),
      logo("Secondary Logo White", "zcashnames-secondary-logo-white-transparent-545x554.png", "545x554", "White", "checker", true),
      logo("Secondary Logo Monochrome Green", "zcashnames-secondary-logo-monochrome-green-transparent-545x554.png", "545x554", "Monochrome", "checker", true),
    ],
  },
  {
    title: "Logos With Square Backgrounds",
    description: "Logo marks on square color backgrounds for avatars and fixed-crop placements.",
    assets: [
      logo("Primary Black On White", "zcashnames-primary-logo-black-white-square-background-403x403.png", "403x403", "Light", "checker"),
      logo("Primary White On Black", "zcashnames-primary-logo-white-black-square-background-403x403.png", "403x403", "Dark", "checker"),
      logo("Primary Green On Dark Green", "zcashnames-primary-logo-monochrome-green-dark-green-square-background-403x403.png", "403x403", "Monochrome", "checker"),
      logo("Secondary Black On White", "zcashnames-secondary-logo-black-white-square-background-554x554.png", "554x554", "Light", "checker"),
      logo("Secondary White On Black", "zcashnames-secondary-logo-white-black-square-background-554x554.png", "554x554", "Dark", "checker"),
      logo("Secondary Green On Dark Green", "zcashnames-secondary-logo-monochrome-green-dark-green-square-background-554x554.png", "554x554", "Monochrome", "checker"),
    ],
  },
  {
    title: "Ensquared Logos",
    description: "Transparent primary and secondary marks with square enclosing borders.",
    assets: [
      logo("Primary Ensquared Black", "zcashnames-primary-logo-ensquared-black-transparent-377x403.png", "377x403", "Black", "checker", true),
      logo("Primary Ensquared White", "zcashnames-primary-logo-ensquared-white-transparent-377x403.png", "377x403", "White", "checker", true),
      logo("Primary Ensquared Monochrome Green", "zcashnames-primary-logo-ensquared-monochrome-green-transparent-377x403.png", "377x403", "Monochrome", "checker", true),
      logo("Secondary Ensquared Black", "zcashnames-secondary-logo-ensquared-black-transparent-545x554.png", "545x554", "Black", "checker", true),
      logo("Secondary Ensquared White", "zcashnames-secondary-logo-ensquared-white-transparent-545x554.png", "545x554", "White", "checker", true),
      logo("Secondary Ensquared Monochrome Green", "zcashnames-secondary-logo-ensquared-monochrome-green-transparent-545x554.png", "545x554", "Monochrome", "checker", true),
    ],
  },
  {
    title: "Ensquared Logos With Square Backgrounds",
    description: "Ensquared logo marks on square color backgrounds for avatars and fixed-crop placements.",
    assets: [
      logo("Primary Ensquared Black On White", "zcashnames-primary-logo-ensquared-black-white-square-background-403x403.png", "403x403", "Light", "checker"),
      logo("Primary Ensquared White On Black", "zcashnames-primary-logo-ensquared-white-black-square-background-403x403.png", "403x403", "Dark", "checker"),
      logo("Primary Ensquared Green On Dark Green", "zcashnames-primary-logo-ensquared-monochrome-green-dark-green-square-background-403x403.png", "403x403", "Monochrome", "checker"),
      logo("Secondary Ensquared Black On White", "zcashnames-secondary-logo-ensquared-black-white-square-background-554x554.png", "554x554", "Light", "checker"),
      logo("Secondary Ensquared White On Black", "zcashnames-secondary-logo-ensquared-white-black-square-background-554x554.png", "554x554", "Dark", "checker"),
      logo("Secondary Ensquared Green On Dark Green", "zcashnames-secondary-logo-ensquared-monochrome-green-dark-green-square-background-554x554.png", "554x554", "Monochrome", "checker"),
    ],
  },
  {
    title: "Transparent Banners",
    description: "Horizontal logo and wordmark banners on transparent backgrounds.",
    assets: [
      banner("Primary Black Banner", "zcashnames-brand-banner-primary-logo-black-transparent-377x403.png", "2006x467", "Black", "checker", true),
      banner("Primary White Banner", "zcashnames-brand-banner-primary-logo-white-transparent-377x403.png", "2006x467", "White", "checker", true),
      banner("Primary Monochrome Banner", "zcashnames-brand-banner-primary-logo-monochrome-green-transparent-377x403.png", "2006x467", "Monochrome", "checker", true),
      banner("Secondary Black Banner", "zcashnames-brand-banner-secondary-logo-black-transparent-545x554.png", "2780x642", "Black", "checker", true),
      banner("Secondary White Banner", "zcashnames-brand-banner-secondary-logo-white-transparent-545x554.png", "2780x642", "White", "checker", true),
      banner("Secondary Monochrome Banner", "zcashnames-brand-banner-secondary-logo-monochrome-green-transparent-545x554.png", "2780x642", "Monochrome", "checker", true),
    ],
  },
  {
    title: "Banners With Backgrounds",
    description: "Horizontal banners exported with their intended color-mode backgrounds.",
    assets: [
      banner("Primary Black On Light", "zcashnames-brand-banner-primary-logo-black-light-background-377x403.png", "2006x467", "Light", "checker"),
      banner("Primary White On Dark", "zcashnames-brand-banner-primary-logo-white-dark-background-377x403.png", "2006x467", "Dark", "checker"),
      banner("Primary Green On Monochrome", "zcashnames-brand-banner-primary-logo-monochrome-green-monochrome-green-background-377x403.png", "2006x467", "Monochrome", "checker"),
      banner("Secondary Black On Light", "zcashnames-brand-banner-secondary-logo-black-light-background-545x554.png", "2780x642", "Light", "checker"),
      banner("Secondary White On Dark", "zcashnames-brand-banner-secondary-logo-white-dark-background-545x554.png", "2780x642", "Dark", "checker"),
      banner("Secondary Green On Monochrome", "zcashnames-brand-banner-secondary-logo-monochrome-green-monochrome-green-background-545x554.png", "2780x642", "Monochrome", "checker"),
    ],
  },
  {
    title: "Stacked Brand Lockups",
    description: "Logo, name, and slogan arranged for social posts, video, and previews.",
    assets: [
      lockup("Dark Landscape", "zcashnames-brand-lockups-stacked-primary-logo-dark-landscape-16x9-1920x1080.png", "1920x1080", "Dark"),
      lockup("Dark Square", "zcashnames-brand-lockups-stacked-primary-logo-dark-square-1x1-1080x1080.png", "1080x1080", "Dark"),
      lockup("Dark Portrait", "zcashnames-brand-lockups-stacked-primary-logo-dark-portrait-4x5-1080x1350.png", "1080x1350", "Dark"),
      lockup("Light Landscape", "zcashnames-brand-lockups-stacked-primary-logo-light-landscape-16x9-1920x1080.png", "1920x1080", "Light"),
      lockup("Light Square", "zcashnames-brand-lockups-stacked-primary-logo-light-square-1x1-1080x1080.png", "1080x1080", "Light"),
      lockup("Light Portrait", "zcashnames-brand-lockups-stacked-primary-logo-light-portrait-4x5-1080x1350.png", "1080x1350", "Light"),
      lockup("Monochrome Landscape", "zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-landscape-16x9-1920x1080.png", "1920x1080", "Monochrome"),
      lockup("Monochrome Square", "zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-square-1x1-1080x1080.png", "1080x1080", "Monochrome"),
      lockup("Monochrome Portrait", "zcashnames-brand-lockups-stacked-primary-logo-monochrome-green-portrait-4x5-1080x1350.png", "1080x1350", "Monochrome"),
    ],
  },
];

function logo(name: string, file: string, dimensions: string, mode: Asset["mode"], surface: Asset["surface"], transparent = false): Asset {
  return { name, file, svgFile: file.replace(".png", ".svg"), dimensions, mode, surface, transparent };
}

function banner(name: string, file: string, dimensions: string, mode: Asset["mode"], surface: Asset["surface"], transparent = false): Asset {
  return { name, file, svgFile: file.replace(".png", ".svg"), dimensions, mode, surface, transparent };
}

function lockup(name: string, file: string, dimensions: string, mode: Asset["mode"]): Asset {
  const surface = "checker";
  return { name, file, dimensions, mode, surface };
}

function previewStyle(surface: Asset["surface"]): CSSProperties {
  if (surface === "dark") return { background: "#0a0a0a" };
  if (surface === "light") return { background: "#fefcf7" };
  if (surface === "mono") return { background: "#0f380f" };
  return {
    backgroundColor: "#d9d9d9",
    backgroundImage:
      "linear-gradient(45deg, #b8b8b8 25%, transparent 25%), linear-gradient(-45deg, #b8b8b8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #b8b8b8 75%), linear-gradient(-45deg, transparent 75%, #b8b8b8 75%)",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    backgroundSize: "20px 20px",
  };
}

export default async function BrandKitPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters: Filters = {
    type: firstParam(params.type) ?? "all",
    logo: firstParam(params.logo) ?? "all",
    variation: firstParam(params.variation) ?? "all",
    mode: firstParam(params.mode) ?? "all",
    background: firstParam(params.background) ?? "all",
  };
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      assets: group.assets.filter((asset) => matchesFilters(group, asset, filters)),
    }))
    .filter((group) => group.assets.length > 0);
  const visibleCount = filteredGroups.reduce((total, group) => total + group.assets.length, 0);
  const totalCount = groups.reduce((total, group) => total + group.assets.length, 0);

  return (
    <main className="w-full">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="type-chip font-semibold uppercase tracking-[0.16em] text-fg-muted">Brand Kit</p>
          <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
            ZcashNames assets
          </h1>
          <p className="type-section-subtitle text-fg-body">
            Download logo marks, banners, and stacked brand lockups for ZcashNames.
          </p>
        </div>

        <div className="grid gap-4 rounded-lg border border-border-muted bg-[var(--color-raised)] p-5 sm:grid-cols-3">
          <UsageNote label="Format" value="PNG; SVG for logos and banners" />
          <ColorModeNote separated />
          <UsageNote label="Typography" value="Inter, 400 weight" separated />
        </div>

        <FilterPanel filters={filters} visibleCount={visibleCount} totalCount={totalCount} />

        {filteredGroups.map((group) => (
          <section key={group.title} className="flex flex-col gap-5">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-fg-heading">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-fg-body">{group.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.assets.map((asset) => (
                <AssetCard key={asset.file} asset={asset} />
              ))}
            </div>
          </section>
        ))}

        {visibleCount === 0 && (
          <div className="rounded-lg border border-border-muted bg-[var(--color-card)] p-6">
            <p className="text-sm font-semibold text-fg-heading">No assets match those filters.</p>
            <p className="mt-2 text-sm text-fg-muted">Clear one of the filters to see more files.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function groupType(group: AssetGroup): string {
  if (group.title.includes("Banner")) return "banners";
  if (group.title.includes("Lockup")) return "lockups";
  return "logos";
}

function assetLogo(asset: Asset): string {
  if (asset.file.includes("secondary-logo")) return "secondary";
  return "primary";
}

function assetVariation(asset: Asset): string {
  return asset.file.includes("ensquared") ? "ensquared" : "encircled";
}

function assetBackground(asset: Asset): string {
  return asset.transparent ? "transparent" : "with-background";
}

function matchesFilters(group: AssetGroup, asset: Asset, filters: Filters): boolean {
  if (filters.type !== "all" && groupType(group) !== filters.type) return false;
  if (filters.logo !== "all" && assetLogo(asset) !== filters.logo) return false;
  if (filters.variation !== "all" && assetVariation(asset) !== filters.variation) return false;
  if (filters.mode !== "all" && asset.mode.toLowerCase() !== filters.mode) return false;
  if (filters.background !== "all" && assetBackground(asset) !== filters.background) return false;
  return true;
}

function filterHref(filters: Filters, key: keyof Filters, value: string): string {
  const next = { ...filters, [key]: value };
  const params = new URLSearchParams();
  for (const [filterKey, filterValue] of Object.entries(next)) {
    if (filterValue !== "all") params.set(filterKey, filterValue);
  }
  const query = params.toString();
  return query ? `/brandkit?${query}` : "/brandkit";
}

function FilterPanel({
  filters,
  visibleCount,
  totalCount,
}: {
  filters: Filters;
  visibleCount: number;
  totalCount: number;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-muted bg-[var(--color-raised)] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-fg-heading">Filter assets</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Showing {visibleCount} of {totalCount} files.
          </p>
        </div>
        <a
          href="/brandkit"
          className="inline-flex w-fit items-center rounded-md border border-border-muted px-3 py-1.5 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
        >
          Clear filters
        </a>
      </div>
      <FilterRow
        label="Type"
        filterKey="type"
        filters={filters}
        options={[
          ["all", "All"],
          ["logos", "Logos"],
          ["banners", "Banners"],
          ["lockups", "Lockups"],
        ]}
      />
      <FilterRow
        label="Logo"
        filterKey="logo"
        filters={filters}
        options={[
          ["all", "All"],
          ["primary", "Primary"],
          ["secondary", "Secondary"],
        ]}
      />
      <FilterRow
        label="Variation"
        filterKey="variation"
        filters={filters}
        options={[
          ["all", "All"],
          ["encircled", "Encircled"],
          ["ensquared", "Ensquared"],
        ]}
      />
      <FilterRow
        label="Mode"
        filterKey="mode"
        filters={filters}
        options={[
          ["all", "All"],
          ["dark", "Dark"],
          ["light", "Light"],
          ["monochrome", "Monochrome"],
          ["black", "Black"],
          ["white", "White"],
        ]}
      />
      <FilterRow
        label="Background"
        filterKey="background"
        filters={filters}
        options={[
          ["all", "All"],
          ["transparent", "Transparent"],
          ["with-background", "With background"],
        ]}
      />
    </section>
  );
}

function FilterRow({
  label,
  filterKey,
  filters,
  options,
}: {
  label: string;
  filterKey: keyof Filters;
  filters: Filters;
  options: Array<[string, string]>;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="w-28 shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, text]) => {
          const active = filters[filterKey] === value;
          return (
            <a
              key={value}
              href={filterHref(filters, filterKey, value)}
              className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-fg-heading bg-[var(--fg-heading)] text-[var(--color-background)]"
                  : "border-border-muted text-fg-body hover:border-fg-heading hover:text-fg-heading"
              }`}
            >
              {text}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function metadataItemClass(separated?: boolean): string {
  return separated
    ? "border-t border-border-muted pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
    : "";
}

function UsageNote({
  label,
  value,
  details,
  separated,
}: {
  label: string;
  value?: string;
  details?: string[];
  separated?: boolean;
}) {
  return (
    <div className={metadataItemClass(separated)}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{label}</p>
      {value && <p className="mt-1 text-sm font-semibold leading-6 text-fg-heading">{value}</p>}
      {details && (
        <ul className="mt-1 space-y-1 text-sm font-semibold leading-6 text-fg-heading">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ColorModeNote({ separated }: { separated?: boolean }) {
  return (
    <div className={metadataItemClass(separated)}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Color Modes</p>
      <div className="mt-1 space-y-1 text-sm font-semibold leading-6 text-fg-heading">
        <ColorLine label="Dark" colors={["#0a0a0a", "#f0f0f0"]} />
        <ColorLine label="Light" colors={["#fefcf7", "#111318"]} />
        <ColorLine label="Monochrome" colors={["#0f380f", "#9bbc0f", "#8bac0f"]} />
      </div>
    </div>
  );
}

function ColorLine({ label, colors }: { label: string; colors: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{label}:</span>
      {colors.map((color) => (
        <span key={color} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-[2px] border border-border-muted"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span>{color}</span>
        </span>
      ))}
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  const src = `${assetBase}${asset.file}`;
  const svgSrc = asset.svgFile ? `${assetBase}${asset.svgFile}` : undefined;
  const discontinued = assetLogo(asset) === "secondary";

  return (
    <article className="overflow-hidden rounded-lg border border-border-muted bg-[var(--color-card)]">
      <div
        className={`flex aspect-[16/9] items-center justify-center p-5 ${
          asset.transparent ? "border-b border-dashed border-fg-muted/50" : ""
        }`}
        style={previewStyle(asset.surface)}
      >
        <img
          src={src}
          alt={asset.name}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h3 className="text-base font-bold text-fg-heading">{asset.name}</h3>
          <p className="mt-1 text-xs leading-5 text-fg-muted">
            {asset.dimensions} - {asset.mode} - {asset.svgFile ? "PNG + SVG" : "PNG"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {discontinued ? (
            <span className="inline-flex w-fit items-center rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-muted">
              Discontinued
            </span>
          ) : (
            <a
              href={src}
              download
              className="inline-flex w-fit items-center rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            >
              Download PNG
            </a>
          )}
          {!discontinued && svgSrc && (
            <a
              href={svgSrc}
              download
              className="inline-flex w-fit items-center rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            >
              Download SVG
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
