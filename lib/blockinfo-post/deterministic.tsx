import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import {
  BLOCKINFO_POST_DELTA_WINDOWS,
  BLOCKINFO_POST_STAT_KEYS,
  type BlockinfoPostCaptionPolicy,
  type BlockinfoPostDeltaValue,
  type BlockinfoPostDeterministicLayout,
  type BlockinfoPostDeterministicSnapshot,
  type BlockinfoPostLayoutTextBlock,
  type BlockinfoPostRowSummary,
  type BlockinfoPostStatKey,
  type BlockinfoPostStatSnapshot,
} from "@/lib/blockinfo-post/types";
import { getDefaultBlockinfoPostCaptionPolicy } from "@/lib/blockinfo-post/caption-policy";
import {
  getHostedConfigPersistenceMessage,
  isEphemeralBlockinfoFilesystemRuntime,
} from "@/lib/blockinfo-post/runtime";
import {
  applyBlockinfoPostTemplateTheme,
  getBlockinfoPostTemplateTheme,
  normalizeBlockinfoPostTemplateVariant,
  type BlockinfoPostTemplateVariant,
} from "@/lib/blockinfo-post/template-variant";

const DEFAULT_TEMPLATE_DIRECTORY = "templates/blockinfo-post";
const DEFAULT_LAYOUT_PATH = path.resolve("templates/blockinfo-post/layout.deterministic.json");
const DEFAULT_CAPTION_POLICY_PATH = path.resolve("templates/blockinfo-post/caption-policy.json");
const DEFAULT_DETERMINISTIC_FONT_REGULAR_PATH = path.resolve("public/fonts/consola.ttf");
const DEFAULT_DETERMINISTIC_FONT_BOLD_PATH = path.resolve("public/fonts/consolab.ttf");
const DETERMINISTIC_FONT_FAMILY = '"DeterministicMono", monospace';
const WINDOW_HOURS = {
  "1d": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
} as const;
const DETERMINISTIC_GRID_VERTICAL_THICKNESS = 1;
const DETERMINISTIC_GRID_HORIZONTAL_THICKNESS = 2;

type JsonRecord = Record<string, unknown>;
type DeterministicFontOption = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let deterministicFontDataPromise: Promise<DeterministicFontOption[]> | null = null;

const STAT_META: Array<{ key: BlockinfoPostStatKey; label: string }> = [
  { key: "height", label: "Height" },
  { key: "verification_progress", label: "Verification" },
  { key: "chain_size_bytes", label: "Chain Size (GB)" },
  { key: "difficulty", label: "Difficulty" },
  { key: "transparent", label: "Transparent" },
  { key: "sprout", label: "Sprout" },
  { key: "sapling", label: "Sapling" },
  { key: "orchard", label: "Orchard" },
  { key: "ironwood", label: "Ironwood" },
  { key: "lockbox", label: "Lockbox" },
  { key: "total_shielded", label: "Total Shielded" },
];

function fail(message: string): never {
  throw new Error(message);
}

