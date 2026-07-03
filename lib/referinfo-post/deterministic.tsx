import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getHostedReferinfoConfigMessage, isEphemeralReferinfoFilesystemRuntime } from "@/lib/referinfo-post/runtime";
import {
  computeReferinfoRows,
  referinfoDividerX,
  referinfoIndirectReferralColumnGroup,
  referinfoReferralColumnGroup,
  referinfoRewardColumnGroup,
  visibleReferinfoColumns,
  wrapTextToBlock,
} from "@/lib/referinfo-post/layout";
import type {
  ReferinfoCaptionPolicy,
  ReferinfoDeterministicLayout,
  ReferinfoDeterministicLayoutKind,
  ReferinfoDeterministicTextBlock,
  ReferinfoPlannedPost,
  ReferinfoPostKind,
  ReferinfoReportWindow,
} from "@/lib/referinfo-post/types";

const DEFAULT_BACKGROUND_PATH = path.resolve("templates/referinfo-post/template-image.png");
const DEFAULT_TOP10_LAYOUT_PATH = path.resolve("templates/referinfo-post/layout.top10.json");
const DEFAULT_TOP5_LAYOUT_PATH = path.resolve("templates/referinfo-post/layout.top5.json");
const DEFAULT_TOP_INDIRECT_LAYOUT_PATH = path.resolve("templates/referinfo-post/layout.top-indirect.json");
const DEFAULT_LEADER_CHANGES_LAYOUT_PATH = path.resolve("templates/referinfo-post/layout.leader-changes.json");
const DEFAULT_CAPTION_POLICY_PATH = path.resolve("templates/referinfo-post/caption-policy.json");
const DEFAULT_DETERMINISTIC_FONT_REGULAR_PATH = path.resolve("public/fonts/consola.ttf");
const DEFAULT_DETERMINISTIC_FONT_BOLD_PATH = path.resolve("public/fonts/consolab.ttf");
const DETERMINISTIC_FONT_FAMILY = '"DeterministicMono", monospace';
const DETERMINISTIC_GRID_VERTICAL_COLOR = "rgba(223, 255, 114, 0.28)";
const DETERMINISTIC_GRID_VERTICAL_THICKNESS = 1;
const DETERMINISTIC_GRID_HORIZONTAL_COLOR = "rgba(223, 255, 114, 0.28)";
const DETERMINISTIC_GRID_HORIZONTAL_THICKNESS = 2;

type DeterministicFontOption = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let deterministicFontDataPromise: Promise<DeterministicFontOption[]> | null = null;

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

function defaultTextBlock(input: Partial<ReferinfoDeterministicTextBlock>): ReferinfoDeterministicTextBlock {
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

function getDefaultLayout(columnKeys: string[]): ReferinfoDeterministicLayout {
  return {
    width: 1080,
    height: 1080,
    header: {
      eyebrow: defaultTextBlock({ x: 214, y: 62, maxWidth: 352, fontSize: 20, fontWeight: 700, lineHeight: 1.1, letterSpacing: 2, color: "#dfff72" }),
      title: defaultTextBlock({ x: 214, y: 94, maxWidth: 540, fontSize: 44, fontWeight: 800, lineHeight: 1.04, color: "#dfff72" }),
      subtitle: defaultTextBlock({ x: 78, y: 192, maxWidth: 700, fontSize: 22, fontWeight: 600, lineHeight: 1.18, color: "#dfff72", visible: false }),
    },
    table: {
      headerFontSize: 16,
      headerY: 300,
      startY: 360,
      rowHeight: 84,
      columns: columnKeys.map((key, index) => ({
        key,
        ...defaultTextBlock({
          x: 120 + index * 210,
          y: 0,
          maxWidth: index === 1 ? 360 : 150,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.04,
          textAlign: index === 1 ? "left" : "right",
          color: "#dfff72",
        }),
      })),
      note: defaultTextBlock({
        x: 180,
        y: 910,
        maxWidth: 720,
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.15,
        letterSpacing: 0.3,
        textAlign: "center",
        color: "#dfff72",
      }),
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
    }),
  };
}

function mergeTextBlock(
  base: ReferinfoDeterministicTextBlock,
  input: Partial<ReferinfoDeterministicTextBlock> | undefined,
): ReferinfoDeterministicTextBlock {
  return { ...base, ...(input ?? {}) };
}

