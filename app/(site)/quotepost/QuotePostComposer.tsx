"use client";

import { useEffect, useRef, useState } from "react";

const TILE_SIZES = {
  large: 506,
} as const;

const DEFAULT_ROW_COUNT = 1;
const MAX_ROW_COUNT = 4;
const fontOptions = [
  { label: "Playfair Display", value: "playfair" },
  { label: "Cormorant Garamond", value: "cormorant" },
  { label: "Oswald", value: "oswald" },
  { label: "Space Grotesk", value: "space-grotesk" },
] as const;

const fontSizeOptions = [
  { label: "XX Small", value: 55 },
  { label: "X Small", value: 70 },
  { label: "Small", value: 85 },
  { label: "Medium", value: 100 },
  { label: "Large", value: 115 },
  { label: "XL", value: 130 },
] as const;

const backgroundColorOptions = [
  { label: "Light Mode Paper", value: "light-paper", color: "#fefcf7" },
  { label: "Light Card", value: "light-card", color: "#ffffff" },
  { label: "Light Surface", value: "light-surface", color: "#f3f5fb" },
  { label: "Dark Mode Background", value: "dark-background", color: "#0a0a0a" },
  { label: "Dark Mode Card", value: "dark-card", color: "#141414" },
  { label: "Dark Raised", value: "dark-raised", color: "#1e1e1e" },
  { label: "Classic Brand Blue", value: "brand-blue", color: "#5d9ae6" },
  { label: "Brand Blue Dark", value: "brand-blue-dark", color: "#2563eb" },
  { label: "Monochrome Green", value: "mono-green", color: "#20310d" },
  { label: "Accent Green", value: "accent-green", color: "#16a34a" },
] as const;

const textColorOptions = [
  { label: "Light Mode Ink", value: "dark-heading", color: "#111318" },
  { label: "Dark Body", value: "dark-body", color: "#2e3553" },
  { label: "Dark Mode White", value: "light-heading", color: "#ffffff" },
  { label: "Light Body", value: "light-body", color: "#d1d5db" },
  { label: "Muted", value: "muted", color: "#8b8b8b" },
  { label: "Classic Brand Blue", value: "brand-blue", color: "#5d9ae6" },
  { label: "Brand Blue Dark", value: "brand-blue-dark", color: "#2563eb" },
  { label: "Accent Green", value: "accent-green", color: "#22c55e" },
  { label: "Monochrome Pale", value: "mono-pale", color: "#dfe8b5" },
] as const;

const tileSizeOptions = [
  { label: "506 x 506", value: TILE_SIZES.large },
] as const;

const brandStyleOptions = [
  { label: "Logo", value: "logo" },
  { label: "Banner", value: "banner" },
] as const;

const cornerOptions = [
  { label: "Top left", value: "top-left", row: 0, col: 0 },
  { label: "Top right", value: "top-right", row: 0, col: 1 },
  { label: "Bottom left", value: "bottom-left", row: 1, col: 0 },
  { label: "Bottom right", value: "bottom-right", row: 1, col: 1 },
] as const;

const brandAssets = {
  logo: "/brandkit/zcashnames-primary-logo-white-transparent-377x403.svg",
  banner: "/brandkit/zcashnames-brand-banner-primary-logo-white-transparent-377x403.svg",
} as const;

type FontOptionValue = (typeof fontOptions)[number]["value"];
type FontSizeValue = (typeof fontSizeOptions)[number]["value"];
type BackgroundColorValue = (typeof backgroundColorOptions)[number]["value"];
type TextColorValue = (typeof textColorOptions)[number]["value"];
type TileSizeValue = (typeof tileSizeOptions)[number]["value"];
type BrandStyleValue = (typeof brandStyleOptions)[number]["value"];
type CornerValue = (typeof cornerOptions)[number]["value"];
type ColorChoiceValue = BackgroundColorValue | TextColorValue;

type QuoteRowDraft = {
  quote: string;
  font: FontOptionValue;
  fontSize: FontSizeValue;
  backgroundColor: BackgroundColorValue;
  textColor: TextColorValue;
  tileSize: TileSizeValue;
  brandStyle: BrandStyleValue;
  brandCorner: CornerValue;
  showQuoteMarks: boolean;
};

