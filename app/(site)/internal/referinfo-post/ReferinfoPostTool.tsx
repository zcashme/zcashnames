"use client";

import { useRef, useState, useTransition } from "react";
import {
  computeReferinfoRows,
  referinfoDividerX,
  referinfoIndirectReferralColumnGroup,
  referinfoReferralColumnGroup,
  referinfoRewardColumnGroup,
  visibleReferinfoColumns,
  wrapTextToBlock,
} from "@/lib/referinfo-post/layout";
import {
  DEFAULT_REFERINFO_POST_SCHEDULE,
  REFERINFO_POST_DESTINATIONS,
  isReferinfoImagePostKind,
  type ReferinfoDeterministicLayout,
  type ReferinfoDeterministicLayoutKind,
  type ReferinfoPlannedPost,
  type ReferinfoPostDestination,
  type ReferinfoPostResult,
  type ReferinfoPostScheduleState,
  type ReferinfoReportWindow,
} from "@/lib/referinfo-post/types";
import {
  dryRunReferinfoPostAction,
  runReferinfoPostAction,
  saveReferinfoDeterministicLayoutAction,
  saveReferinfoPostScheduleAction,
} from "./actions";

const DETERMINISTIC_FONT_FAMILY = '"DeterministicMono", monospace';
const GRID_VERTICAL_COLOR = "rgba(223,255,114,0.28)";
const GRID_VERTICAL_THICKNESS = 1;
const GRID_HORIZONTAL_COLOR = "rgba(223,255,114,0.28)";
const GRID_HORIZONTAL_THICKNESS = 2;

function previewHeaderTitle(post: ReferinfoPlannedPost) {
  return post.subtitle;
}

function destinationLabel(destination: ReferinfoPostDestination) {
  if (destination === "telegram") return "Telegram";
  if (destination === "x") return "X";
  return "Both";
}

function layoutKindForPost(post: ReferinfoPlannedPost): ReferinfoDeterministicLayoutKind {
  if (post.kind === "summary_top10") return "top10";
  if (post.kind === "top_indirect") return "top_indirect";
  if (post.kind === "leader_changes") return "leader_changes";
  return "top5";
}

function layoutLabel(kind: ReferinfoDeterministicLayoutKind) {
  if (kind === "top10") return "Top 10 Layout";
  if (kind === "top_indirect") return "Top Indirect Layout";
  if (kind === "leader_changes") return "Leader Changes Layout";
  return "Top 5 Layout";
}