function mergeLayout(
  base: ReferinfoDeterministicLayout,
  input: Partial<ReferinfoDeterministicLayout> | null | undefined,
): ReferinfoDeterministicLayout {
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
      headerFontSize: typeof next.table?.headerFontSize === "number" ? next.table.headerFontSize : base.table.headerFontSize,
      headerY: typeof next.table?.headerY === "number" ? next.table.headerY : base.table.headerY,
      startY: typeof next.table?.startY === "number" ? next.table.startY : base.table.startY,
      rowHeight: typeof next.table?.rowHeight === "number" ? next.table.rowHeight : base.table.rowHeight,
      columns: Array.isArray(next.table?.columns) && next.table.columns.length > 0
        ? next.table.columns.map((column, index) => ({
            key: typeof column.key === "string" && column.key.trim() ? column.key.trim() : base.table.columns[index]?.key ?? `col${index + 1}`,
            ...mergeTextBlock(base.table.columns[index] ?? defaultTextBlock({}), column),
          }))
        : base.table.columns,
      note: mergeTextBlock(base.table.note, next.table?.note),
    },
    footer: mergeTextBlock(base.footer, next.footer),
  };
}

function validateLayout(layout: ReferinfoDeterministicLayout): ReferinfoDeterministicLayout {
  if (layout.table.columns.length === 0) fail("Referinfo deterministic layout must include at least one table column.");
  if (layout.table.rowHeight <= 0) fail("Referinfo deterministic layout rowHeight must be greater than 0.");
  return layout;
}

export function getReferinfoDeterministicAssetConfig() {
  return {
    backgroundPath: path.resolve(process.env.REFERINFO_POST_DETERMINISTIC_BACKGROUND_PATH?.trim() || DEFAULT_BACKGROUND_PATH),
    top10LayoutPath: path.resolve(process.env.REFERINFO_POST_DETERMINISTIC_TOP10_LAYOUT_PATH?.trim() || DEFAULT_TOP10_LAYOUT_PATH),
    top5LayoutPath: path.resolve(process.env.REFERINFO_POST_DETERMINISTIC_TOP5_LAYOUT_PATH?.trim() || DEFAULT_TOP5_LAYOUT_PATH),
    topIndirectLayoutPath: path.resolve(process.env.REFERINFO_POST_DETERMINISTIC_TOP_INDIRECT_LAYOUT_PATH?.trim() || DEFAULT_TOP_INDIRECT_LAYOUT_PATH),
    leaderChangesLayoutPath: path.resolve(process.env.REFERINFO_POST_DETERMINISTIC_LEADER_CHANGES_LAYOUT_PATH?.trim() || DEFAULT_LEADER_CHANGES_LAYOUT_PATH),
    captionPolicyPath: path.resolve(process.env.REFERINFO_POST_DETERMINISTIC_CAPTION_POLICY_PATH?.trim() || DEFAULT_CAPTION_POLICY_PATH),
  };
}

export function getDeterministicLayoutPathForKind(
  kind: ReferinfoPostKind,
  assets = getReferinfoDeterministicAssetConfig(),
): string {
  if (kind === "closing_note") return "";
  if (kind === "summary_top10") return assets.top10LayoutPath;
  if (kind === "top_indirect") return assets.topIndirectLayoutPath;
  if (kind === "leader_changes") return assets.leaderChangesLayoutPath;
  return assets.top5LayoutPath;
}