type QuoteRowPreview = QuoteRowDraft;

type QuoteRowState = QuoteRowDraft & {
  id: string;
};

type ThemePalette = {
  background: string;
  quoteText: string;
  mark: string;
  frame: string;
};

function createEmptyRow(index: number): QuoteRowState {
  return {
    id: `row-${index + 1}`,
    quote: "",
    font: "playfair",
    fontSize: 100,
    backgroundColor: "brand-blue",
    textColor: "light-heading",
    tileSize: TILE_SIZES.large,
    brandStyle: "logo",
    brandCorner: "bottom-left",
    showQuoteMarks: true,
  };
}

function createRowFromPrevious(index: number, previous: QuoteRowState): QuoteRowState {
  return {
    ...previous,
    id: `row-${index + 1}`,
    quote: "",
  };
}

function buildInitialRows() {
  return Array.from({ length: DEFAULT_ROW_COUNT }, (_, index) => createEmptyRow(index));
}

function slugifyLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toAlpha(hex: string, alpha: number) {
  const normalized = hex.trim();
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) return `rgba(255, 255, 255, ${alpha})`;
  const value = match[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getThemePalette(background: string, quoteText: string): ThemePalette {
  return {
    background,
    quoteText,
    mark: toAlpha(quoteText, 0.14),
    frame: toAlpha(quoteText, 0.26),
  };
}

function buildColorMap() {
  const choices = [...backgroundColorOptions, ...textColorOptions] as Array<{
    value: ColorChoiceValue;
    color: string;
  }>;

  return Object.fromEntries(choices.map((choice) => [choice.value, choice.color])) as Record<ColorChoiceValue, string>;
}

function getFontFamily(font: FontOptionValue, families: Record<FontOptionValue, string>) {
  return families[font];
}

function getQuoteLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  minSize: number,
  fontFamily: string,
  fontWeight: number,
  maxLines: number,
) {
  const words = text.trim().replace(/\s+/g, " ").split(" ");
  let fontSize = initialSize;

  while (fontSize >= minSize) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }

    fontSize -= 2;
  }

  context.font = `${fontWeight} ${minSize}px ${fontFamily}`;
  const fallbackWords = words.slice();
  const lines: string[] = [];

  while (fallbackWords.length && lines.length < maxLines) {
    let currentLine = "";
    while (fallbackWords.length) {
      const candidate = currentLine ? `${currentLine} ${fallbackWords[0]}` : fallbackWords[0];
      if (context.measureText(candidate).width <= maxWidth || !currentLine) {
        currentLine = candidate;
        fallbackWords.shift();
      } else {
        break;
      }
    }
    lines.push(currentLine);
  }

  if (fallbackWords.length) {
    const lastIndex = lines.length - 1;
    const ellipsis = "...";
    let shortened = lines[lastIndex] ?? "";
    while (shortened && context.measureText(`${shortened}${ellipsis}`).width > maxWidth) {
      shortened = shortened.slice(0, -1).trimEnd();
    }
    lines[lastIndex] = `${shortened}${ellipsis}`;
  }

  return { fontSize: minSize, lines };
}

function drawQuoteOrnament(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  rotation: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = color;

  const spacing = size * 0.205;
  const tailHeight = size * 0.34;
  const tailWidth = size * 0.12;

  for (let index = 0; index < 2; index += 1) {
    const offsetX = index * spacing;

    context.beginPath();
    context.moveTo(offsetX - tailWidth * 0.28, -tailHeight * 0.02);
    context.quadraticCurveTo(
      offsetX - tailWidth * 0.9,
      tailHeight * 0.28,
      offsetX - tailWidth * 0.15,
      tailHeight,
    );
    context.quadraticCurveTo(
      offsetX + tailWidth * 0.55,
      tailHeight * 0.58,
      offsetX + tailWidth * 0.18,
      tailHeight * 0.04,
    );
    context.closePath();
    context.fill();
  }

  context.restore();
}