function toTimeInputValue(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function fromTimeInputValue(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function svgAnchor(align: "left" | "center" | "right") {
  if (align === "right") return "end";
  if (align === "center") return "middle";
  return "start";
}

function svgX(block: ReferinfoDeterministicLayout["header"]["eyebrow"]) {
  if (block.textAlign === "right") return block.x + block.maxWidth;
  if (block.textAlign === "center") return block.x + block.maxWidth / 2;
  return block.x;
}

function SvgBlock(props: { block: ReferinfoDeterministicLayout["header"]["eyebrow"]; text: string; keyValue: string }) {
  const { block, text } = props;
  if (!block.visible) return null;
  const lines = text.split("\n");
  return (
    <text
      key={props.keyValue}
      x={svgX(block)}
      y={block.y}
      fill={block.color}
      fillOpacity={block.opacity}
      fontSize={block.fontSize}
      fontWeight={block.fontWeight}
      letterSpacing={block.letterSpacing}
      textAnchor={svgAnchor(block.textAlign)}
      fontFamily={DETERMINISTIC_FONT_FAMILY}
      dominantBaseline="hanging"
    >
      {lines.map((line, index) => (
        <tspan key={`${props.keyValue}-${index}`} x={svgX(block)} dy={index === 0 ? 0 : block.fontSize * block.lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function SvgHeaderTitle(props: { block: ReferinfoDeterministicLayout["header"]["title"]; text: string }) {
  const { block, text } = props;
  if (!block.visible) return null;
  return (
    <text
      x={svgX(block)}
      y={block.y}
      fill="url(#referinfo-title-gradient)"
      fillOpacity={block.opacity}
      fontSize={block.fontSize}
      fontWeight={block.fontWeight}
      letterSpacing={block.letterSpacing}
      textAnchor={svgAnchor(block.textAlign)}
      fontFamily={DETERMINISTIC_FONT_FAMILY}
      dominantBaseline="hanging"
      style={{ whiteSpace: "pre" }}
    >
      {text}
    </text>
  );
}

function NumericField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
      {props.label}
      <input
        type="number"
        value={Number.isFinite(props.value) ? props.value : 0}
        step={props.step ?? 1}
        min={props.min}
        max={props.max}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
      />
    </label>
  );
}

function TextBlockEditor(props: {
  title: string;
  block: ReferinfoDeterministicLayout["header"]["eyebrow"];
  onChange: (patch: Partial<ReferinfoDeterministicLayout["header"]["eyebrow"]>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
      <div className="text-sm font-bold text-fg-heading">{props.title}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumericField label="X" value={props.block.x} onChange={(value) => props.onChange({ x: value })} />
        <NumericField label="Y" value={props.block.y} onChange={(value) => props.onChange({ y: value })} />
        <NumericField label="Max Width" value={props.block.maxWidth} onChange={(value) => props.onChange({ maxWidth: value })} min={1} />
        <NumericField label="Font Size" value={props.block.fontSize} onChange={(value) => props.onChange({ fontSize: value })} min={1} />
      </div>
    </div>
  );
}

function PreviewCard(props: {
  post: ReferinfoPlannedPost;
  layout: ReferinfoDeterministicLayout;
  backgroundUrl: string;
  reportWindow: ReferinfoReportWindow | null;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const columns = visibleReferinfoColumns(props.layout, props.post);
  const tableLeft = columns[0]?.block.x ?? 0;
  const columnTableRight = columns[columns.length - 1] ? columns[columns.length - 1]!.block.x + columns[columns.length - 1]!.block.maxWidth : 900;
  const tableRight = Math.max(columnTableRight, props.layout.width - 92);
  const dividerXs = columns.slice(0, -1).map((entry, index) => referinfoDividerX(entry.block, columns[index + 1]!.block));
  const referralGroup = referinfoReferralColumnGroup(columns) ?? referinfoIndirectReferralColumnGroup(columns);
  const rewardGroup = referinfoRewardColumnGroup(columns);
  const computedRows = computeReferinfoRows({ layout: props.layout, post: props.post, columns });
  const tableBottomY = computedRows[computedRows.length - 1]?.lineY ?? props.layout.table.startY;
  const noteY = props.layout.table.note.y;
  const groupedHeaderY = props.layout.table.headerY + 10;

  function isGroupedColumn(entry: (typeof columns)[number]) {
    const x = entry.block.x;
    if (referralGroup && x >= referralGroup.start.block.x && x <= referralGroup.end.block.x) return true;
    if (rewardGroup && x >= rewardGroup.start.block.x && x <= rewardGroup.end.block.x) return true;
    return false;
  }

  async function downloadPreviewPng() {
    if (!svgRef.current) return;
    setDownloadStatus(null);

    try {
      const svgNode = svgRef.current.cloneNode(true) as SVGSVGElement;
      svgNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svgNode.setAttribute("width", String(props.layout.width));
      svgNode.setAttribute("height", String(props.layout.height));

      const imageNode = svgNode.querySelector("image");
      if (imageNode) {
        imageNode.setAttributeNS("http://www.w3.org/1999/xlink", "href", `${window.location.origin}${props.backgroundUrl}`);
        imageNode.setAttribute("href", `${window.location.origin}${props.backgroundUrl}`);
      }

      const svgText = new XMLSerializer().serializeToString(svgNode);
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.decoding = "async";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to render SVG preview for download."));
        image.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = props.layout.width;
      canvas.height = props.layout.height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(svgUrl);
        throw new Error("Canvas context unavailable.");
      }

      context.drawImage(image, 0, 0, props.layout.width, props.layout.height);
      URL.revokeObjectURL(svgUrl);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to encode preview PNG."));
            return;
          }
          resolve(blob);
        }, "image/png");
      });

      const downloadUrl = URL.createObjectURL(pngBlob);
      const anchor = document.createElement("a");
      const weekKey = props.reportWindow?.weekStartIso?.slice(0, 10) ?? "preview";
      anchor.href = downloadUrl;
      anchor.download = `referinfo-${weekKey}-${String(props.post.order + 1).padStart(2, "0")}-${props.post.kind}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      setDownloadStatus("PNG downloaded.");
    } catch (error) {
      setDownloadStatus(error instanceof Error ? error.message : "PNG download failed.");
    }
  }

  return (
    <div className="grid gap-3 overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)] p-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void downloadPreviewPng()}
          className="rounded-md border border-border-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-heading transition-colors hover:border-fg-heading"
        >
          Download PNG
        </button>
        {downloadStatus ? <div className="text-xs font-semibold text-fg-muted">{downloadStatus}</div> : null}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${props.layout.width} ${props.layout.height}`} className="block aspect-square w-full bg-[#08130d]">
        <defs>
          <linearGradient id="referinfo-title-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f3ff8f" />
            <stop offset="42%" stopColor="#dfff72" />
            <stop offset="100%" stopColor="#94d11a" />
          </linearGradient>
        </defs>
        <image href={props.backgroundUrl} x="0" y="0" width={props.layout.width} height={props.layout.height} preserveAspectRatio="xMidYMid slice" />
        <SvgBlock block={props.layout.header.eyebrow} text={props.post.title} keyValue="eyebrow" />
        <SvgHeaderTitle block={props.layout.header.title} text={previewHeaderTitle(props.post)} />
        <SvgBlock block={props.layout.header.subtitle} text="" keyValue="subtitle" />

        {columns.map((entry) => (
          <SvgBlock
            key={`header-${entry.key}`}
            block={{
              ...entry.block,
              y: isGroupedColumn(entry) ? groupedHeaderY : props.layout.table.headerY,
              fontSize: props.layout.table.headerFontSize,
            }}
            text={wrapTextToBlock(entry.label, { ...entry.block, fontSize: props.layout.table.headerFontSize }).join("\n")}
            keyValue={`header-${entry.key}`}
          />
        ))}
        {referralGroup ? (
          <>
            <SvgBlock
              block={{
                ...referralGroup.start.block,
                x: referralGroup.start.block.x,
                y: props.layout.table.headerY - 26,
                maxWidth: referralGroup.end.block.x + referralGroup.end.block.maxWidth - referralGroup.start.block.x,
                fontSize: 16,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 0.6,
              }}
              text="Referrals"
              keyValue="header-referrals"
            />
            <line
              x1={referralGroup.start.block.x}
              x2={referralGroup.end.block.x + referralGroup.end.block.maxWidth}
              y1={props.layout.table.headerY - 6}
              y2={props.layout.table.headerY - 6}
              stroke="rgba(223,255,114,0.52)"
              strokeWidth="2"
            />
          </>
        ) : null}
        {rewardGroup ? (
          <>
            <SvgBlock
              block={{
                ...rewardGroup.start.block,
                x: rewardGroup.start.block.x,
                y: props.layout.table.headerY - 26,
                maxWidth: rewardGroup.end.block.x + rewardGroup.end.block.maxWidth - rewardGroup.start.block.x,
                fontSize: 16,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 0.6,
              }}
              text="Rewards"
              keyValue="header-rewards"
            />
            <line
              x1={rewardGroup.start.block.x}
              x2={rewardGroup.end.block.x + rewardGroup.end.block.maxWidth}
              y1={props.layout.table.headerY - 6}
              y2={props.layout.table.headerY - 6}
              stroke="rgba(223,255,114,0.52)"
              strokeWidth="2"
            />
          </>
        ) : null}

        <line
          x1={tableLeft}
          x2={tableRight}
          y1={props.layout.table.startY - 24}
          y2={props.layout.table.startY - 24}
          stroke={GRID_HORIZONTAL_COLOR}
          strokeWidth={GRID_HORIZONTAL_THICKNESS}
        />

        {dividerXs.map((x, index) => (
          <line
            key={`divider-${index}`}
            x1={x}
            x2={x}
            y1={props.layout.table.headerY - 8}
            y2={tableBottomY}
            stroke={GRID_VERTICAL_COLOR}
            strokeWidth={GRID_VERTICAL_THICKNESS}
          />
        ))}

        {computedRows.map((row, index) => {
          const y = row.lineY;
          return (
            <line
              key={`row-${index}`}
              x1={tableLeft}
              x2={tableRight}
              y1={y}
              y2={y}
              stroke={GRID_HORIZONTAL_COLOR}
              strokeWidth={GRID_HORIZONTAL_THICKNESS}
            />
          );
        })}

        {computedRows.map((row, rowIndex) => {
          const sourceRow = props.post.table.rows[rowIndex];
          if (!sourceRow) return null;
          return row.cells.map((cellLines, cellIndex) => {
            const block = columns[cellIndex]?.block;
            if (!block) return null;
            return <SvgBlock keyValue={`${sourceRow.key}-${cellIndex}`} block={{ ...block, y: row.topY }} text={cellLines.join("\n")} />;
          });
        })}

        <SvgBlock block={{ ...props.layout.table.note, y: noteY }} text={props.post.table.note ?? ""} keyValue="note" />
        <SvgBlock block={props.layout.footer} text={props.reportWindow ? props.reportWindow.weekLabel : "Preview unavailable"} keyValue="footer" />
      </svg>
    </div>
  );
}

function TextOnlyPreviewCard(props: { post: ReferinfoPlannedPost }) {
  return (
    <div className="rounded-2xl border border-border-muted bg-[var(--color-raised)] p-6">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Text-only post</div>
      <div className="mt-4 whitespace-pre-wrap text-base font-semibold leading-7 text-fg-heading">{props.post.caption}</div>
    </div>
  );
}

function LayoutEditor(props: {
  post: ReferinfoPlannedPost;
  kind: ReferinfoDeterministicLayoutKind;
  layout: ReferinfoDeterministicLayout;
  layoutPath: string;
  hostedFilesystemReadonly: boolean;
  status: string | null;
  isPending: boolean;
  onChange: (updater: (current: ReferinfoDeterministicLayout) => ReferinfoDeterministicLayout) => void;
  onSave: () => void;
}) {
  const [expandedSection, setExpandedSection] = useState<"text_blocks" | "table_columns" | null>("table_columns");

  const updateHeaderBlock = (
    key: keyof ReferinfoDeterministicLayout["header"],
    patch: Partial<ReferinfoDeterministicLayout["header"]["eyebrow"]>,
  ) => {
    props.onChange((current) => ({
      ...current,
      header: {
        ...current.header,
        [key]: {
          ...current.header[key],
          ...patch,
        },
      },
    }));
  };

  const updateTableBlock = (patch: Partial<ReferinfoDeterministicLayout["table"]["note"]>) => {
    props.onChange((current) => ({
      ...current,
      table: {
        ...current.table,
        note: {
          ...current.table.note,
          ...patch,
        },
      },
    }));
  };

  const updateFooterBlock = (patch: Partial<ReferinfoDeterministicLayout["footer"]>) => {
    props.onChange((current) => ({
      ...current,
      footer: {
        ...current.footer,
        ...patch,
      },
    }));
  };

  const updateColumn = (key: string, patch: Partial<ReferinfoDeterministicLayout["table"]["columns"][number]>) => {
    props.onChange((current) => ({
      ...current,
      table: {
        ...current.table,
        columns: current.table.columns.map((column, columnIndex) =>
          column.key === key ? { ...column, ...patch } : column,
        ),
      },
    }));
  };

  const setUnifiedNumericFont = (value: number) => {
    props.onChange((current) => ({
      ...current,
      table: {
        ...current.table,
        columns: current.table.columns.map((column) => ({ ...column, fontSize: value })),
      },
    }));
  };

  const setUnifiedHeaderFont = (value: number) => {
    props.onChange((current) => ({
      ...current,
      table: {
        ...current.table,
        headerFontSize: value,
      },
    }));
  };

  const toggleSection = (section: "text_blocks" | "table_columns") => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  return (
    <div className="grid gap-4 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">{layoutLabel(props.kind)}</div>
          <div className="mt-1 text-sm text-fg-body">
            {props.kind === "top5"
              ? "Shared by Top Movers, Top Newcomers, and Top Referrals."
              : "Edits here apply directly to this checked-in layout JSON."}
          </div>
          <div className="mt-2 text-xs text-fg-muted break-all">{props.layoutPath}</div>
        </div>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.isPending || props.hostedFilesystemReadonly}
          className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save layout JSON
        </button>
      </div>

      {props.hostedFilesystemReadonly ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Layout saving is disabled on Vercel. Save locally, commit the JSON, and redeploy.
        </div>
      ) : null}
      {props.status ? <div className="text-sm font-semibold text-fg-body">{props.status}</div> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <NumericField
          label="Header Y"
          value={props.layout.table.headerY}
          onChange={(value) => props.onChange((current) => ({ ...current, table: { ...current.table, headerY: value } }))}
        />
        <NumericField
          label="Start Y"
          value={props.layout.table.startY}
          onChange={(value) => props.onChange((current) => ({ ...current, table: { ...current.table, startY: value } }))}
        />
        <NumericField
          label="Row Height"
          value={props.layout.table.rowHeight}
          onChange={(value) => props.onChange((current) => ({ ...current, table: { ...current.table, rowHeight: value } }))}
          min={1}
        />
        <NumericField
          label="Note Y"
          value={props.layout.table.note.y}
          onChange={(value) => updateTableBlock({ y: value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NumericField
          label="Column Label Font"
          value={props.layout.table.headerFontSize}
          onChange={setUnifiedHeaderFont}
          min={1}
        />
        <NumericField
          label="Column Value Font"
          value={props.layout.table.columns[0]?.fontSize ?? 18}
          onChange={setUnifiedNumericFont}
          min={1}
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-card)] p-4">
        <button
          type="button"
          onClick={() => toggleSection("text_blocks")}
          className="flex items-center justify-between gap-3 text-left"
        >
          <div className="text-sm font-bold text-fg-heading">Text Blocks</div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {expandedSection === "text_blocks" ? "Collapse" : "Expand"}
          </div>
        </button>
        {expandedSection === "text_blocks" ? (
          <div className="grid gap-3">
            <TextBlockEditor
              title="Eyebrow"
              block={props.layout.header.eyebrow}
              onChange={(patch) => updateHeaderBlock("eyebrow", patch)}
            />
            <TextBlockEditor
              title="Title"
              block={props.layout.header.title}
              onChange={(patch) => updateHeaderBlock("title", patch)}
            />
            <TextBlockEditor
              title="Footer"
              block={props.layout.footer}
              onChange={updateFooterBlock}
            />
            <TextBlockEditor
              title="Body Note"
              block={props.layout.table.note}
              onChange={updateTableBlock}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-card)] p-4">
        <button
          type="button"
          onClick={() => toggleSection("table_columns")}
          className="flex items-center justify-between gap-3 text-left"
        >
          <div className="text-sm font-bold text-fg-heading">Table Columns</div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {expandedSection === "table_columns" ? "Collapse" : "Expand"}
          </div>
        </button>
        {expandedSection === "table_columns" ? (
          <div className="grid gap-4">
            {props.post.table.columns.map((column, index) => {
              const block = props.layout.table.columns.find((candidate) => candidate.key === column.key) ?? props.layout.table.columns[index];
              if (!block) return null;
              return (
                <div key={`${props.post.kind}-${column.key}`} className="grid gap-3 rounded-lg border border-border-muted bg-[var(--color-raised)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-fg-heading">{column.label}</div>
                    <div className="text-xs uppercase tracking-[0.12em] text-fg-muted">{column.key}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumericField label="X" value={block.x} onChange={(value) => updateColumn(column.key, { x: value })} />
                    <NumericField label="Width" value={block.maxWidth} onChange={(value) => updateColumn(column.key, { maxWidth: value })} min={1} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: ReferinfoPostResult | null }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-border-muted bg-[var(--color-card)] p-5 text-sm text-fg-muted">
        Run or dry-run the workflow to inspect the weekly window, per-post delivery statuses, and X thread result.
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">{result.mode}</div>
        <div className={`rounded-full px-3 py-1 text-xs font-bold ${result.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
          {result.ok ? "Success" : "Failed"}
        </div>
        {result.destinationsRequested ? (
          <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold text-fg-body">
            {destinationLabel(result.destinationsRequested)}
          </div>
        ) : null}
      </div>

      {result.skipReason ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{result.skipReason}</div>
      ) : null}

      {result.error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{result.error}</div>
      ) : null}

      {result.reportWindow ? (
        <div className="grid gap-2 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Report Window</div>
          <div>Week: <span className="font-semibold text-fg-heading">{result.reportWindow.weekLabel}</span></div>
          <div>Previous: <span className="font-semibold text-fg-heading">{result.reportWindow.prevWeekLabel}</span></div>
          <div>Timezone: <span className="font-semibold text-fg-heading">{result.reportWindow.timeZone}</span></div>
          <div>X thread mode: <span className="font-semibold text-fg-heading">{result.thread?.xThreadMode ?? "N/A"}</span></div>
          <div>Root X post ID: <span className="font-semibold text-fg-heading">{result.rootXPostId ?? "N/A"}</span></div>
        </div>
      ) : null}

      {result.schedule ? (
        <div className="grid gap-2 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Schedule State</div>
          <div>Enabled: <span className="font-semibold text-fg-heading">{result.schedule.enabled ? "Yes" : "No"}</span></div>
          <div>Destination: <span className="font-semibold text-fg-heading">{destinationLabel(result.schedule.destination)}</span></div>
          <div>Weekly target: <span className="font-semibold text-fg-heading">Monday {toTimeInputValue(result.schedule.weeklyHour, result.schedule.weeklyMinute)} {result.schedule.weeklyTimezone}</span></div>
          <div>Last run started: <span className="font-semibold text-fg-heading">{result.schedule.lastRunStartedAt ?? "N/A"}</span></div>
          <div>Last run completed: <span className="font-semibold text-fg-heading">{result.schedule.lastRunCompletedAt ?? "N/A"}</span></div>
          <div>Last run status: <span className="font-semibold text-fg-heading">{result.schedule.lastRunStatus ?? "N/A"}</span></div>
          <div>Last error: <span className="font-semibold text-fg-heading">{result.schedule.lastError ?? "N/A"}</span></div>
        </div>
      ) : null}

      {result.plannedPosts?.length ? (
        <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Per-Post Delivery</div>
          {result.plannedPosts.map((post) => (
            <div key={post.kind} className="rounded-lg border border-border-muted bg-[var(--color-card)] p-3">
              <div className="font-semibold text-fg-heading">{String(post.order + 1).padStart(2, "0")} · {post.kind}</div>
              <div className="mt-2 break-all">Local file: <span className="font-semibold text-fg-heading">{post.localFilePath || "N/A"}</span></div>
              <div className="break-all">Storage object: <span className="font-semibold text-fg-heading">{post.storageObjectPath || "N/A"}</span></div>
              <div className="mt-2">
                Telegram: <span className="font-semibold text-fg-heading">
                  {post.delivery.telegram.attempted
                    ? post.delivery.telegram.ok
                      ? `Sent (${post.delivery.telegram.telegramMessageId ?? "no id"})`
                      : `Failed${post.delivery.telegram.error ? ` - ${post.delivery.telegram.error}` : ""}`
                    : "Not requested"}
                </span>
              </div>
              <div>
                X: <span className="font-semibold text-fg-heading">
                  {post.delivery.x.attempted
                    ? post.delivery.x.ok
                      ? `Posted (${post.delivery.x.xPostId ?? "no id"})`
                      : `Failed${post.delivery.x.error ? ` - ${post.delivery.x.error}` : ""}`
                    : "Not requested"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ReferinfoPostTool(props: {
  initialSchedule: ReferinfoPostScheduleState;
  initialPreviewPosts: ReferinfoPlannedPost[];
  initialReportWindow: ReferinfoReportWindow | null;
  top10Layout: ReferinfoDeterministicLayout;
  top5Layout: ReferinfoDeterministicLayout;
  topIndirectLayout: ReferinfoDeterministicLayout;
  leaderChangesLayout: ReferinfoDeterministicLayout;
  hostedFilesystemReadonly: boolean;
  deterministicBackgroundPath: string;
  top10LayoutPath: string;
  top5LayoutPath: string;
  topIndirectLayoutPath: string;
  leaderChangesLayoutPath: string;
  captionPolicyPath: string;
  initialPreviewError: string | null;
}) {
  const [result, setResult] = useState<ReferinfoPostResult | null>(null);
  const [destination, setDestination] = useState<ReferinfoPostDestination>(props.initialSchedule.destination);
  const [schedule, setSchedule] = useState<ReferinfoPostScheduleState>(props.initialSchedule);
  const [timeInput, setTimeInput] = useState(toTimeInputValue(props.initialSchedule.weeklyHour, props.initialSchedule.weeklyMinute));
  const [status, setStatus] = useState<string | null>(props.initialPreviewError);
  const [layoutStatuses, setLayoutStatuses] = useState<Record<ReferinfoDeterministicLayoutKind, string | null>>({
    top10: null,
    top5: null,
    top_indirect: null,
    leader_changes: null,
  });
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Record<ReferinfoDeterministicLayoutKind, ReferinfoDeterministicLayout>>({
    top10: props.top10Layout,
    top5: props.top5Layout,
    top_indirect: props.topIndirectLayout,
    leader_changes: props.leaderChangesLayout,
  });
  const [isPending, startTransition] = useTransition();

  const previewPosts = result?.plannedPosts ?? props.initialPreviewPosts;
  const reportWindow = result?.reportWindow ?? props.initialReportWindow;
  const backgroundUrl = "/api/referinfo-post/background";

  function layoutForPost(post: ReferinfoPlannedPost) {
    return layouts[layoutKindForPost(post)];
  }

  function layoutPathForKind(kind: ReferinfoDeterministicLayoutKind) {
    if (kind === "top10") return props.top10LayoutPath;
    if (kind === "top_indirect") return props.topIndirectLayoutPath;
    if (kind === "leader_changes") return props.leaderChangesLayoutPath;
    return props.top5LayoutPath;
  }

  function updateLayout(kind: ReferinfoDeterministicLayoutKind, updater: (current: ReferinfoDeterministicLayout) => ReferinfoDeterministicLayout) {
    setLayouts((current) => ({
      ...current,
      [kind]: updater(current[kind]),
    }));
  }

  function trigger(mode: "run" | "dry-run") {
    startTransition(async () => {
      setPendingLabel(mode === "run" ? `Run ${destination === "both" ? "Both" : destination === "x" ? "X" : "Telegram"} Deterministic` : "Dry Run Deterministic");
      setStatus(null);
      const nextResult = mode === "run"
        ? await runReferinfoPostAction(destination, "deterministic")
        : await dryRunReferinfoPostAction(destination, "deterministic");
      setResult(nextResult);
      setPendingLabel(null);
      setStatus(nextResult.ok ? (mode === "run" ? "Referinfo run completed." : "Dry run completed.") : nextResult.error ?? "Referinfo workflow failed.");
    });
  }

  function saveSchedule() {
    const parsed = fromTimeInputValue(timeInput);
    if (!parsed) {
      setStatus("Enter a valid weekly time in HH:MM format.");
      return;
    }

    startTransition(async () => {
      setPendingLabel("Save schedule");
      const response = await saveReferinfoPostScheduleAction({
        enabled: schedule.enabled,
        destination,
        renderMode: "deterministic",
        scheduleMode: "weekly_time",
        weeklyWeekday: 1,
        weeklyHour: parsed.hour,
        weeklyMinute: parsed.minute,
        weeklyTimezone: schedule.weeklyTimezone || DEFAULT_REFERINFO_POST_SCHEDULE.weeklyTimezone,
      });
      if (response.ok) {
        setSchedule(response.schedule);
        setTimeInput(toTimeInputValue(response.schedule.weeklyHour, response.schedule.weeklyMinute));
        setStatus("Schedule saved.");
      } else {
        setStatus(response.error);
      }
      setPendingLabel(null);
    });
  }

  function saveLayout(kind: ReferinfoDeterministicLayoutKind) {
    startTransition(async () => {
      setPendingLabel(`Save ${layoutLabel(kind)}`);
      setLayoutStatuses((current) => ({ ...current, [kind]: null }));
      const response = await saveReferinfoDeterministicLayoutAction(kind, layouts[kind]);
      setLayoutStatuses((current) => ({
        ...current,
        [kind]: response.ok ? `${layoutLabel(kind)} saved.` : response.error,
      }));
      setPendingLabel(null);
    });
  }

  return (
    <div className="grid w-full gap-6 px-4 pb-12 sm:px-6 xl:px-8 2xl:px-10">
      <section className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Deterministic Weekly Thread</div>
        <h2 className="text-2xl font-bold text-fg-heading">Referinfo Post</h2>
        <p className="max-w-4xl text-sm leading-6 text-fg-body">
          Preview the weekly six-post referinfo queue, save the Monday 11:30 America/New_York schedule, then dry-run or publish the deterministic Telegram batch and X thread.
        </p>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            Destination
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value as ReferinfoPostDestination)}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
            >
              {REFERINFO_POST_DESTINATIONS.map((value) => (
                <option key={value} value={value}>
                  {destinationLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            Weekly Time
            <input
              type="time"
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
            />
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            Timezone
            <input
              type="text"
              value={schedule.weeklyTimezone}
              onChange={(event) => setSchedule((current) => ({ ...current, weeklyTimezone: event.target.value }))}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading">
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(event) => setSchedule((current) => ({ ...current, enabled: event.target.checked, destination }))}
              className="h-4 w-4 rounded border-border-muted"
            />
            Enable weekly schedule
          </label>
        </div>

        <div className="grid gap-2 text-sm text-fg-body">
          <div>Current weekly target: <span className="font-semibold text-fg-heading">Monday {toTimeInputValue(schedule.weeklyHour, schedule.weeklyMinute)} {schedule.weeklyTimezone}</span></div>
          <div>Background: <span className="font-semibold text-fg-heading break-all">{props.deterministicBackgroundPath}</span></div>
          <div>Top 10 layout: <span className="font-semibold text-fg-heading break-all">{props.top10LayoutPath}</span></div>
          <div>Top 5 layout: <span className="font-semibold text-fg-heading break-all">{props.top5LayoutPath}</span></div>
          <div>Top indirect layout: <span className="font-semibold text-fg-heading break-all">{props.topIndirectLayoutPath}</span></div>
          <div>Leader changes layout: <span className="font-semibold text-fg-heading break-all">{props.leaderChangesLayoutPath}</span></div>
          <div>Caption policy: <span className="font-semibold text-fg-heading break-all">{props.captionPolicyPath}</span></div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => trigger("dry-run")}
            disabled={isPending}
            className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
          >
            Dry Run Deterministic
          </button>
          <button
            type="button"
            onClick={() => trigger("run")}
            disabled={isPending}
            className="rounded-lg bg-fg-heading px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run {destination === "both" ? "Both" : destination === "x" ? "X" : "Telegram"} Deterministic
          </button>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={isPending}
            className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save schedule
          </button>
        </div>

        {pendingLabel ? <div className="text-sm font-semibold text-fg-body">{pendingLabel}...</div> : null}
        {status ? <div className="text-sm font-semibold text-fg-body">{status}</div> : null}
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Preview Queue</div>
            <div className="mt-1 text-sm text-fg-body">
              Each card now includes live layout controls. Adjust the numbers, verify the preview, then save the underlying JSON.
            </div>
          </div>
          {reportWindow ? (
            <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold text-fg-body">
              {reportWindow.weekLabel}
            </div>
          ) : null}
        </div>

        {previewPosts.length === 0 ? (
          <div className="rounded-2xl border border-border-muted bg-[var(--color-card)] p-5 text-sm text-fg-muted">
            Preview unavailable. Check the page-level error or run a dry run for explicit diagnostics.
          </div>
        ) : (
          <div className="grid gap-5">
            {previewPosts.map((post) => {
              const imagePost = isReferinfoImagePostKind(post.kind);
              const kind = imagePost ? layoutKindForPost(post) : null;
              const layout = imagePost && kind ? layoutForPost(post) : null;
              return (
                <div
                  key={post.kind}
                  className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-5 xl:grid-cols-[minmax(0,1fr)_440px]"
                >
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                        {String(post.order + 1).padStart(2, "0")}
                      </div>
                      <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-heading">
                        {post.kind}
                      </div>
                      {kind ? (
                        <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-body">
                          {layoutLabel(kind)}
                        </div>
                      ) : (
                        <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-body">
                          Text only
                        </div>
                      )}
                    </div>

                    {imagePost && layout ? (
                      <PreviewCard
                        post={post}
                        layout={layout}
                        backgroundUrl={backgroundUrl}
                        reportWindow={reportWindow}
                      />
                    ) : (
                      <TextOnlyPreviewCard post={post} />
                    )}

                    <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Caption</span>
                        <div className="mt-2 whitespace-pre-wrap font-semibold text-fg-heading">{post.caption}</div>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Config</span>
                        <div className="mt-2">{post.configSummary}</div>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Metrics</span>
                        <div className="mt-2">{post.metricsSummary}</div>
                      </div>
                    </div>
                  </div>

                  {imagePost && kind && layout ? (
                    <details className="rounded-xl border border-border-muted bg-[var(--color-raised)] xl:self-start">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-fg-heading">
                        Layout editor
                      </summary>
                      <div className="px-4 pb-4">
                        <LayoutEditor
                          post={post}
                          kind={kind}
                          layout={layout}
                          layoutPath={layoutPathForKind(kind)}
                          hostedFilesystemReadonly={props.hostedFilesystemReadonly}
                          status={layoutStatuses[kind]}
                          isPending={isPending}
                          onChange={(updater) => updateLayout(kind, updater)}
                          onSave={() => saveLayout(kind)}
                        />
                      </div>
                    </details>
                  ) : (
                    <div className="rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body xl:self-start">
                      No image or layout JSON for this closing post.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ResultPanel result={result} />
    </div>
  );
}
