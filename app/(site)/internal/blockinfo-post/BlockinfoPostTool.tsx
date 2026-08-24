"use client";

import { useRef, useState, useTransition } from "react";
import {
  buildDeterministicCaptionDecision,
  getDefaultBlockinfoPostCaptionPolicy,
  type BlockinfoPostCaptionPolicy,
} from "@/lib/blockinfo-post/caption-policy";
import {
  BLOCKINFO_POST_DESTINATIONS,
  BLOCKINFO_POST_RENDER_MODES,
  DEFAULT_BLOCKINFO_POST_SCHEDULE,
  type BlockinfoPostCaptionSimpleRule,
  type BlockinfoPostCaptionThresholdRule,
  type BlockinfoPostDeterministicLayout,
  type BlockinfoPostDeterministicSnapshot,
  type BlockinfoPostDestination,
  type BlockinfoPostLayoutTextBlock,
  type BlockinfoPostRenderMode,
  type BlockinfoPostResult,
  type BlockinfoPostScheduleState,
} from "@/lib/blockinfo-post/types";
import {
  dryRunBlockinfoPostAction,
  runBlockinfoPostAction,
  saveBlockinfoPostScheduleAction,
  saveDeterministicCaptionPolicyAction,
  saveDeterministicLayoutAction,
} from "./actions";
import {
  applyBlockinfoPostTemplateTheme,
  BLOCKINFO_POST_TEMPLATE_VARIANTS,
  getBlockinfoPostTemplateTheme,
  type BlockinfoPostTemplateVariant,
} from "@/lib/blockinfo-post/template-variant";

const DETERMINISTIC_FONT_FAMILY = '"DeterministicMono", monospace';
const GRID_VERTICAL_THICKNESS = 1;
const GRID_HORIZONTAL_THICKNESS = 2;

function destinationLabel(destination: BlockinfoPostDestination) {
  if (destination === "telegram") return "Telegram";
  if (destination === "x") return "X";
  return "Both";
}

function renderModeLabel(renderMode: BlockinfoPostRenderMode) {
  return renderMode === "openai" ? "OpenAI" : "Deterministic";
}