function getBrandPlacement(size: number, corner: CornerValue, brandStyle: BrandStyleValue, image: HTMLImageElement) {
  const isLarge = size === TILE_SIZES.large;
  const logoHeight = size * (isLarge ? 0.085 : 0.075);
  const bannerHeight = size * (isLarge ? 0.07 : 0.06);
  const height = brandStyle === "logo" ? logoHeight : bannerHeight;
  const width = (image.naturalWidth / image.naturalHeight) * height;
  const insetX = size * (isLarge ? 0.07 : 0.08);
  const insetY = size * (isLarge ? 0.05 : 0.055);

  const x = corner.endsWith("right") ? size - width - insetX : insetX;
  const y = corner.startsWith("bottom") ? size - height - insetY : insetY;

  return { x, y, width, height };
}

function drawTintedBrandImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  const offscreen = document.createElement("canvas");
  offscreen.width = Math.max(1, Math.round(width));
  offscreen.height = Math.max(1, Math.round(height));
  const offscreenContext = offscreen.getContext("2d");
  if (!offscreenContext) return;

  offscreenContext.clearRect(0, 0, offscreen.width, offscreen.height);
  offscreenContext.drawImage(image, 0, 0, offscreen.width, offscreen.height);
  offscreenContext.globalCompositeOperation = "source-in";
  offscreenContext.fillStyle = color;
  offscreenContext.fillRect(0, 0, offscreen.width, offscreen.height);
  offscreenContext.globalCompositeOperation = "source-over";

  context.drawImage(offscreen, x, y, width, height);
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function padIndex(value: number) {
  return String(value).padStart(2, "0");
}

function buildDownloadName(label: string, index: number) {
  const base = slugifyLabel(label) || "quotepost";
  return `${base}-${padIndex(index)}.png`;
}

function buildSetArchiveName(label: string) {
  const base = slugifyLabel(label) || "quotepost";
  return `${base}.zip`;
}

function getRowDownloadIndex(rows: QuoteRowState[], targetId: string) {
  let counter = 0;
  for (const row of rows) {
    if (!getRowPreview(row)) continue;
    counter += 1;
    if (row.id === targetId) return counter;
  }
  return null;
}

function getRowPreview(row: QuoteRowState): QuoteRowPreview | null {
  const quote = row.quote.trim();
  if (!quote) return null;

  return {
    quote,
    font: row.font,
    fontSize: row.fontSize,
    backgroundColor: row.backgroundColor,
    textColor: row.textColor,
    tileSize: row.tileSize,
    brandStyle: row.brandStyle,
    brandCorner: row.brandCorner,
    showQuoteMarks: row.showQuoteMarks,
  };
}

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[index] = crc >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function createStoredZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, entry.data.length);
    writeUint32(localHeader, 22, entry.data.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, entry.data.length);
    writeUint32(centralHeader, 24, entry.data.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  }

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 4, 0);
  writeUint16(endRecord, 6, 0);
  writeUint16(endRecord, 8, entries.length);
  writeUint16(endRecord, 10, entries.length);
  writeUint32(endRecord, 12, centralDirectorySize);
  writeUint32(endRecord, 16, offset);
  writeUint16(endRecord, 20, 0);

  const allParts = [...localParts, ...centralParts, endRecord];
  const totalSize = allParts.reduce((sum, part) => sum + part.length, 0);
  const archiveBytes = new Uint8Array(totalSize);
  let cursor = 0;

  for (const part of allParts) {
    archiveBytes.set(part, cursor);
    cursor += part.length;
  }

  return new Blob([archiveBytes.buffer], { type: "application/zip" });
}

async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });

  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

