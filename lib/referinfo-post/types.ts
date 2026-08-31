import type { ReferinfoPostTemplateVariant } from "@/lib/referinfo-post/template-variant";
import type { ReferinfoXThreadMode } from "@/lib/referinfo-post/x-delivery";

export const REFERINFO_POST_KINDS = [
  "summary_top10",
  "top_movers",
  "top_newcomers",
  "top_indirect",
  "leader_changes",
  "closing_note",
] as const;

export const REFERINFO_POST_DESTINATIONS = ["telegram", "x", "both"] as const;
export const REFERINFO_POST_RENDER_MODES = ["deterministic"] as const;

export type ReferinfoPostKind = (typeof REFERINFO_POST_KINDS)[number];
export type ReferinfoPostDestination = (typeof REFERINFO_POST_DESTINATIONS)[number];
export type ReferinfoPostChannel = "telegram" | "x";
export type ReferinfoPostRenderMode = (typeof REFERINFO_POST_RENDER_MODES)[number];
export type ReferinfoPostMode = "run" | "dry-run";

export type ReferinfoReportWindow = {
  timeZone: string;
  weekStartIso: string;
  weekEndIso: string;
  prevWeekStartIso: string;
  prevWeekEndIso: string;
  weekLabel: string;
  prevWeekLabel: string;
  finalDayLabel: string;
  priorDayLabel: string;
  finalDayDateKey: string;
  priorDayDateKey: string;
};

export type ReferinfoPostDeliveryResult = {
  attempted: boolean;
  ok: boolean;
  error: string | null;
  telegramMessageId?: number | null;
  xPostId?: string | null;
};

export type ReferinfoPostTableColumn = {
  key: string;
  label: string;
};

export type ReferinfoPostTableRow = {
  key: string;
  cells: string[];
};

export type ReferinfoPostTable = {
  columns: ReferinfoPostTableColumn[];
  rows: ReferinfoPostTableRow[];
  note?: string | null;
};

export type ReferinfoPostThreadMeta = {
  rootKind: ReferinfoPostKind;
  xThreadMode: ReferinfoXThreadMode;
  telegramDeliveryMode: "sequential";
};

export type ReferinfoPlannedPost = {
  kind: ReferinfoPostKind;
  order: number;
  title: string;
  subtitle: string;
  caption: string;
  configSummary: string;
  metricsSummary: string;
  localFilePath: string;
  storageObjectPath: string;
  deterministicLayoutPath: string;
  table: ReferinfoPostTable;
  delivery: {
    telegram: ReferinfoPostDeliveryResult;
    x: ReferinfoPostDeliveryResult;
  };
};

export type ReferinfoDeterministicTextAlign = "left" | "center" | "right";

export type ReferinfoDeterministicTextBlock = {
  visible: boolean;
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: ReferinfoDeterministicTextAlign;
  color: string;
  opacity: number;
};

export type ReferinfoDeterministicLayoutColumn = ReferinfoDeterministicTextBlock & {
  key: string;
};

export type ReferinfoDeterministicLayout = {
  width: number;
  height: number;
  header: {
    eyebrow: ReferinfoDeterministicTextBlock;
    title: ReferinfoDeterministicTextBlock;
    subtitle: ReferinfoDeterministicTextBlock;
  };
  table: {
    headerFontSize: number;
    headerY: number;
    startY: number;
    rowHeight: number;
    columns: ReferinfoDeterministicLayoutColumn[];
    note: ReferinfoDeterministicTextBlock;
  };
  footer: ReferinfoDeterministicTextBlock;
};

export type ReferinfoDeterministicLayoutKind = "top10" | "top5" | "top_indirect" | "leader_changes";

export type ReferinfoPostTemplateConfig = {
  eyebrow: string;
  title: string;
  subtitle: string;
  captionTemplate: string;
};

export type ReferinfoCaptionPolicy = {
  postOrder: ReferinfoPostKind[];
  rootKind: ReferinfoPostKind;
  xThreadMode: ReferinfoXThreadMode;
  telegramDeliveryMode: "sequential";
  templates: Record<ReferinfoPostKind, ReferinfoPostTemplateConfig>;
};

export type ReferinfoPostScheduleState = {
  enabled: boolean;
  destination: ReferinfoPostDestination;
  renderMode: ReferinfoPostRenderMode;
  templateVariant: ReferinfoPostTemplateVariant;
  scheduleMode: "weekly_time";
  weeklyWeekday: number;
  weeklyHour: number;
  weeklyMinute: number;
  weeklyTimezone: string;
  lastRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunStatus: string | null;
  lastError: string | null;
  lockExpiresAt: string | null;
};

export const DEFAULT_REFERINFO_POST_SCHEDULE: ReferinfoPostScheduleState = {
  enabled: false,
  destination: "both",
  renderMode: "deterministic",
  templateVariant: "original",
  scheduleMode: "weekly_time",
  weeklyWeekday: 1,
  weeklyHour: 11,
  weeklyMinute: 30,
  weeklyTimezone: "America/New_York",
  lastRunStartedAt: null,
  lastRunCompletedAt: null,
  lastRunStatus: null,
  lastError: null,
  lockExpiresAt: null,
};

export type ReferinfoPostScheduleInput = {
  enabled: boolean;
  destination: ReferinfoPostDestination;
  renderMode: ReferinfoPostRenderMode;
  templateVariant: ReferinfoPostTemplateVariant;
  scheduleMode: "weekly_time";
  weeklyWeekday: number;
  weeklyHour: number;
  weeklyMinute: number;
  weeklyTimezone: string;
};

export type ReferinfoPostResult = {
  ok: boolean;
  mode: ReferinfoPostMode;
  renderMode?: ReferinfoPostRenderMode;
  providerModel?: string;
  destinationsRequested?: ReferinfoPostDestination;
  scheduled?: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  deterministicBackgroundPath?: string;
  deterministicCaptionPolicyPath?: string;
  reportWindow?: ReferinfoReportWindow;
  thread?: ReferinfoPostThreadMeta;
  plannedPosts?: ReferinfoPlannedPost[];
  rootXPostId?: string | null;
  schedule?: ReferinfoPostScheduleState;
};

export type ReferinfoPostRunArgs = {
  mode: ReferinfoPostMode;
  destination: ReferinfoPostDestination;
  renderMode: ReferinfoPostRenderMode;
  templateVariant?: ReferinfoPostTemplateVariant;
  scheduled?: boolean;
};

export function isReferinfoPostDestination(value: string | null | undefined): value is ReferinfoPostDestination {
  return value === "telegram" || value === "x" || value === "both";
}

export function isReferinfoPostRenderMode(value: string | null | undefined): value is ReferinfoPostRenderMode {
  return value === "deterministic";
}

export function expandReferinfoPostDestination(destination: ReferinfoPostDestination): ReferinfoPostChannel[] {
  if (destination === "both") return ["telegram", "x"];
  return [destination];
}

export function isReferinfoImagePostKind(kind: ReferinfoPostKind): boolean {
  return kind !== "closing_note";
}