function scheduleModeLabel(mode: BlockinfoPostScheduleState["scheduleMode"]) {
  return mode === "daily_time" ? "Daily time" : "Interval";
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

function previewFooterText(snapshot: BlockinfoPostDeterministicSnapshot | null) {
  const value = snapshot?.latestMeasuredAt;
  if (!value) return "DATE N/A";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "DATE N/A";
  const iso = date.toISOString();
  return `${iso.slice(0, 16)} UTC`;
}

function previewSubtitleText() {
  return "OPTIONAL SUBTITLE";
}

function svgAnchor(align: BlockinfoPostLayoutTextBlock["textAlign"]) {
  if (align === "right") return "end";
  if (align === "center") return "middle";
  return "start";
}

function svgX(block: BlockinfoPostLayoutTextBlock) {
  if (block.textAlign === "right") return block.x + block.maxWidth;
  if (block.textAlign === "center") return block.x + block.maxWidth / 2;
  return block.x;
}

function SvgBlock(props: { block: BlockinfoPostLayoutTextBlock; text: string; keyValue: string }) {
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

function visibleColumns(layout: BlockinfoPostDeterministicLayout) {
  return [
    { key: "label", block: layout.table.columns.label, label: "Statistic" },
    { key: "current", block: layout.table.columns.current, label: "Current" },
    { key: "delta1d", block: layout.table.columns.delta1d, label: "1-day" },
    { key: "delta7d", block: layout.table.columns.delta7d, label: "7-day" },
    { key: "delta30d", block: layout.table.columns.delta30d, label: "30-day" },
  ].filter((entry) => entry.block.visible);
}

function dividerX(left: BlockinfoPostLayoutTextBlock, right: BlockinfoPostLayoutTextBlock) {
  return Math.round((left.x + left.maxWidth + right.x) / 2);
}

function updateTextBlock(
  layout: BlockinfoPostDeterministicLayout,
  path: "header.eyebrow" | "header.title" | "header.subtitle" | "footer" | "table.note" | "table.columns.label" | "table.columns.current" | "table.columns.delta1d" | "table.columns.delta7d" | "table.columns.delta30d",
  patch: Partial<BlockinfoPostLayoutTextBlock>,
): BlockinfoPostDeterministicLayout {
  if (path === "footer") {
    return { ...layout, footer: { ...layout.footer, ...patch } };
  }

  if (path === "table.note") {
    return {
      ...layout,
      table: {
        ...layout.table,
        note: { ...layout.table.note, ...patch },
      },
    };
  }

  if (path.startsWith("header.")) {
    const key = path.replace("header.", "") as keyof BlockinfoPostDeterministicLayout["header"];
    return {
      ...layout,
      header: {
        ...layout.header,
        [key]: { ...layout.header[key], ...patch },
      },
    };
  }

  const key = path.replace("table.columns.", "") as keyof BlockinfoPostDeterministicLayout["table"]["columns"];
  return {
    ...layout,
    table: {
      ...layout.table,
      columns: {
        ...layout.table.columns,
        [key]: { ...layout.table.columns[key], ...patch },
      },
    },
  };
}

function NumericField(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
      {props.label}
      <input
        type="number"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={Number.isFinite(props.value) ? props.value : 0}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
      />
    </label>
  );
}

function TextBlockEditor(props: {
  title: string;
  block: BlockinfoPostLayoutTextBlock;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<BlockinfoPostLayoutTextBlock>) => void;
}) {
  const { block } = props;
  return (
    <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={props.onToggle}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="text-sm font-bold text-fg-heading">{props.title}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {props.expanded ? "Collapse" : "Expand"}
          </div>
        </button>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
          <input
            type="checkbox"
            checked={block.visible}
            onChange={(event) => props.onChange({ visible: event.target.checked })}
            className="h-4 w-4 rounded border-border-muted"
          />
          Visible
        </label>
      </div>

      {props.expanded ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <NumericField label="X" value={block.x} onChange={(value) => props.onChange({ x: value })} />
            <NumericField label="Y" value={block.y} onChange={(value) => props.onChange({ y: value })} />
            <NumericField label="Max Width" value={block.maxWidth} onChange={(value) => props.onChange({ maxWidth: value })} />
            <NumericField label="Font Size" value={block.fontSize} onChange={(value) => props.onChange({ fontSize: value })} />
            <NumericField label="Font Weight" value={block.fontWeight} onChange={(value) => props.onChange({ fontWeight: value })} />
            <NumericField label="Line Height" value={block.lineHeight} step={0.05} onChange={(value) => props.onChange({ lineHeight: value })} />
            <NumericField label="Letter Spacing" value={block.letterSpacing} step={0.1} onChange={(value) => props.onChange({ letterSpacing: value })} />
            <NumericField label="Opacity" value={block.opacity} min={0} max={1} step={0.05} onChange={(value) => props.onChange({ opacity: value })} />
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
              Align
              <select
                value={block.textAlign}
                onChange={(event) => props.onChange({ textAlign: event.target.value as BlockinfoPostLayoutTextBlock["textAlign"] })}
                className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            Color
            <input
              type="text"
              value={block.color}
              onChange={(event) => props.onChange({ color: event.target.value })}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading outline-none focus:border-fg-heading"
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

type EditorSection = {
  id: string;
  title: string;
  block: BlockinfoPostLayoutTextBlock;
  onChange: (patch: Partial<BlockinfoPostLayoutTextBlock>) => void;
};

function CaptionThresholdRuleEditor(props: {
  title: string;
  rule: BlockinfoPostCaptionThresholdRule;
  showAbsolute?: boolean;
  showPercent?: boolean;
  onChange: (patch: Partial<BlockinfoPostCaptionThresholdRule>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-fg-heading">{props.title}</div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
          <input
            type="checkbox"
            checked={props.rule.enabled}
            onChange={(event) => props.onChange({ enabled: event.target.checked })}
            className="h-4 w-4 rounded border-border-muted"
          />
          Enabled
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <NumericField label="Priority" value={props.rule.priority} onChange={(value) => props.onChange({ priority: value })} />
        {props.showAbsolute ? (
          <NumericField
            label="Abs Threshold"
            value={props.rule.absoluteThreshold ?? 0}
            onChange={(value) => props.onChange({ absoluteThreshold: value })}
          />
        ) : null}
        {props.showPercent ? (
          <NumericField
            label="% Threshold"
            value={props.rule.percentThreshold ?? 0}
            step={0.1}
            onChange={(value) => props.onChange({ percentThreshold: value })}
          />
        ) : null}
      </div>
    </div>
  );
}

function CaptionSimpleRuleEditor(props: {
  title: string;
  rule: BlockinfoPostCaptionSimpleRule;
  onChange: (patch: Partial<BlockinfoPostCaptionSimpleRule>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-fg-heading">{props.title}</div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
          <input
            type="checkbox"
            checked={props.rule.enabled}
            onChange={(event) => props.onChange({ enabled: event.target.checked })}
            className="h-4 w-4 rounded border-border-muted"
          />
          Enabled
        </label>
      </div>
      <NumericField label="Priority" value={props.rule.priority} onChange={(value) => props.onChange({ priority: value })} />
    </div>
  );
}

function DeterministicPreview(props: {
  layout: BlockinfoPostDeterministicLayout;
  captionPolicy: BlockinfoPostCaptionPolicy;
  snapshot: BlockinfoPostDeterministicSnapshot | null;
  backgroundUrl: string;
  templateVariant: BlockinfoPostTemplateVariant;
}) {
  const { snapshot } = props;
  const layout = applyBlockinfoPostTemplateTheme(props.layout, props.templateVariant);
  const theme = getBlockinfoPostTemplateTheme(props.templateVariant);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const stats = snapshot?.stats;
  const captionDecision = snapshot
    ? buildDeterministicCaptionDecision(
        snapshot,
        {
          orderField: "height",
          height: snapshot.stats.height.current != null ? Math.round(snapshot.stats.height.current) : null,
          measuredAt: snapshot.latestMeasuredAt,
          measuredDate: snapshot.latestMeasuredDate,
          bestBlockHash: null,
        },
        props.captionPolicy,
      )
    : null;
  const visibleRows = layout.table.statRows.filter((row) => row.visible);
  const columns = visibleColumns(layout);
  const dividers = columns.slice(0, -1).map((entry, index) => dividerX(entry.block, columns[index + 1]!.block));
  const tableLeft = layout.table.columns.label.x;
  const tableRight = columns[columns.length - 1]!.block.x + columns[columns.length - 1]!.block.maxWidth;
  const headerDividerY = layout.table.startY - 20;

  async function downloadPreviewPng() {
    if (!svgRef.current) return;
    setDownloadStatus(null);

    try {
      const svgNode = svgRef.current.cloneNode(true) as SVGSVGElement;
      svgNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svgNode.setAttribute("width", String(layout.width));
      svgNode.setAttribute("height", String(layout.height));

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
      canvas.width = layout.width;
      canvas.height = layout.height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(svgUrl);
        throw new Error("Canvas context unavailable.");
      }

      context.drawImage(image, 0, 0, layout.width, layout.height);
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
      const timestamp = snapshot?.latestMeasuredAt ? snapshot.latestMeasuredAt.replace(/[:]/g, "-") : "preview";
      anchor.href = downloadUrl;
      anchor.download = `blockinfo-preview-${timestamp}.png`;
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
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Deterministic Preview</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void downloadPreviewPng()}
            className="rounded-md border border-border-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-heading transition-colors hover:border-fg-heading"
          >
            Download PNG
          </button>
          {downloadStatus ? <div className="text-xs font-semibold text-fg-muted">{downloadStatus}</div> : null}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border-muted bg-[var(--color-raised)]">
        <svg ref={svgRef} viewBox={`0 0 ${layout.width} ${layout.height}`} className="block aspect-square w-full" style={{ background: theme.canvasColor }}>
          <defs>
            <linearGradient id="blockinfoTitleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.titleGradient[0]} />
              <stop offset="42%" stopColor={theme.titleGradient[1]} />
              <stop offset="100%" stopColor={theme.titleGradient[2]} />
            </linearGradient>
          </defs>
          <image href={props.backgroundUrl} x="0" y="0" width={layout.width} height={layout.height} preserveAspectRatio="xMidYMid slice" />

          <SvgBlock block={layout.header.eyebrow} text={"$ ZCASH-CLI GETBLOCKCHAININFO"} keyValue="eyebrow" />
          <text
            x={layout.header.title.x}
            y={layout.header.title.y}
            fill="url(#blockinfoTitleGradient)"
            fontSize={layout.header.title.fontSize}
            fontWeight={layout.header.title.fontWeight}
            letterSpacing={layout.header.title.letterSpacing}
            textAnchor="start"
            fontFamily={DETERMINISTIC_FONT_FAMILY}
            dominantBaseline="hanging"
          >
            {snapshot?.stats.height.current != null
              ? `Block ${Math.round(snapshot.stats.height.current).toLocaleString("en-US")}`
              : "Latest Block"}
          </text>
          <SvgBlock
            block={layout.header.subtitle}
            text={layout.header.subtitle.visible ? previewSubtitleText() : ""}
            keyValue="subtitle"
          />

          {columns.map((entry) => (
            <SvgBlock
              key={`header-${entry.key}`}
              block={{
                ...entry.block,
                y: layout.table.headerY,
                fontWeight: 800,
                fontSize: layout.table.columns.label.fontSize,
              }}
              text={entry.label}
              keyValue={`header-${entry.key}`}
            />
          ))}

          <line
            x1={tableLeft}
            x2={tableRight}
            y1={headerDividerY}
            y2={headerDividerY}
            stroke={theme.gridColor}
            strokeWidth={GRID_HORIZONTAL_THICKNESS}
          />

          {dividers.map((x, index) => (
            <line
              key={`divider-${index}`}
              x1={x}
              x2={x}
              y1={layout.table.headerY - 8}
              y2={layout.table.startY + visibleRows.length * layout.table.rowHeight - 18}
              stroke={theme.gridColor}
              strokeWidth={GRID_VERTICAL_THICKNESS}
            />
          ))}

          {visibleRows.map((_, index) => {
            const y = layout.table.startY + (index + 1) * layout.table.rowHeight - 18;
            return (
              <line
                key={`rowline-${index}`}
                x1={tableLeft}
                x2={tableRight}
                y1={y}
                y2={y}
                stroke={theme.gridColor}
                strokeWidth={GRID_HORIZONTAL_THICKNESS}
              />
            );
          })}

          {visibleRows.map((row, index) => {
            const stat = stats?.[row.key];
            const y = layout.table.startY + index * layout.table.rowHeight;
            return (
              <g key={row.key}>
                {columns.map((entry) => {
                  const text =
                    entry.key === "label"
                      ? row.label
                      : entry.key === "current"
                        ? stat?.formattedCurrent ?? "N/A"
                        : entry.key === "delta1d"
                          ? stat?.deltas["1d"].formatted ?? "N/A"
                          : entry.key === "delta7d"
                            ? stat?.deltas["7d"].formatted ?? "N/A"
                            : stat?.deltas["30d"].formatted ?? "N/A";
                  return <SvgBlock key={`${row.key}-${entry.key}`} block={{ ...entry.block, y }} text={text} keyValue={`${row.key}-${entry.key}`} />;
                })}
              </g>
            );
          })}

          <SvgBlock block={layout.footer} text={previewFooterText(snapshot)} keyValue="footer" />
        </svg>
      </div>
      <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Caption Preview</div>
        <div className="text-sm font-semibold text-fg-heading">{captionDecision?.text ?? "No snapshot available."}</div>
        <div className="text-xs text-fg-muted">
          Active rule: <span className="font-semibold text-fg-heading">{captionDecision?.ruleId ?? "N/A"}</span>
        </div>
        <div className="text-xs text-fg-muted">
          Config: <span className="font-semibold text-fg-heading">{captionDecision?.configSummary ?? "N/A"}</span>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: BlockinfoPostResult | null }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-border-muted bg-[var(--color-card)] p-5 text-sm text-fg-muted">
        Run or dry-run the workflow to inspect the latest `zebra_stats` row, rendered prompt, render mode, delivery result, and schedule state.
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
        {result.renderMode ? (
          <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold text-fg-body">
            {renderModeLabel(result.renderMode)}
          </div>
        ) : null}
        {result.providerModel ? (
          <div className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold text-fg-body">
            {result.providerModel}
          </div>
        ) : null}
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

      {result.selectedRowSummary ? (
        <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Row</div>
            <div className="mt-2">Order field: <span className="font-semibold text-fg-heading">{result.selectedRowSummary.orderField}</span></div>
            <div>Height: <span className="font-semibold text-fg-heading">{result.selectedRowSummary.height ?? "N/A"}</span></div>
            <div>Measured at: <span className="font-semibold text-fg-heading">{result.selectedRowSummary.measuredAt ?? "N/A"}</span></div>
            <div>Measured date: <span className="font-semibold text-fg-heading">{result.selectedRowSummary.measuredDate ?? "N/A"}</span></div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Freshness</div>
            <div className="mt-2">Status: <span className="font-semibold text-fg-heading">{result.dataFreshness?.ok ? "Fresh" : "Stale"}</span></div>
            <div>Source field: <span className="font-semibold text-fg-heading">{result.dataFreshness?.sourceField ?? "N/A"}</span></div>
            <div>Source timestamp: <span className="font-semibold text-fg-heading">{result.dataFreshness?.sourceTimestamp ?? "N/A"}</span></div>
            <div>Age hours: <span className="font-semibold text-fg-heading">{result.dataFreshness?.ageHours != null ? result.dataFreshness.ageHours.toFixed(1) : "N/A"}</span></div>
            <div>Max age hours: <span className="font-semibold text-fg-heading">{result.dataFreshness?.maxAgeHours ?? "N/A"}</span></div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Files</div>
            <div className="mt-2 break-all">Prompt template: <span className="font-semibold text-fg-heading">{result.promptTemplatePath ?? "N/A"}</span></div>
            <div className="break-all">OpenAI image template: <span className="font-semibold text-fg-heading">{result.imageTemplatePath ?? "N/A"}</span></div>
            <div className="break-all">Deterministic background: <span className="font-semibold text-fg-heading">{result.deterministicBackgroundPath ?? "N/A"}</span></div>
            <div className="break-all">Deterministic layout: <span className="font-semibold text-fg-heading">{result.deterministicLayoutPath ?? "N/A"}</span></div>
            <div className="break-all">Planned local output: <span className="font-semibold text-fg-heading">{result.intendedLocalFilePath ?? "N/A"}</span></div>
            <div className="break-all">Planned storage path: <span className="font-semibold text-fg-heading">{result.intendedStorageObjectPath ?? "N/A"}</span></div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Delivery</div>
        <div className="break-all">Local file: <span className="font-semibold text-fg-heading">{result.localFilePath ?? "Not written"}</span></div>
        <div className="break-all">Storage object: <span className="font-semibold text-fg-heading">{result.storageObjectPath ?? "Not uploaded"}</span></div>
        <div className="grid gap-2 rounded-lg border border-border-muted bg-[var(--color-card)] p-3">
          <div>
            Telegram:{" "}
            <span className="font-semibold text-fg-heading">
              {result.delivery?.telegram.attempted
                ? result.delivery.telegram.ok
                  ? `Sent (${result.delivery.telegram.telegramMessageId ?? "no id"})`
                  : `Failed${result.delivery.telegram.error ? ` - ${result.delivery.telegram.error}` : ""}`
                : "Not requested"}
            </span>
          </div>
          <div>
            X:{" "}
            <span className="font-semibold text-fg-heading">
              {result.delivery?.x.attempted
                ? result.delivery.x.ok
                  ? `Posted (${result.delivery.x.xPostId ?? "no id"})`
                  : `Failed${result.delivery.x.error ? ` - ${result.delivery.x.error}` : ""}`
                : "Not requested"}
            </span>
          </div>
        </div>
      </div>

      {result.deterministicSnapshot ? (
        <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Deterministic Snapshot</div>
          <div>Generated at: <span className="font-semibold text-fg-heading">{result.deterministicSnapshot.generatedAtIso}</span></div>
          <div>Latest measured at: <span className="font-semibold text-fg-heading">{result.deterministicSnapshot.latestMeasuredAt ?? "N/A"}</span></div>
          <div>Stats included: <span className="font-semibold text-fg-heading">{result.deterministicSnapshot.statOrder.length}</span></div>
        </div>
      ) : null}

      {result.schedule ? (
        <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Schedule State</div>
          <div>Enabled: <span className="font-semibold text-fg-heading">{result.schedule.enabled ? "Yes" : "No"}</span></div>
          <div>Destination: <span className="font-semibold text-fg-heading">{destinationLabel(result.schedule.destination)}</span></div>
          <div>Render mode: <span className="font-semibold text-fg-heading">{renderModeLabel(result.schedule.renderMode)}</span></div>
          <div>Schedule mode: <span className="font-semibold text-fg-heading">{scheduleModeLabel(result.schedule.scheduleMode)}</span></div>
          <div>Interval hours: <span className="font-semibold text-fg-heading">{result.schedule.intervalHours}</span></div>
          <div>Daily time: <span className="font-semibold text-fg-heading">{toTimeInputValue(result.schedule.dailyHour, result.schedule.dailyMinute)} {result.schedule.dailyTimezone}</span></div>
          <div>Last run started: <span className="font-semibold text-fg-heading">{result.schedule.lastRunStartedAt ?? "N/A"}</span></div>
          <div>Last run completed: <span className="font-semibold text-fg-heading">{result.schedule.lastRunCompletedAt ?? "N/A"}</span></div>
          <div>Last run status: <span className="font-semibold text-fg-heading">{result.schedule.lastRunStatus ?? "N/A"}</span></div>
          <div>Last error: <span className="font-semibold text-fg-heading">{result.schedule.lastError ?? "N/A"}</span></div>
        </div>
      ) : null}

      {result.postText ? (
        <div className="grid gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Post Text</div>
          <pre className="max-h-40 overflow-auto rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-xs leading-6 text-fg-body whitespace-pre-wrap">
            {result.postText}
          </pre>
        </div>
      ) : null}

      {result.renderedPrompt ? (
        <div className="grid gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Rendered Prompt</div>
          <pre className="max-h-[28rem] overflow-auto rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-xs leading-6 text-fg-body whitespace-pre-wrap">
            {result.renderedPrompt}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export default function BlockinfoPostTool(props: {
  initialSchedule: BlockinfoPostScheduleState;
  initialLayout: BlockinfoPostDeterministicLayout;
  initialCaptionPolicy: BlockinfoPostCaptionPolicy;
  initialSnapshot: BlockinfoPostDeterministicSnapshot | null;
  initialTemplateVariant: BlockinfoPostTemplateVariant;
  deterministicBackgroundPath: string;
  deterministicLayoutPath: string;
  deterministicCaptionPolicyPath: string;
  hostedFilesystemReadonly: boolean;
}) {
  const [result, setResult] = useState<BlockinfoPostResult | null>(null);
  const [destination, setDestination] = useState<BlockinfoPostDestination>(props.initialSchedule.destination);
  const [renderMode, setRenderMode] = useState<BlockinfoPostRenderMode>(props.initialSchedule.renderMode);
  const [schedule, setSchedule] = useState<BlockinfoPostScheduleState>(props.initialSchedule);
  const [intervalInput, setIntervalInput] = useState(String(props.initialSchedule.intervalHours));
  const [dailyTimeInput, setDailyTimeInput] = useState(toTimeInputValue(props.initialSchedule.dailyHour, props.initialSchedule.dailyMinute));
  const [status, setStatus] = useState<string | null>(null);
  const [layoutStatus, setLayoutStatus] = useState<string | null>(null);
  const [captionPolicyStatus, setCaptionPolicyStatus] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [layout, setLayout] = useState<BlockinfoPostDeterministicLayout>(props.initialLayout);
  const [captionPolicy, setCaptionPolicy] = useState<BlockinfoPostCaptionPolicy>(props.initialCaptionPolicy ?? getDefaultBlockinfoPostCaptionPolicy());
  const [snapshot, setSnapshot] = useState<BlockinfoPostDeterministicSnapshot | null>(props.initialSnapshot);
  const [templateVariant, setTemplateVariant] = useState<BlockinfoPostTemplateVariant>(props.initialTemplateVariant);
  const [expandedSection, setExpandedSection] = useState<string>("header.eyebrow");
  const [isPending, startTransition] = useTransition();

  const editorSections: EditorSection[] = [
    {
      id: "header.eyebrow",
      title: "Eyebrow",
      block: layout.header.eyebrow,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "header.eyebrow", patch)),
    },
    {
      id: "header.title",
      title: "Title",
      block: layout.header.title,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "header.title", patch)),
    },
    {
      id: "header.subtitle",
      title: "Subtitle",
      block: layout.header.subtitle,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "header.subtitle", patch)),
    },
    {
      id: "table.note",
      title: "Measured Note",
      block: layout.table.note,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "table.note", patch)),
    },
    {
      id: "table.columns.label",
      title: "Label Column",
      block: layout.table.columns.label,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "table.columns.label", patch)),
    },
    {
      id: "table.columns.current",
      title: "Current Column",
      block: layout.table.columns.current,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "table.columns.current", patch)),
    },
    {
      id: "table.columns.delta1d",
      title: "1D Delta Column",
      block: layout.table.columns.delta1d,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "table.columns.delta1d", patch)),
    },
    {
      id: "table.columns.delta7d",
      title: "7D Delta Column",
      block: layout.table.columns.delta7d,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "table.columns.delta7d", patch)),
    },
    {
      id: "table.columns.delta30d",
      title: "30D Delta Column",
      block: layout.table.columns.delta30d,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "table.columns.delta30d", patch)),
    },
    {
      id: "footer",
      title: "Footer",
      block: layout.footer,
      onChange: (patch) => setLayout((current) => updateTextBlock(current, "footer", patch)),
    },
  ];

  const orderedEditorSections = [
    ...editorSections.filter((section) => section.id === expandedSection),
    ...editorSections.filter((section) => section.id !== expandedSection),
  ];

  function trigger(mode: "run" | "dry-run") {
    startTransition(async () => {
      setPendingLabel(`${mode}-${destination}-${renderMode}`);
      const nextResult = mode === "run"
        ? await runBlockinfoPostAction(destination, renderMode)
        : await dryRunBlockinfoPostAction(destination, renderMode);
      setResult(nextResult);
      if (nextResult.schedule) {
        setSchedule(nextResult.schedule);
        setIntervalInput(String(nextResult.schedule.intervalHours));
        setDailyTimeInput(toTimeInputValue(nextResult.schedule.dailyHour, nextResult.schedule.dailyMinute));
      }
      if (nextResult.deterministicSnapshot) {
        setSnapshot(nextResult.deterministicSnapshot);
      }
      setPendingLabel(null);
    });
  }

  function saveSchedule() {
    startTransition(async () => {
      setStatus(null);
      const intervalHours = Number(intervalInput);
      const parsedDailyTime = fromTimeInputValue(dailyTimeInput);
      if (!parsedDailyTime) {
        setStatus("Daily time must be a valid HH:MM value.");
        return;
      }
      const response = await saveBlockinfoPostScheduleAction({
        enabled: schedule.enabled,
        destination: schedule.destination,
        renderMode: schedule.renderMode,
        scheduleMode: schedule.scheduleMode,
        intervalHours,
        dailyHour: parsedDailyTime.hour,
        dailyMinute: parsedDailyTime.minute,
        dailyTimezone: schedule.dailyTimezone,
      });

      if (!response.ok) {
        setStatus(response.error);
        return;
      }

      setSchedule(response.schedule);
      setIntervalInput(String(response.schedule.intervalHours));
      setDailyTimeInput(toTimeInputValue(response.schedule.dailyHour, response.schedule.dailyMinute));
      setStatus("Schedule saved.");
    });
  }

  function saveLayout() {
    startTransition(async () => {
      setLayoutStatus(null);
      const response = await saveDeterministicLayoutAction(layout);
      setLayoutStatus(response.ok ? "Deterministic layout saved." : response.error);
    });
  }

  function saveCaptionPolicy() {
    startTransition(async () => {
      setCaptionPolicyStatus(null);
      const response = await saveDeterministicCaptionPolicyAction(captionPolicy);
      setCaptionPolicyStatus(response.ok ? "Deterministic caption policy saved." : response.error);
    });
  }

  const backgroundPreviewUrl = `/api/blockinfo-post/background?variant=${templateVariant}`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Internal Tool</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-fg-heading">Blockinfo Post</h1>
            <p className="mt-3 text-sm leading-6 text-fg-body">
              Fetch the newest <code>public.zebra_stats</code> row, render either the OpenAI prompt pipeline or the deterministic template renderer,
              then save, upload, and post the result to Telegram, X, or both.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-semibold text-fg-heading">
              Destination
              <select
                value={destination}
                onChange={(event) => setDestination(event.target.value as BlockinfoPostDestination)}
                disabled={isPending}
                className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
              >
                {BLOCKINFO_POST_DESTINATIONS.map((value) => (
                  <option key={value} value={value}>
                    {destinationLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-fg-heading">
              Render mode
              <select
                value={renderMode}
                onChange={(event) => setRenderMode(event.target.value as BlockinfoPostRenderMode)}
                disabled={isPending}
                className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
              >
                {BLOCKINFO_POST_RENDER_MODES.map((value) => (
                  <option key={value} value={value}>
                    {renderModeLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => trigger("dry-run")}
                disabled={isPending}
                className="rounded-md border border-border-muted px-4 py-3 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingLabel === `dry-run-${destination}-${renderMode}` ? "Running dry run..." : "Dry run"}
              </button>
              <button
                type="button"
                onClick={() => trigger("run")}
                disabled={isPending}
                className="rounded-md bg-fg-heading px-4 py-3 text-sm font-semibold text-[var(--color-background)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingLabel === `run-${destination}-${renderMode}`
                  ? "Running..."
                  : `Run ${destinationLabel(destination)} (${renderModeLabel(renderMode)})`}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Schedule</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-fg-heading">Recurring Post Settings</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fg-body">
            The deployed cron checks every 5 minutes. This panel controls whether scheduled posts are enabled, which destination they use,
            which render mode they use, and whether they run on an interval or once per day at a fixed time.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <label className="flex items-center gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] px-4 py-4 text-sm font-semibold text-fg-heading">
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(event) => setSchedule((current) => ({ ...current, enabled: event.target.checked }))}
              className="h-4 w-4 rounded border-border-muted"
            />
            Enable scheduled posting
          </label>

          <label className="grid gap-2 text-sm font-semibold text-fg-heading">
            Scheduled destination
            <select
              value={schedule.destination}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  destination: event.target.value as BlockinfoPostDestination,
                }))}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            >
              {BLOCKINFO_POST_DESTINATIONS.map((value) => (
                <option key={value} value={value}>
                  {destinationLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-fg-heading">
            Scheduled render mode
            <select
              value={schedule.renderMode}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  renderMode: event.target.value as BlockinfoPostRenderMode,
                }))}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            >
              {BLOCKINFO_POST_RENDER_MODES.map((value) => (
                <option key={value} value={value}>
                  {renderModeLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-fg-heading">
            Schedule mode
            <select
              value={schedule.scheduleMode}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  scheduleMode: event.target.value as BlockinfoPostScheduleState["scheduleMode"],
                }))}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            >
              <option value="interval">Interval</option>
              <option value="daily_time">Daily time</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-fg-heading">
            Interval hours
            <input
              type="number"
              min={1}
              step={1}
              value={intervalInput}
              onChange={(event) => setIntervalInput(event.target.value)}
              disabled={schedule.scheduleMode !== "interval"}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-fg-heading">
            Daily time
            <input
              type="time"
              step={60}
              value={dailyTimeInput}
              onChange={(event) => {
                setDailyTimeInput(event.target.value);
                const parsed = fromTimeInputValue(event.target.value);
                if (!parsed) return;
                setSchedule((current) => ({
                  ...current,
                  dailyHour: parsed.hour,
                  dailyMinute: parsed.minute,
                }));
              }}
              disabled={schedule.scheduleMode !== "daily_time"}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-fg-heading">
            Daily timezone
            <input
              type="text"
              value={schedule.dailyTimezone}
              onChange={(event) =>
                setSchedule((current) => ({
                  ...current,
                  dailyTimezone: event.target.value,
                }))}
              disabled={schedule.scheduleMode !== "daily_time"}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            />
          </label>
        </div>

        {schedule.scheduleMode === "daily_time" ? (
          <p className="text-sm text-fg-body">
            Current daily target: <span className="font-semibold text-fg-heading">{dailyTimeInput} {schedule.dailyTimezone}</span>.
            For your requested schedule, use <span className="font-semibold text-fg-heading">{toTimeInputValue(DEFAULT_BLOCKINFO_POST_SCHEDULE.dailyHour, DEFAULT_BLOCKINFO_POST_SCHEDULE.dailyMinute)} {DEFAULT_BLOCKINFO_POST_SCHEDULE.dailyTimezone}</span>.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveSchedule}
            disabled={isPending}
            className="rounded-md border border-border-muted px-4 py-3 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save schedule
          </button>
          {status ? <p className="text-sm font-semibold text-fg-body">{status}</p> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Deterministic Layout</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-fg-heading">Template Editor</h2>
            <p className="mt-2 text-sm leading-6 text-fg-body">
              Adjust the checked-in layout JSON using live zebra_stats data, then lock it in for future manual and scheduled deterministic posts.
            </p>
          </div>

          {props.hostedFilesystemReadonly ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm font-semibold text-amber-100">
              Hosted config editing is read-only. Keep layout and caption-policy JSON checked into git locally, then redeploy to update the hosted runtime.
            </div>
          ) : null}

          <div className="grid gap-2 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4 text-sm text-fg-body">
            <div>Active renderer theme: <span className="font-semibold text-fg-heading">{props.initialTemplateVariant}</span></div>
            <div className="break-all">Background template: <span className="font-semibold text-fg-heading">{props.deterministicBackgroundPath}</span></div>
            <div className="break-all">Layout config: <span className="font-semibold text-fg-heading">{props.deterministicLayoutPath}</span></div>
            <div className="break-all">Caption policy: <span className="font-semibold text-fg-heading">{props.deterministicCaptionPolicyPath}</span></div>
            <div>Preview source row: <span className="font-semibold text-fg-heading">{snapshot?.latestMeasuredAt ?? "Unavailable"}</span></div>
          </div>

          <div className="grid gap-2 text-sm font-semibold text-fg-heading">
            <span>Preview template</span>
            <div role="group" aria-label="Preview template" className="grid w-full grid-cols-2 rounded-lg border border-border-muted bg-[var(--color-raised)] p-1">
              {BLOCKINFO_POST_TEMPLATE_VARIANTS.map((variant) => {
                const active = templateVariant === variant;
                const label = variant === "original" ? "Original" : "Light";
                const description = variant === "original" ? "Lime on dark" : "Black on ivory";
                return (
                  <button
                    key={variant}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTemplateVariant(variant)}
                    className={`rounded-md px-3 py-2 text-left transition-colors ${active ? "bg-fg-heading text-[var(--color-background)]" : "text-fg-heading hover:bg-[var(--color-card)]"}`}
                  >
                    <span className="block text-sm font-bold">{label}</span>
                    <span className={`block text-xs font-medium ${active ? "text-[var(--color-background)]/75" : "text-fg-muted"}`}>{description}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-medium text-fg-muted">Original is the active renderer default. This control only changes the preview; selecting Light does not change posts.</span>
          </div>

          <DeterministicPreview layout={layout} captionPolicy={captionPolicy} snapshot={snapshot} backgroundUrl={backgroundPreviewUrl} templateVariant={templateVariant} />

          <div className="grid gap-3 md:grid-cols-3">
            <NumericField
              label="Header Y"
              value={layout.table.headerY}
              onChange={(value) => setLayout((current) => ({ ...current, table: { ...current.table, headerY: value } }))}
            />
            <NumericField
              label="Table Start Y"
              value={layout.table.startY}
              onChange={(value) => setLayout((current) => ({ ...current, table: { ...current.table, startY: value } }))}
            />
            <NumericField
              label="Row Height"
              value={layout.table.rowHeight}
              onChange={(value) => setLayout((current) => ({ ...current, table: { ...current.table, rowHeight: value } }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <NumericField
              label="Primary Table Font"
              value={layout.table.columns.label.fontSize}
              onChange={(value) =>
                setLayout((current) => ({
                  ...current,
                  table: {
                    ...current.table,
                    columns: {
                      ...current.table.columns,
                      label: { ...current.table.columns.label, fontSize: value },
                      current: { ...current.table.columns.current, fontSize: value },
                    },
                  },
                }))
              }
            />
            <NumericField
              label="Delta Table Font"
              value={layout.table.columns.delta1d.fontSize}
              onChange={(value) =>
                setLayout((current) => ({
                  ...current,
                  table: {
                    ...current.table,
                    columns: {
                      ...current.table.columns,
                      delta1d: { ...current.table.columns.delta1d, fontSize: value },
                      delta7d: { ...current.table.columns.delta7d, fontSize: value },
                      delta30d: { ...current.table.columns.delta30d, fontSize: value },
                    },
                  },
                }))
              }
            />
          </div>

          {orderedEditorSections.map((section) => (
            <TextBlockEditor
              key={section.id}
              title={section.title}
              block={section.block}
              expanded={expandedSection === section.id}
              onToggle={() => setExpandedSection((current) => (current === section.id ? "" : section.id))}
              onChange={section.onChange}
            />
          ))}

          <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
            <div className="text-sm font-bold text-fg-heading">Stat Rows</div>
            <div className="grid gap-3">
              {layout.table.statRows.map((row, index) => (
                <div key={row.key} className="grid gap-3 rounded-lg border border-border-muted bg-[var(--color-card)] p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    <input
                      type="checkbox"
                      checked={row.visible}
                      onChange={(event) =>
                        setLayout((current) => ({
                          ...current,
                          table: {
                            ...current.table,
                            statRows: current.table.statRows.map((candidate, candidateIndex) =>
                              candidateIndex === index ? { ...candidate, visible: event.target.checked } : candidate,
                            ),
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-border-muted"
                    />
                    Show
                  </label>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(event) =>
                      setLayout((current) => ({
                        ...current,
                        table: {
                          ...current.table,
                          statRows: current.table.statRows.map((candidate, candidateIndex) =>
                            candidateIndex === index ? { ...candidate, label: event.target.value } : candidate,
                          ),
                        },
                      }))
                    }
                    className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                  />
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">{row.key}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveLayout}
              disabled={isPending || props.hostedFilesystemReadonly}
              className="rounded-md border border-border-muted px-4 py-3 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lock in layout JSON
            </button>
            {layoutStatus ? <p className="text-sm font-semibold text-fg-body">{layoutStatus}</p> : null}
          </div>

          <div className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Caption Policy</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-fg-heading">Deterministic Post Policy</h3>
              <p className="mt-2 text-sm leading-6 text-fg-body">
                Edit the checked-in caption thresholds and priorities. The previewed caption and deterministic Telegram/X runs share this same policy.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-fg-heading">Sprout Any Change</div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    <input
                      type="checkbox"
                      checked={captionPolicy.sproutAnyChange.enabled}
                      onChange={(event) =>
                        setCaptionPolicy((current) => ({
                          ...current,
                          sproutAnyChange: { ...current.sproutAnyChange, enabled: event.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border-muted"
                    />
                    Enabled
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <NumericField
                    label="Priority"
                    value={captionPolicy.sproutAnyChange.priority}
                    onChange={(value) =>
                      setCaptionPolicy((current) => ({
                        ...current,
                        sproutAnyChange: { ...current.sproutAnyChange, priority: value },
                      }))
                    }
                  />
                  <NumericField
                    label="Min Abs Change"
                    value={captionPolicy.sproutAnyChange.minAbsoluteChange}
                    step={0.01}
                    onChange={(value) =>
                      setCaptionPolicy((current) => ({
                        ...current,
                        sproutAnyChange: { ...current.sproutAnyChange, minAbsoluteChange: value },
                      }))
                    }
                  />
                </div>
              </div>

              <CaptionSimpleRuleEditor
                title="Orchard 30-day Max"
                rule={captionPolicy.orchard30dMax}
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, orchard30dMax: { ...current.orchard30dMax, ...patch } }))}
              />
              <CaptionSimpleRuleEditor
                title="Total Shielded 30-day Max"
                rule={captionPolicy.totalShielded30dMax}
                onChange={(patch) =>
                  setCaptionPolicy((current) => ({ ...current, totalShielded30dMax: { ...current.totalShielded30dMax, ...patch } }))
                }
              />
              <CaptionSimpleRuleEditor
                title="Transparent 30-day Max"
                rule={captionPolicy.transparent30dMax}
                onChange={(patch) =>
                  setCaptionPolicy((current) => ({ ...current, transparent30dMax: { ...current.transparent30dMax, ...patch } }))
                }
              />
              <CaptionSimpleRuleEditor
                title="Difficulty 30-day Max"
                rule={captionPolicy.difficulty30dMax}
                onChange={(patch) =>
                  setCaptionPolicy((current) => ({ ...current, difficulty30dMax: { ...current.difficulty30dMax, ...patch } }))
                }
              />
              <CaptionThresholdRuleEditor
                title="Orchard 1-day"
                rule={captionPolicy.orchardDaily}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, orchardDaily: { ...current.orchardDaily, ...patch } }))}
              />
              <CaptionThresholdRuleEditor
                title="Ironwood 1-day"
                rule={captionPolicy.ironwoodDaily}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, ironwoodDaily: { ...current.ironwoodDaily, ...patch } }))}
              />
              <CaptionThresholdRuleEditor
                title="Total Shielded 1-day"
                rule={captionPolicy.totalShieldedDaily}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, totalShieldedDaily: { ...current.totalShieldedDaily, ...patch } }))}
              />
              <CaptionThresholdRuleEditor
                title="Transparent 1-day"
                rule={captionPolicy.transparentDaily}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, transparentDaily: { ...current.transparentDaily, ...patch } }))}
              />
              <CaptionThresholdRuleEditor
                title="Orchard 7-day"
                rule={captionPolicy.orchardWeekly}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, orchardWeekly: { ...current.orchardWeekly, ...patch } }))}
              />
              <CaptionThresholdRuleEditor
                title="Ironwood 7-day"
                rule={captionPolicy.ironwoodWeekly}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, ironwoodWeekly: { ...current.ironwoodWeekly, ...patch } }))}
              />
              <CaptionThresholdRuleEditor
                title="Total Shielded 7-day"
                rule={captionPolicy.totalShieldedWeekly}
                showAbsolute
                showPercent
                onChange={(patch) => setCaptionPolicy((current) => ({ ...current, totalShieldedWeekly: { ...current.totalShieldedWeekly, ...patch } }))}
              />
              <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-fg-heading">Block Fallback</div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    <input
                      type="checkbox"
                      checked={captionPolicy.blockDailyFallback.enabled}
                      onChange={(event) =>
                        setCaptionPolicy((current) => ({
                          ...current,
                          blockDailyFallback: { ...current.blockDailyFallback, enabled: event.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border-muted"
                    />
                    Enabled
                  </label>
                </div>
                <NumericField
                  label="Priority"
                  value={captionPolicy.blockDailyFallback.priority}
                  onChange={(value) =>
                    setCaptionPolicy((current) => ({
                      ...current,
                      blockDailyFallback: { ...current.blockDailyFallback, priority: value },
                    }))
                  }
                />
              </div>
              <div className="grid gap-3 rounded-xl border border-border-muted bg-[var(--color-raised)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-fg-heading">Latest Snapshot Fallback</div>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    <input
                      type="checkbox"
                      checked={captionPolicy.latestSnapshotFallback.enabled}
                      onChange={(event) =>
                        setCaptionPolicy((current) => ({
                          ...current,
                          latestSnapshotFallback: { ...current.latestSnapshotFallback, enabled: event.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border-muted"
                    />
                    Enabled
                  </label>
                </div>
                <NumericField
                  label="Priority"
                  value={captionPolicy.latestSnapshotFallback.priority}
                  onChange={(value) =>
                    setCaptionPolicy((current) => ({
                      ...current,
                      latestSnapshotFallback: { ...current.latestSnapshotFallback, priority: value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveCaptionPolicy}
                disabled={isPending || props.hostedFilesystemReadonly}
                className="rounded-md border border-border-muted px-4 py-3 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lock in caption policy JSON
              </button>
              {captionPolicyStatus ? <p className="text-sm font-semibold text-fg-body">{captionPolicyStatus}</p> : null}
            </div>
          </div>
        </div>

        <ResultPanel result={result} />
      </section>
    </div>
  );
}