export default function QuotePostComposer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [rows, setRows] = useState<QuoteRowState[]>(() => buildInitialRows());
  const [setLabel, setSetLabel] = useState("");
  const [status, setStatus] = useState("");
  const [brandImages, setBrandImages] = useState<Partial<Record<BrandStyleValue, HTMLImageElement>>>({});
  const [resolvedColors] = useState<Record<ColorChoiceValue, string>>(() => buildColorMap());
  const [fontFamilies, setFontFamilies] = useState<Record<FontOptionValue, string>>({
    playfair: '"Playfair Display", Georgia, serif',
    cormorant: '"Cormorant Garamond", Georgia, serif',
    oswald: "Oswald, Arial, Helvetica, sans-serif",
    "space-grotesk": '"Space Grotesk", Arial, Helvetica, sans-serif',
  });

  useEffect(() => {
    const target = rootRef.current ?? document.body;
    const styles = getComputedStyle(target);
    const playfair = styles.getPropertyValue("--font-quotepost-playfair").trim();
    const cormorant = styles.getPropertyValue("--font-quotepost-cormorant").trim();
    const oswald = styles.getPropertyValue("--font-quotepost-oswald").trim();
    const space = styles.getPropertyValue("--font-quotepost-space").trim();

    setFontFamilies({
      playfair: playfair ? `${playfair}, Georgia, serif` : '"Playfair Display", Georgia, serif',
      cormorant: cormorant ? `${cormorant}, Georgia, serif` : '"Cormorant Garamond", Georgia, serif',
      oswald: oswald ? `${oswald}, Arial, Helvetica, sans-serif` : "Oswald, Arial, Helvetica, sans-serif",
      "space-grotesk": space ? `${space}, Arial, Helvetica, sans-serif` : '"Space Grotesk", Arial, Helvetica, sans-serif',
    });
  }, []);

  useEffect(() => {
    let active = true;

    void Promise.all(
      (Object.entries(brandAssets) as Array<[BrandStyleValue, string]>).map(async ([brandStyle, src]) => {
        const image = await loadImage(src);
        return [brandStyle, image] as const;
      }),
    )
      .then((entries) => {
        if (!active) return;
        setBrandImages(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!active) return;
        setStatus("One or more transparent logo assets could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    for (const row of rows) {
      const preview = getRowPreview(row);
      if (!preview) continue;
      const rowCanvas = canvasRefs.current[row.id];
      if (rowCanvas) {
        drawQuoteCard(
          rowCanvas,
          preview,
          fontFamilies,
          brandImages[preview.brandStyle] ?? null,
          resolvedColors,
        );
      }

      const galleryCanvas = canvasRefs.current[`${row.id}-gallery`];
      if (galleryCanvas) {
        drawQuoteCard(
          galleryCanvas,
          preview,
          fontFamilies,
          brandImages[preview.brandStyle] ?? null,
          resolvedColors,
        );
      }
    }
  }, [brandImages, fontFamilies, resolvedColors, rows]);

  function updateRow(rowId: string, updates: Partial<QuoteRowDraft>) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          ...updates,
        };
      }),
    );
  }

  function addRow() {
    setRows((currentRows) => {
      if (currentRows.length >= MAX_ROW_COUNT) return currentRows;
      const previousRow = currentRows[currentRows.length - 1];
      const nextRow = previousRow
        ? createRowFromPrevious(currentRows.length, previousRow)
        : createEmptyRow(currentRows.length);
      return [...currentRows, nextRow];
    });
  }

  function clearAllRows() {
    setRows(buildInitialRows());
    setStatus("");
  }

  function downloadRow(rowId: string) {
    const row = rows.find((candidate) => candidate.id === rowId);
    const preview = row ? getRowPreview(row) : null;
    if (!preview) {
      setStatus("Enter a quote before downloading this row.");
      return;
    }

    if (!slugifyLabel(setLabel)) {
      setStatus("Enter a set label before downloading.");
      return;
    }

    const canvas = canvasRefs.current[rowId];
    if (!canvas) {
      setStatus("That preview is not ready yet.");
      return;
    }

    const downloadIndex = getRowDownloadIndex(rows, rowId);
    if (!downloadIndex) {
      setStatus("Could not determine the row order for download.");
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = buildDownloadName(setLabel, downloadIndex);
    link.click();
    setStatus("");
  }

  async function downloadFullSet() {
    if (!slugifyLabel(setLabel)) {
      setStatus("Enter a set label before downloading the full set.");
      return;
    }

    const liveRows = rows
      .map((row) => ({ row, preview: getRowPreview(row) }))
      .filter((item): item is { row: QuoteRowState; preview: QuoteRowPreview } => item.preview !== null);

    if (!liveRows.length) {
      setStatus("Add at least one quote before downloading the full set.");
      return;
    }

    setStatus("Preparing ZIP archive...");

    const entries: ZipEntry[] = [];
    for (const [index, item] of liveRows.entries()) {
      const canvas = canvasRefs.current[item.row.id];
      if (!canvas) {
        setStatus(`Row ${item.row.id.replace("row-", "")} preview is not ready yet.`);
        return;
      }

      const pngBytes = await canvasToPngBytes(canvas);
      if (!pngBytes) {
        setStatus(`Could not encode row ${item.row.id.replace("row-", "")} as PNG.`);
        return;
      }

      entries.push({
        name: buildDownloadName(setLabel, index + 1),
        data: pngBytes,
      });
    }

    const archive = createStoredZip(entries);
    const url = URL.createObjectURL(archive);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildSetArchiveName(setLabel);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("");
  }

  return (
    <div ref={rootRef} className="grid gap-6">
      <section className="rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase text-fg-muted" htmlFor="quotepost-set-label">
              Set Label
            </label>
            <input
              id="quotepost-set-label"
              type="text"
              value={setLabel}
              onChange={(event) => setSetLabel(event.target.value)}
              className="min-w-0 rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
              placeholder="spring-campaign"
              maxLength={48}
              spellCheck={false}
            />
            <p className="text-sm leading-6 text-fg-body">
              Downloads use <span className="font-semibold text-fg-heading">{slugifyLabel(setLabel) || "set-label"}</span>
              <span className="text-fg-muted">-01.png</span>
            </p>
          </div>
        </div>

      </section>

      <section className="grid gap-4">
        {rows.map((row) => {
          const preview = getRowPreview(row);
          const downloadIndex = preview ? getRowDownloadIndex(rows, row.id) : null;
          const previewName = downloadIndex ? buildDownloadName(setLabel || "quotepost", downloadIndex) : null;
          const rowNumber = row.id.replace("row-", "");
          const rowTitle = `${setLabel.trim() || "Quotepost"} ${rowNumber}`;

          return (
            <article
              key={row.id}
              className="rounded-lg border border-border-muted bg-[var(--color-card)] p-5"
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-fg-heading">{rowTitle}</h2>
                  </div>
                  <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-fg-muted">
                    {row.tileSize} px
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-5 md:grid-cols-2 md:gap-8">
                <div className="grid gap-4 md:min-w-0">
                  <div className="grid gap-2">
                    <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-quote`}>
                      Quote
                    </label>
                    <textarea
                      id={`${row.id}-quote`}
                      value={row.quote}
                      onChange={(event) => updateRow(row.id, { quote: event.target.value })}
                      className="min-h-32 rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-3 text-sm font-medium leading-6 text-fg-heading outline-none focus:border-fg-heading"
                      placeholder="Life is what happens to us while we are making other plans."
                      maxLength={320}
                    />
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-font`}>
                          Font
                        </label>
                        <select
                          id={`${row.id}-font`}
                          value={row.font}
                          onChange={(event) => updateRow(row.id, { font: event.target.value as FontOptionValue })}
                          className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                        >
                          {fontOptions.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-font-size`}>
                          Font Size
                        </label>
                        <select
                          id={`${row.id}-font-size`}
                          value={row.fontSize}
                          onChange={(event) => updateRow(row.id, { fontSize: Number(event.target.value) as FontSizeValue })}
                          className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                        >
                          {fontSizeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-background-color`}>
                          Background Color
                        </label>
                        <select
                          id={`${row.id}-background-color`}
                          value={row.backgroundColor}
                          onChange={(event) => updateRow(row.id, { backgroundColor: event.target.value as BackgroundColorValue })}
                          className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                        >
                          {backgroundColorOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-text-color`}>
                          Font Color
                        </label>
                        <select
                          id={`${row.id}-text-color`}
                          value={row.textColor}
                          onChange={(event) => updateRow(row.id, { textColor: event.target.value as TextColorValue })}
                          className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                        >
                          {textColorOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-tile-size`}>
                        Tile Size
                      </label>
                      <select
                        id={`${row.id}-tile-size`}
                        value={row.tileSize}
                        onChange={(event) => updateRow(row.id, { tileSize: Number(event.target.value) as TileSizeValue })}
                        className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                      >
                        {tileSizeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 border-t border-border-muted pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid flex-none gap-2">
                        <span className="text-xs font-bold uppercase text-fg-muted">Corner</span>
                        <div className="grid w-fit grid-cols-2 gap-2">
                          {cornerOptions.map((corner) => {
                            const isActive = row.brandCorner === corner.value;
                            return (
                              <button
                                key={corner.value}
                                type="button"
                                onClick={() => updateRow(row.id, { brandCorner: corner.value })}
                                aria-label={`Place brand in ${corner.label}`}
                                className={`grid h-14 w-14 rounded-md border transition-colors ${
                                  isActive
                                    ? "border-fg-heading bg-[var(--fg-heading)] text-[var(--color-background)]"
                                    : "border-border-muted bg-[var(--color-raised)] text-fg-muted hover:border-fg-heading"
                                }`}
                              >
                                <span
                                  className={`h-3 w-3 rounded-sm ${
                                    corner.row === 0 && corner.col === 0 ? "justify-self-start self-start" : ""
                                  } ${
                                    corner.row === 0 && corner.col === 1 ? "justify-self-end self-start" : ""
                                  } ${
                                    corner.row === 1 && corner.col === 0 ? "justify-self-start self-end" : ""
                                  } ${
                                    corner.row === 1 && corner.col === 1 ? "justify-self-end self-end" : ""
                                  } ${isActive ? "bg-[var(--color-background)]" : "bg-current"}`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid min-w-0 flex-1 gap-3 self-start">
                        <div className="grid max-w-[13rem] gap-2 self-end justify-self-end">
                          <label className="text-xs font-bold uppercase text-fg-muted" htmlFor={`${row.id}-brand-style`}>
                            Brand
                          </label>
                          <select
                            id={`${row.id}-brand-style`}
                            value={row.brandStyle}
                            onChange={(event) => updateRow(row.id, { brandStyle: event.target.value as BrandStyleValue })}
                            className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                          >
                            {brandStyleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <label className="flex items-center gap-3 rounded-md border border-border-muted bg-[var(--color-raised)] px-4 py-3 text-sm font-semibold text-fg-heading justify-self-end">
                          <input
                            type="checkbox"
                            checked={row.showQuoteMarks}
                            onChange={(event) => updateRow(row.id, { showQuoteMarks: event.target.checked })}
                            className="h-4 w-4 rounded border-border-muted"
                          />
                          Use quote marks
                        </label>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="grid gap-3 md:min-w-0 md:justify-self-stretch md:sticky md:top-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">Preview</h3>
                    <span className="text-xs font-semibold text-fg-muted">{preview ? "Live preview" : "Enter a quote to preview"}</span>
                  </div>

                  {preview ? (
                    <canvas
                      ref={(element) => {
                        canvasRefs.current[row.id] = element;
                      }}
                      width={preview.tileSize}
                      height={preview.tileSize}
                      aria-label={`Preview for ${row.id}`}
                      className="mx-auto w-full max-w-[506px] rounded-lg border border-border-muted bg-[var(--color-raised)]"
                      style={{ aspectRatio: "1 / 1" }}
                    />
                  ) : (
                    <div className="mx-auto flex aspect-square w-full max-w-[506px] items-center justify-center rounded-lg border border-dashed border-border-muted bg-[var(--color-raised)] px-6 text-center text-sm leading-6 text-fg-muted">
                      Enter a quote to preview.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 border-t border-border-muted pt-4">
                    <button
                      type="button"
                      onClick={() => downloadRow(row.id)}
                      className="rounded-md border border-border-muted px-4 py-3 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
                    >
                      Download row
                    </button>
                    {previewName && (
                      <p className="self-center text-sm font-medium text-fg-body">
                        Filename: <span className="font-semibold text-fg-heading">{previewName}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="flex justify-start">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_ROW_COUNT}
          className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-muted"
        >
          Add row
        </button>
      </section>

      <section className="grid gap-4 rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-fg-heading">Batch Gallery</h2>
            <p className="text-sm leading-6 text-fg-body">Live rows appear here in sequence. Downloads remain individual.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void downloadFullSet()}
              className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            >
              Download full set
            </button>
            <button
              type="button"
              onClick={clearAllRows}
              className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            >
              Clear all rows
            </button>
          </div>
        </div>

        {rows.some((row) => getRowPreview(row)) ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows
              .filter((row) => getRowPreview(row))
              .map((row) => {
                const preview = getRowPreview(row);
                if (!preview) return null;
                const downloadIndex = getRowDownloadIndex(rows, row.id);
                const previewName = downloadIndex ? buildDownloadName(setLabel || "quotepost", downloadIndex) : "";

                return (
                  <div key={`gallery-${row.id}`} className="grid gap-2 rounded-lg border border-border-muted bg-[var(--color-raised)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">{row.id.replace("row-", "Row ")}</span>
                      <span className="text-xs font-semibold text-fg-muted">{preview.tileSize}px</span>
                    </div>
                    <canvas
                      ref={(element) => {
                        canvasRefs.current[`${row.id}-gallery`] = element;
                        if (element) {
                          drawQuoteCard(
                            element,
                            preview,
                            fontFamilies,
                            brandImages[preview.brandStyle] ?? null,
                            resolvedColors,
                          );
                        }
                      }}
                      width={preview.tileSize}
                      height={preview.tileSize}
                      aria-label={`Gallery preview for ${row.id}`}
                      className="w-full rounded-md border border-border-muted bg-[var(--color-card)]"
                      style={{ aspectRatio: "1 / 1" }}
                    />
                    <p className="truncate text-xs font-medium text-fg-body">{previewName}</p>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-muted bg-[var(--color-raised)] px-6 py-10 text-center text-sm leading-6 text-fg-muted">
            Rows with quotes will collect here automatically as a local gallery.
          </div>
        )}

        {status && <p className="text-sm font-semibold text-[#ff8a8a]">{status}</p>}
      </section>
    </div>
  );
}

function drawQuoteCard(
  canvas: HTMLCanvasElement,
  preview: QuoteRowPreview,
  fontFamilies: Record<FontOptionValue, string>,
  brandImage: HTMLImageElement | null,
  resolvedColors: Record<ColorChoiceValue, string>,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const size = preview.tileSize;
  const isLarge = size === TILE_SIZES.large;
  const backgroundColor = resolvedColors[preview.backgroundColor] ?? "#141414";
  const textColor = resolvedColors[preview.textColor] ?? "#f0f0f0";
  const palette = getThemePalette(backgroundColor, textColor);
  const fontFamily = getFontFamily(preview.font, fontFamilies);
  const fontWeight = preview.font === "oswald" || preview.font === "space-grotesk" ? 700 : 900;
  const maxLines = isLarge ? 6 : 5;
  const fontScale = preview.fontSize / 100;

  canvas.width = size;
  canvas.height = size;

  context.clearRect(0, 0, size, size);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, size, size);

  if (preview.showQuoteMarks) {
    drawQuoteOrnament(
      context,
      size * (isLarge ? 0.085 : 0.1),
      size * (isLarge ? 0.055 : 0.075),
      size * (isLarge ? 0.34 : 0.24),
      palette.mark,
      0,
    );
    drawQuoteOrnament(
      context,
      size * (isLarge ? 0.91 : 0.89),
      size * (isLarge ? 0.95 : 0.925),
      size * (isLarge ? 0.34 : 0.24),
      palette.mark,
      Math.PI,
    );
  }

  const textLeft = size * 0.14;
  const textTop = size * (isLarge ? 0.24 : 0.29);
  const textWidth = size * 0.71;
  const lineResult = getQuoteLines(
    context,
    preview.quote,
    textWidth,
    (isLarge ? 78 : 37) * fontScale,
    (isLarge ? 40 : 21) * fontScale,
    fontFamily,
    fontWeight,
    maxLines,
  );

  context.fillStyle = palette.quoteText;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = `${fontWeight} ${lineResult.fontSize}px ${fontFamily}`;

  const lineHeight = lineResult.fontSize * (preview.font === "oswald" ? 1.04 : 1.08);
  lineResult.lines.forEach((line, index) => {
    context.fillText(line, textLeft, textTop + index * lineHeight);
  });

  if (brandImage) {
    const placement = getBrandPlacement(size, preview.brandCorner, preview.brandStyle, brandImage);
    drawTintedBrandImage(context, brandImage, placement.x, placement.y, placement.width, placement.height, palette.quoteText);
  }

  context.strokeStyle = palette.frame;
  context.lineWidth = isLarge ? 2 : 1.5;
  context.strokeRect(0, 0, size, size);
}