async function loadDeterministicFonts(): Promise<DeterministicFontOption[]> {
  if (!deterministicFontDataPromise) {
    deterministicFontDataPromise = Promise.all([
      readFile(DEFAULT_DETERMINISTIC_FONT_REGULAR_PATH),
      readFile(DEFAULT_DETERMINISTIC_FONT_BOLD_PATH),
    ]).then(([regular, bold]) => ([
      { name: "DeterministicMono", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "DeterministicMono", data: bold, weight: 700 as const, style: "normal" as const },
    ]));
  }

  try {
    return await deterministicFontDataPromise;
  } catch (error) {
    deterministicFontDataPromise = null;
    fail(`Missing deterministic font asset or unreadable font file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mergeTextBlock(
  base: BlockinfoPostLayoutTextBlock,
  input: Partial<BlockinfoPostLayoutTextBlock> | undefined,
): BlockinfoPostLayoutTextBlock {
  return {
    ...base,
    ...(input ?? {}),
  };
}

function defaultTextBlock(input: Partial<BlockinfoPostLayoutTextBlock>): BlockinfoPostLayoutTextBlock {
  return {
    visible: input.visible ?? true,
    x: input.x ?? 0,
    y: input.y ?? 0,
    maxWidth: input.maxWidth ?? 100,
    fontSize: input.fontSize ?? 18,
    fontWeight: input.fontWeight ?? 500,
    lineHeight: input.lineHeight ?? 1.2,
    letterSpacing: input.letterSpacing ?? 0,
    textAlign: input.textAlign ?? "left",
    color: input.color ?? "#ffffff",
    opacity: input.opacity ?? 1,
  };
}

export function getDefaultDeterministicLayout(): BlockinfoPostDeterministicLayout {
  return {
    width: 1080,
    height: 1080,
    header: {
      eyebrow: defaultTextBlock({
        x: 214,
        y: 56,
        maxWidth: 352,
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: 2,
        color: "#dfff72",
      }),
      title: defaultTextBlock({
        x: 214,
        y: 88,
        maxWidth: 500,
        fontSize: 58,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0,
        color: "#dfff72",
      }),
      subtitle: defaultTextBlock({
        x: 78,
        y: 186,
        maxWidth: 700,
        fontSize: 22,
        fontWeight: 600,
        lineHeight: 1.18,
        letterSpacing: 0.2,
        color: "#dfff72",
        visible: false,
      }),
    },
    table: {
      headerY: 246,
      startY: 292,
      rowHeight: 67,
      note: defaultTextBlock({
        x: 180,
        y: 870,
        maxWidth: 720,
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.15,
        letterSpacing: 0.4,
        color: "#dfff72",
        textAlign: "center",
      }),
      columns: {
        label: defaultTextBlock({
          x: 92,
          y: 0,
          maxWidth: 252,
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: 0.6,
          color: "#dfff72",
        }),
        current: defaultTextBlock({
          x: 368,
          y: 0,
          maxWidth: 192,
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: 0,
          color: "#dfff72",
          textAlign: "right",
        }),
        delta1d: defaultTextBlock({
          x: 622,
          y: 0,
          maxWidth: 154,
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1.12,
          letterSpacing: 0,
          color: "#dfff72",
          textAlign: "right",
        }),
        delta7d: defaultTextBlock({
          x: 820,
          y: 0,
          maxWidth: 154,
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1.12,
          letterSpacing: 0,
          color: "#dfff72",
          textAlign: "right",
        }),
        delta30d: defaultTextBlock({
          x: 832,
          y: 0,
          maxWidth: 100,
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.02,
          letterSpacing: 0,
          color: "#dfff72",
          textAlign: "right",
          visible: false,
        }),
      },
      statRows: STAT_META.map((entry) => ({
        key: entry.key,
        label: entry.label,
        visible: entry.key !== "verification_progress" && entry.key !== "height",
      })),
    },
    footer: defaultTextBlock({
      x: 834,
      y: 992,
      maxWidth: 144,
      fontSize: 28,
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: 0.8,
      textAlign: "right",
      color: "#dfff72",
      opacity: 1,
    }),
  };
}

export function getDeterministicAssetConfig(previewVariant?: BlockinfoPostTemplateVariant) {
  const templateVariant = previewVariant ?? normalizeBlockinfoPostTemplateVariant(process.env.BLOCKINFO_POST_DETERMINISTIC_TEMPLATE_VARIANT);
  const defaultBackgroundPath = path.resolve(DEFAULT_TEMPLATE_DIRECTORY, getBlockinfoPostTemplateTheme(templateVariant).backgroundFile);
  return {
    templateVariant,
    backgroundPath: path.resolve(previewVariant ? defaultBackgroundPath : process.env.BLOCKINFO_POST_DETERMINISTIC_BACKGROUND_PATH?.trim() || defaultBackgroundPath),
    layoutPath: path.resolve(process.env.BLOCKINFO_POST_DETERMINISTIC_LAYOUT_PATH?.trim() || DEFAULT_LAYOUT_PATH),
    captionPolicyPath: path.resolve(process.env.BLOCKINFO_POST_DETERMINISTIC_CAPTION_POLICY_PATH?.trim() || DEFAULT_CAPTION_POLICY_PATH),
  };
}

function mergeCaptionPolicy(
  base: BlockinfoPostCaptionPolicy,
  input: Partial<BlockinfoPostCaptionPolicy> | null | undefined,
): BlockinfoPostCaptionPolicy {
  const next = input ?? {};
  return {
    sproutAnyChange: { ...base.sproutAnyChange, ...(next.sproutAnyChange ?? {}) },
    orchard30dMax: { ...base.orchard30dMax, ...(next.orchard30dMax ?? {}) },
    totalShielded30dMax: { ...base.totalShielded30dMax, ...(next.totalShielded30dMax ?? {}) },
    transparent30dMax: { ...base.transparent30dMax, ...(next.transparent30dMax ?? {}) },
    difficulty30dMax: { ...base.difficulty30dMax, ...(next.difficulty30dMax ?? {}) },
    orchardDaily: { ...base.orchardDaily, ...(next.orchardDaily ?? {}) },
    ironwoodDaily: { ...base.ironwoodDaily, ...(next.ironwoodDaily ?? {}) },
    totalShieldedDaily: { ...base.totalShieldedDaily, ...(next.totalShieldedDaily ?? {}) },
    transparentDaily: { ...base.transparentDaily, ...(next.transparentDaily ?? {}) },
    orchardWeekly: { ...base.orchardWeekly, ...(next.orchardWeekly ?? {}) },
    ironwoodWeekly: { ...base.ironwoodWeekly, ...(next.ironwoodWeekly ?? {}) },
    totalShieldedWeekly: { ...base.totalShieldedWeekly, ...(next.totalShieldedWeekly ?? {}) },
    blockDailyFallback: { ...base.blockDailyFallback, ...(next.blockDailyFallback ?? {}) },
    latestSnapshotFallback: { ...base.latestSnapshotFallback, ...(next.latestSnapshotFallback ?? {}) },
  };
}

function validateCaptionPolicy(policy: BlockinfoPostCaptionPolicy): BlockinfoPostCaptionPolicy {
  const entries = Object.entries(policy) as Array<[string, { enabled: boolean; priority: number } & Record<string, unknown>]>;
  for (const [key, rule] of entries) {
    if (!Number.isFinite(rule.priority)) fail(`Caption policy ${key} priority must be a finite number.`);
    for (const [field, value] of Object.entries(rule)) {
      if (field === "enabled" || field === "priority") continue;
      if (value != null && typeof value === "number" && !Number.isFinite(value)) {
        fail(`Caption policy ${key}.${field} must be a finite number.`);
      }
    }
  }
  return policy;
}

function mergeLayout(
  base: BlockinfoPostDeterministicLayout,
  input: Partial<BlockinfoPostDeterministicLayout> | null | undefined,
): BlockinfoPostDeterministicLayout {
  const next = input ?? {};
  return {
    width: typeof next.width === "number" && next.width > 0 ? next.width : base.width,
    height: typeof next.height === "number" && next.height > 0 ? next.height : base.height,
    header: {
      eyebrow: mergeTextBlock(base.header.eyebrow, next.header?.eyebrow),
      title: mergeTextBlock(base.header.title, next.header?.title),
      subtitle: mergeTextBlock(base.header.subtitle, next.header?.subtitle),
    },
    table: {
      headerY: typeof next.table?.headerY === "number" ? next.table.headerY : base.table.headerY,
      startY: typeof next.table?.startY === "number" ? next.table.startY : base.table.startY,
      rowHeight: typeof next.table?.rowHeight === "number" ? next.table.rowHeight : base.table.rowHeight,
      note: mergeTextBlock(base.table.note, next.table?.note),
      columns: {
        label: mergeTextBlock(base.table.columns.label, next.table?.columns?.label),
        current: mergeTextBlock(base.table.columns.current, next.table?.columns?.current),
        delta1d: mergeTextBlock(base.table.columns.delta1d, next.table?.columns?.delta1d),
        delta7d: mergeTextBlock(base.table.columns.delta7d, next.table?.columns?.delta7d),
        delta30d: mergeTextBlock(base.table.columns.delta30d, next.table?.columns?.delta30d),
      },
      statRows: Array.isArray(next.table?.statRows) && next.table?.statRows.length > 0
        ? next.table.statRows
            .map((row) => {
              const key = typeof row.key === "string" && BLOCKINFO_POST_STAT_KEYS.includes(row.key as BlockinfoPostStatKey)
                ? (row.key as BlockinfoPostStatKey)
                : null;
              if (!key) return null;
              return {
                key,
                label: typeof row.label === "string" && row.label.trim() ? row.label : STAT_META.find((entry) => entry.key === key)?.label || key,
                visible: row.visible !== false,
              };
            })
            .filter((row): row is BlockinfoPostDeterministicLayout["table"]["statRows"][number] => !!row)
        : base.table.statRows,
    },
    footer: mergeTextBlock(base.footer, next.footer),
  };
}

function validateLayout(layout: BlockinfoPostDeterministicLayout): BlockinfoPostDeterministicLayout {
  if (layout.table.rowHeight <= 0) fail("Deterministic layout rowHeight must be greater than 0.");
  if (layout.table.statRows.length === 0) fail("Deterministic layout must include at least one stat row.");
  return layout;
}

export async function loadDeterministicLayout(layoutPath = getDeterministicAssetConfig().layoutPath): Promise<BlockinfoPostDeterministicLayout> {
  const base = getDefaultDeterministicLayout();
  let raw = "";
  try {
    raw = await readFile(layoutPath, "utf8");
  } catch (error) {
    fail(`Missing deterministic layout file or unreadable layout at ${layoutPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsed: Partial<BlockinfoPostDeterministicLayout> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<BlockinfoPostDeterministicLayout>;
  } catch (error) {
    fail(`Invalid deterministic layout JSON at ${layoutPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return validateLayout(mergeLayout(base, parsed));
}

export async function saveDeterministicLayout(
  layout: BlockinfoPostDeterministicLayout,
  layoutPath = getDeterministicAssetConfig().layoutPath,
): Promise<void> {
  if (isEphemeralBlockinfoFilesystemRuntime()) {
    fail(getHostedConfigPersistenceMessage());
  }
  const normalized = validateLayout(mergeLayout(getDefaultDeterministicLayout(), layout));
  await writeFile(layoutPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

export async function loadDeterministicCaptionPolicy(
  captionPolicyPath = getDeterministicAssetConfig().captionPolicyPath,
): Promise<BlockinfoPostCaptionPolicy> {
  const base = getDefaultBlockinfoPostCaptionPolicy();
  let raw = "";
  try {
    raw = await readFile(captionPolicyPath, "utf8");
  } catch (error) {
    fail(`Missing deterministic caption policy file or unreadable policy at ${captionPolicyPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsed: Partial<BlockinfoPostCaptionPolicy> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<BlockinfoPostCaptionPolicy>;
  } catch (error) {
    fail(`Invalid deterministic caption policy JSON at ${captionPolicyPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return validateCaptionPolicy(mergeCaptionPolicy(base, parsed));
}

export async function saveDeterministicCaptionPolicy(
  policy: BlockinfoPostCaptionPolicy,
  captionPolicyPath = getDeterministicAssetConfig().captionPolicyPath,
): Promise<void> {
  if (isEphemeralBlockinfoFilesystemRuntime()) {
    fail(getHostedConfigPersistenceMessage());
  }
  const normalized = validateCaptionPolicy(mergeCaptionPolicy(getDefaultBlockinfoPostCaptionPolicy(), policy));
  await writeFile(captionPolicyPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

function formatCurrentValue(key: BlockinfoPostStatKey, value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "N/A";
  if (key === "verification_progress") {
    return `${(value * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
  if (key === "height") return Math.round(value).toLocaleString("en-US");
  if (key === "chain_size_bytes") {
    return `${(value / 1_000_000_000).toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} GB`;
  }
  if (Math.abs(value) >= 1_000_000) return formatCompactNumber(value);
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function visibleColumnEntries(layout: BlockinfoPostDeterministicLayout) {
  return [
    { key: "label", block: layout.table.columns.label, label: "Statistic" },
    { key: "current", block: layout.table.columns.current, label: "Current" },
    { key: "delta1d", block: layout.table.columns.delta1d, label: "1-day" },
    { key: "delta7d", block: layout.table.columns.delta7d, label: "7-day" },
    { key: "delta30d", block: layout.table.columns.delta30d, label: "30-day" },
  ].filter((entry) => entry.block.visible);
}

function columnDividerX(left: BlockinfoPostLayoutTextBlock, right: BlockinfoPostLayoutTextBlock): number {
  const leftEdge = left.x + left.maxWidth;
  const rightEdge = right.x;
  return Math.round((leftEdge + rightEdge) / 2);
}

function formatCompactNumber(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}B`;
  }
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}M`;
  }
  if (absolute >= 1_000) {
    return `${(value / 1_000).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatSignedNumber(value: number, key?: BlockinfoPostStatKey): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "+";
  if (key === "chain_size_bytes") {
    const gb = Math.abs(value) / 1_000_000_000;
    return `${sign}${gb.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} GB`;
  }
  const formatted = formatCompactNumber(Math.abs(value));
  return `${sign}${formatted}`;
}

function buildDelta(
  key: BlockinfoPostStatKey,
  window: keyof typeof WINDOW_HOURS,
  current: number | null,
  previous: number | null,
  measuredAt: string | null,
): BlockinfoPostDeltaValue {
  if (current == null || previous == null) {
    return {
      window,
      measuredAt,
      absolute: null,
      percent: null,
      formatted: "N/A",
    };
  }

  const absolute = current - previous;
  const percent = previous === 0 ? null : (absolute / previous) * 100;
  const formattedAbsolute = formatSignedNumber(absolute, key);
  const formattedPercent = percent == null
    ? "N/A"
    : `${percent >= 0 ? "+" : "-"}${Math.abs(percent).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}%`;

  return {
    window,
    measuredAt,
    absolute,
    percent,
    formatted: percent == null ? formattedAbsolute : `${formattedAbsolute}\n${formattedPercent}`,
  };
}

async function fetchHistoricalRow(targetIso: string): Promise<JsonRecord | null> {
  const { data, error } = await db
    .from("zebra_stats")
    .select("*")
    .lte("measured_at", targetIso)
    .order("measured_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    fail(`Supabase query failure while loading zebra_stats history for ${targetIso}: ${error.message}`);
  }

  return (data ?? null) as JsonRecord | null;
}

async function fetchWindowRows(startIso: string): Promise<JsonRecord[]> {
  const { data, error } = await db
    .from("zebra_stats")
    .select("*")
    .gte("measured_at", startIso)
    .order("measured_at", { ascending: true, nullsFirst: false });

  if (error) {
    fail(`Supabase query failure while loading zebra_stats 30-day window from ${startIso}: ${error.message}`);
  }

  return ((data ?? []) as JsonRecord[]).filter((row) => toNullableString(row.measured_at) != null);
}

function computeMax30d(
  key: BlockinfoPostStatKey,
  current: number | null,
  windowRows: JsonRecord[],
  latestMeasuredAt: string | null,
): BlockinfoPostStatSnapshot["max30d"] {
  let maxValue: number | null = current;
  let maxMeasuredAt = latestMeasuredAt;

  for (const row of windowRows) {
    const value = toNullableNumber(row[key]);
    if (value == null) continue;
    if (maxValue == null || value > maxValue) {
      maxValue = value;
      maxMeasuredAt = toNullableString(row.measured_at);
    }
  }

  return {
    value: maxValue,
    measuredAt: maxMeasuredAt,
    isCurrent: current != null && maxValue != null && latestMeasuredAt != null && maxMeasuredAt === latestMeasuredAt && current === maxValue,
  };
}

function snapshotForStat(
  key: BlockinfoPostStatKey,
  label: string,
  latest: JsonRecord,
  historical: Record<keyof typeof WINDOW_HOURS, JsonRecord | null>,
  windowRows: JsonRecord[],
): BlockinfoPostStatSnapshot {
  const current = toNullableNumber(latest[key]);
  const latestMeasuredAt = toNullableString(latest.measured_at);
  return {
    key,
    label,
    current,
    formattedCurrent: formatCurrentValue(key, current),
    max30d: computeMax30d(key, current, windowRows, latestMeasuredAt),
    deltas: {
      "1d": buildDelta(key, "1d", current, toNullableNumber(historical["1d"]?.[key]), toNullableString(historical["1d"]?.measured_at)),
      "7d": buildDelta(key, "7d", current, toNullableNumber(historical["7d"]?.[key]), toNullableString(historical["7d"]?.measured_at)),
      "30d": buildDelta(key, "30d", current, toNullableNumber(historical["30d"]?.[key]), toNullableString(historical["30d"]?.measured_at)),
    },
  };
}

export async function fetchDeterministicSnapshot(latestRow: JsonRecord): Promise<BlockinfoPostDeterministicSnapshot> {
  const latestMeasuredAt = toNullableString(latestRow.measured_at);
  if (!latestMeasuredAt) {
    fail("Latest public.zebra_stats row is missing measured_at, which deterministic delta computation requires.");
  }

  const latestTime = new Date(latestMeasuredAt).getTime();
  if (!Number.isFinite(latestTime)) {
    fail(`Latest public.zebra_stats measured_at is invalid: ${latestMeasuredAt}`);
  }

  const targets = Object.fromEntries(
    BLOCKINFO_POST_DELTA_WINDOWS.map((window) => [
      window,
      new Date(latestTime - WINDOW_HOURS[window] * 60 * 60 * 1000).toISOString(),
    ]),
  ) as Record<keyof typeof WINDOW_HOURS, string>;

  const [row1d, row7d, row30d, windowRows] = await Promise.all([
    fetchHistoricalRow(targets["1d"]),
    fetchHistoricalRow(targets["7d"]),
    fetchHistoricalRow(targets["30d"]),
    fetchWindowRows(targets["30d"]),
  ]);

  const historical = {
    "1d": row1d,
    "7d": row7d,
    "30d": row30d,
  } satisfies Record<keyof typeof WINDOW_HOURS, JsonRecord | null>;

  const stats = Object.fromEntries(
    STAT_META.map(({ key, label }) => [key, snapshotForStat(key, label, latestRow, historical, windowRows)]),
  ) as Record<BlockinfoPostStatKey, BlockinfoPostStatSnapshot>;

  return {
    generatedAtIso: new Date().toISOString(),
    latestMeasuredAt,
    latestMeasuredDate: toNullableString(latestRow.measured_date),
    stats,
    statOrder: STAT_META.map((entry) => entry.key),
  };
}

function renderTextBlock(block: BlockinfoPostLayoutTextBlock, text: string, key: string) {
  if (!block.visible) return null;

  return (
    <div
      key={key}
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.maxWidth,
        display: "flex",
        justifyContent:
          block.textAlign === "right" ? "flex-end" : block.textAlign === "center" ? "center" : "flex-start",
        color: block.color,
        opacity: block.opacity,
        fontSize: block.fontSize,
        fontWeight: block.fontWeight,
        lineHeight: block.lineHeight,
        letterSpacing: `${block.letterSpacing}px`,
        textAlign: block.textAlign,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
}

async function readBackgroundAsDataUrl(backgroundPath: string): Promise<string> {
  let buffer: Buffer;
  try {
    buffer = await readFile(backgroundPath);
  } catch (error) {
    fail(`Missing deterministic background template or unreadable image at ${backgroundPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const ext = path.extname(backgroundPath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : null;
  if (!mimeType) {
    fail(`Unsupported deterministic background template file type for ${backgroundPath}. Expected png, jpg, jpeg, or webp.`);
  }

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function formatDisplayDate(value: string | null): string {
  if (!value) return "DATE N/A";
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "DATE N/A";
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

function formatDisplayDateTime(value: string | null): string {
  if (!value) return "Measured time unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Measured time unavailable";
  const iso = date.toISOString();
  return `${iso.slice(0, 16)} UTC`;
}

export async function renderDeterministicImage(args: {
  backgroundPath: string;
  templateVariant: BlockinfoPostTemplateVariant;
  layout: BlockinfoPostDeterministicLayout;
  summary: BlockinfoPostRowSummary;
  snapshot: BlockinfoPostDeterministicSnapshot;
}): Promise<Buffer> {
  const backgroundDataUrl = await readBackgroundAsDataUrl(args.backgroundPath);
  const fonts = await loadDeterministicFonts();
  const theme = getBlockinfoPostTemplateTheme(args.templateVariant);
  const layout = applyBlockinfoPostTemplateTheme(args.layout, args.templateVariant);
  const visibleRows = layout.table.statRows.filter((row) => row.visible);
  const footer = formatDisplayDateTime(args.snapshot.latestMeasuredAt);
  const visibleColumns = visibleColumnEntries(layout);
  const tableLeft = layout.table.columns.label.x;
  const tableRight = visibleColumns[visibleColumns.length - 1]!.block.x + visibleColumns[visibleColumns.length - 1]!.block.maxWidth;
  const dividerXs = visibleColumns.slice(0, -1).map((entry, index) => columnDividerX(entry.block, visibleColumns[index + 1]!.block));
  const headerDividerY = layout.table.startY - 20;
  const rowLineYs = visibleRows.map((_, index) => layout.table.startY + (index + 1) * layout.table.rowHeight - 18);

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: theme.canvasColor,
          fontFamily: DETERMINISTIC_FONT_FAMILY,
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundDataUrl}
          alt=""
          width={layout.width}
          height={layout.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {renderTextBlock(layout.header.eyebrow, "$ ZCASH-CLI GETBLOCKCHAININFO", "eyebrow")}
        <div
          style={{
            position: "absolute",
            left: layout.header.title.x,
            top: layout.header.title.y,
            width: layout.header.title.maxWidth,
            display: "flex",
            fontSize: layout.header.title.fontSize,
            fontWeight: layout.header.title.fontWeight,
            lineHeight: layout.header.title.lineHeight,
            letterSpacing: `${layout.header.title.letterSpacing}px`,
            background: `linear-gradient(180deg, ${theme.titleGradient[0]} 0%, ${theme.titleGradient[1]} 42%, ${theme.titleGradient[2]} 100%)`,
            color: "transparent",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            whiteSpace: "nowrap",
            fontFamily: DETERMINISTIC_FONT_FAMILY,
          }}
        >
          {args.summary.height != null ? `Block ${Math.round(args.summary.height).toLocaleString("en-US")}` : "Latest Block"}
        </div>
        {renderTextBlock(layout.header.subtitle, "", "subtitle")}

        {visibleColumns.map((entry) =>
          renderTextBlock(
            {
              ...entry.block,
              y: layout.table.headerY,
              fontWeight: 800,
              fontSize: layout.table.columns.label.fontSize,
            },
            entry.label,
            `header-${entry.key}`,
          ),
        )}

        <div
          style={{
            position: "absolute",
            left: tableLeft,
            top: headerDividerY,
            width: tableRight - tableLeft,
            height: DETERMINISTIC_GRID_HORIZONTAL_THICKNESS,
            background: theme.gridColor,
          }}
        />

        {dividerXs.map((x, index) => (
          <div
            key={`divider-${index}`}
            style={{
              position: "absolute",
              left: x,
              top: layout.table.headerY - 8,
              width: DETERMINISTIC_GRID_VERTICAL_THICKNESS,
              height: visibleRows.length * layout.table.rowHeight + 26,
              background: theme.gridColor,
            }}
          />
        ))}

        {rowLineYs.map((y, index) => (
          <div
            key={`rowline-${index}`}
            style={{
              position: "absolute",
              left: tableLeft,
              top: y,
              width: tableRight - tableLeft,
              height: DETERMINISTIC_GRID_HORIZONTAL_THICKNESS,
              background: theme.gridColor,
            }}
          />
        ))}

        {visibleRows.flatMap((row, index) => {
          const stat = args.snapshot.stats[row.key];
          const y = layout.table.startY + index * layout.table.rowHeight;
          return visibleColumns.map((entry) => {
            const text =
              entry.key === "label"
                ? row.label
                : entry.key === "current"
                  ? stat.formattedCurrent
                  : entry.key === "delta1d"
                    ? stat.deltas["1d"].formatted
                    : entry.key === "delta7d"
                      ? stat.deltas["7d"].formatted
                      : stat.deltas["30d"].formatted;
            return renderTextBlock({ ...entry.block, y }, text, `${row.key}-${entry.key}`);
          });
        })}

        {renderTextBlock(layout.footer, footer, "footer")}
      </div>
    ),
    {
      width: layout.width,
      height: layout.height,
      fonts,
    },
  );

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