export function getReferinfoDeterministicLayoutPathForEditorKind(
  kind: ReferinfoDeterministicLayoutKind,
  assets = getReferinfoDeterministicAssetConfig(),
): string {
  if (kind === "top10") return assets.top10LayoutPath;
  if (kind === "top_indirect") return assets.topIndirectLayoutPath;
  if (kind === "leader_changes") return assets.leaderChangesLayoutPath;
  return assets.top5LayoutPath;
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
  let raw = "";
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    fail(`Missing referinfo config file or unreadable file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    fail(`Invalid referinfo JSON config at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadReferinfoCaptionPolicy(
  captionPolicyPath = getReferinfoDeterministicAssetConfig().captionPolicyPath,
): Promise<ReferinfoCaptionPolicy> {
  const parsed = await loadJsonFile<Partial<ReferinfoCaptionPolicy>>(captionPolicyPath);
  const postOrder = Array.isArray(parsed.postOrder) && parsed.postOrder.length > 0 ? parsed.postOrder : [];
  const rootKind = typeof parsed.rootKind === "string" ? parsed.rootKind : "summary_top10";
  const xThreadMode = parsed.xThreadMode === "linear" ? "linear" : "linear";
  const telegramDeliveryMode = parsed.telegramDeliveryMode === "sequential" ? "sequential" : "sequential";
  const templates = parsed.templates;
  if (!templates || typeof templates !== "object") {
    fail(`Referinfo caption policy at ${captionPolicyPath} is missing templates.`);
  }

  return {
    postOrder: postOrder as ReferinfoCaptionPolicy["postOrder"],
    rootKind: rootKind as ReferinfoCaptionPolicy["rootKind"],
    xThreadMode,
    telegramDeliveryMode,
    templates: templates as ReferinfoCaptionPolicy["templates"],
  };
}

export async function loadReferinfoDeterministicLayout(layoutPath: string, columnKeys: string[]): Promise<ReferinfoDeterministicLayout> {
  const parsed = await loadJsonFile<Partial<ReferinfoDeterministicLayout>>(layoutPath);
  return validateLayout(mergeLayout(getDefaultLayout(columnKeys), parsed));
}

export async function saveReferinfoDeterministicLayout(
  kind: ReferinfoDeterministicLayoutKind,
  layout: ReferinfoDeterministicLayout,
): Promise<void> {
  if (isEphemeralReferinfoFilesystemRuntime()) {
    fail(getHostedReferinfoConfigMessage());
  }
  const columnKeys = layout.table.columns.map((column) => column.key);
  const normalized = validateLayout(mergeLayout(getDefaultLayout(columnKeys), layout));
  const layoutPath = getReferinfoDeterministicLayoutPathForEditorKind(kind);
  await writeFile(layoutPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

function renderTextBlock(block: ReferinfoDeterministicTextBlock, text: string, key: string) {
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
        whiteSpace: "pre",
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
    fail(`Missing referinfo background template or unreadable image at ${backgroundPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const ext = path.extname(backgroundPath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : null;
  if (!mimeType) {
    fail(`Unsupported referinfo background template file type for ${backgroundPath}. Expected png, jpg, jpeg, or webp.`);
  }

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function formatFooterText(reportWindow: ReferinfoReportWindow): string {
  return `${reportWindow.weekLabel} · ${reportWindow.timeZone}`;
}

function formatHeaderEyebrow(post: ReferinfoPlannedPost): string {
  return post.kind === "summary_top10" ? "$ WEEKLY REFERINFO" : "$ REFERRAL INTELLIGENCE";
}

function formatHeaderTitle(post: ReferinfoPlannedPost): string {
  return post.subtitle;
}

function renderHeaderTitle(block: ReferinfoDeterministicTextBlock, text: string) {
  if (!block.visible) return null;
  return (
    <div
      key="title"
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.maxWidth,
        display: "flex",
        justifyContent:
          block.textAlign === "right" ? "flex-end" : block.textAlign === "center" ? "center" : "flex-start",
        fontSize: block.fontSize,
        fontWeight: block.fontWeight,
        lineHeight: block.lineHeight,
        letterSpacing: `${block.letterSpacing}px`,
        background: "linear-gradient(180deg, #f3ff8f 0%, #dfff72 42%, #94d11a 100%)",
        color: "transparent",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        whiteSpace: "nowrap",
        textAlign: block.textAlign,
      }}
    >
      {text}
    </div>
  );
}

export async function renderReferinfoDeterministicImage(args: {
  backgroundPath: string;
  layout: ReferinfoDeterministicLayout;
  post: ReferinfoPlannedPost;
  reportWindow: ReferinfoReportWindow;
}): Promise<Buffer> {
  const backgroundDataUrl = await readBackgroundAsDataUrl(args.backgroundPath);
  const fonts = await loadDeterministicFonts();
  const columns = visibleReferinfoColumns(args.layout, args.post);
  const tableLeft = columns[0]?.block.x ?? args.layout.table.columns[0]?.x ?? 80;
  const columnTableRight = columns[columns.length - 1]
    ? columns[columns.length - 1]!.block.x + columns[columns.length - 1]!.block.maxWidth
    : tableLeft + 800;
  const tableRight = Math.max(columnTableRight, args.layout.width - 92);
  const dividerXs = columns.slice(0, -1).map((entry, index) => referinfoDividerX(entry.block, columns[index + 1]!.block));
  const referralGroup = referinfoReferralColumnGroup(columns) ?? referinfoIndirectReferralColumnGroup(columns);
  const rewardGroup = referinfoRewardColumnGroup(columns);
  const computedRows = computeReferinfoRows({ layout: args.layout, post: args.post, columns });
  const headerDividerY = args.layout.table.startY - 24;
  const rowLineYs = computedRows.map((row) => row.lineY);
  const tableBottomY = rowLineYs[rowLineYs.length - 1] ?? args.layout.table.startY;
  const noteY = args.layout.table.note.y;
  const groupedHeaderY = args.layout.table.headerY + 10;

  function isGroupedColumn(entry: (typeof columns)[number]) {
    const x = entry.block.x;
    if (referralGroup && x >= referralGroup.start.block.x && x <= referralGroup.end.block.x) return true;
    if (rewardGroup && x >= rewardGroup.start.block.x && x <= rewardGroup.end.block.x) return true;
    return false;
  }

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          background: "#08130d",
          fontFamily: DETERMINISTIC_FONT_FAMILY,
          color: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundDataUrl}
          alt=""
          width={args.layout.width}
          height={args.layout.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {renderTextBlock(args.layout.header.eyebrow, args.post.title, "eyebrow")}
        {renderHeaderTitle(args.layout.header.title, formatHeaderTitle(args.post))}
        {renderTextBlock(args.layout.header.subtitle, "", "subtitle")}

        {columns.map((entry) =>
          renderTextBlock(
            {
              ...entry.block,
              y: isGroupedColumn(entry) ? groupedHeaderY : args.layout.table.headerY,
              fontWeight: 800,
              fontSize: args.layout.table.headerFontSize,
            },
            wrapTextToBlock(entry.label, { ...entry.block, fontSize: args.layout.table.headerFontSize }).join("\n"),
            `header-${entry.key}`,
          ),
        )}
        {referralGroup ? (
          <>
            {renderTextBlock(
              {
                ...referralGroup.start.block,
                x: referralGroup.start.block.x,
                y: args.layout.table.headerY - 26,
                maxWidth: referralGroup.end.block.x + referralGroup.end.block.maxWidth - referralGroup.start.block.x,
                fontSize: 16,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 0.6,
              },
              "Referrals",
              "header-referrals",
            )}
            <div
              style={{
                position: "absolute",
                left: referralGroup.start.block.x,
                top: args.layout.table.headerY - 6,
                width: referralGroup.end.block.x + referralGroup.end.block.maxWidth - referralGroup.start.block.x,
                height: 2,
                background: "rgba(223, 255, 114, 0.52)",
              }}
            />
          </>
        ) : null}
        {rewardGroup ? (
          <>
            {renderTextBlock(
              {
                ...rewardGroup.start.block,
                x: rewardGroup.start.block.x,
                y: args.layout.table.headerY - 26,
                maxWidth: rewardGroup.end.block.x + rewardGroup.end.block.maxWidth - rewardGroup.start.block.x,
                fontSize: 16,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 0.6,
              },
              "Rewards",
              "header-rewards",
            )}
            <div
              style={{
                position: "absolute",
                left: rewardGroup.start.block.x,
                top: args.layout.table.headerY - 6,
                width: rewardGroup.end.block.x + rewardGroup.end.block.maxWidth - rewardGroup.start.block.x,
                height: 2,
                background: "rgba(223, 255, 114, 0.52)",
              }}
            />
          </>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: tableLeft,
            top: headerDividerY,
            width: tableRight - tableLeft,
            height: DETERMINISTIC_GRID_HORIZONTAL_THICKNESS,
            background: DETERMINISTIC_GRID_HORIZONTAL_COLOR,
          }}
        />

        {dividerXs.map((x, index) => (
          <div
            key={`divider-${index}`}
            style={{
              position: "absolute",
              left: x,
              top: args.layout.table.headerY - 8,
              width: DETERMINISTIC_GRID_VERTICAL_THICKNESS,
              height: Math.max(0, tableBottomY - (args.layout.table.headerY - 8)),
              background: DETERMINISTIC_GRID_VERTICAL_COLOR,
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
              background: DETERMINISTIC_GRID_HORIZONTAL_COLOR,
            }}
          />
        ))}

        {computedRows.map((row, rowIndex) => {
          const sourceRow = args.post.table.rows[rowIndex];
          if (!sourceRow) return null;
          return row.cells.map((cellLines, cellIndex) => {
            const block = columns[cellIndex]?.block;
            if (!block) return null;
            return renderTextBlock({ ...block, y: row.topY }, cellLines.join("\n"), `${sourceRow.key}-${cellIndex}`);
          });
        })}

        {renderTextBlock({ ...args.layout.table.note, y: noteY }, args.post.table.note ?? "", "note")}
        {renderTextBlock(args.layout.footer, args.reportWindow.weekLabel, "footer")}
      </div>
    ),
    {
      width: args.layout.width,
      height: args.layout.height,
      fonts,
    },
  );

  return Buffer.from(await response.arrayBuffer());
}

export function getReferinfoHostedConfigPersistenceMessage(): string {
  return getHostedReferinfoConfigMessage();
}

export function isHostedReferinfoFilesystemReadonly(): boolean {
  return isEphemeralReferinfoFilesystemRuntime();
}
