export const BLOCKINFO_POST_DESTINATIONS = ["telegram", "x", "both"] as const;
export const BLOCKINFO_POST_RENDER_MODES = ["openai", "deterministic"] as const;
export const BLOCKINFO_POST_DELTA_WINDOWS = ["1d", "7d", "30d"] as const;
export const BLOCKINFO_POST_STAT_KEYS = [
  "height",
  "verification_progress",
  "chain_size_bytes",
  "difficulty",
  "transparent",
  "sprout",
  "sapling",
  "orchard",
  "ironwood",
  "lockbox",
  "total_shielded",
] as const;

export type BlockinfoPostMode = "run" | "dry-run";
export type BlockinfoPostDestination = (typeof BLOCKINFO_POST_DESTINATIONS)[number];
export type BlockinfoPostChannel = "telegram" | "x";
export type BlockinfoPostRenderMode = (typeof BLOCKINFO_POST_RENDER_MODES)[number];
export type BlockinfoPostDeltaWindowKey = (typeof BLOCKINFO_POST_DELTA_WINDOWS)[number];
export type BlockinfoPostStatKey = (typeof BLOCKINFO_POST_STAT_KEYS)[number];

export type BlockinfoPostRowSummary = {
  orderField: "height" | "measured_at" | "measured_date";
  height: number | null;
  measuredAt: string | null;
  measuredDate: string | null;
  bestBlockHash: string | null;
};

export type BlockinfoPostDataFreshness = {
  ok: boolean;
  sourceField: "measured_at" | "measured_date" | null;
  sourceTimestamp: string | null;
  maxAgeHours: number;
  ageHours: number | null;
};

export type BlockinfoPostDeliveryResult = {
  attempted: boolean;
  ok: boolean;
  error: string | null;
  telegramMessageId?: number | null;
  xPostId?: string | null;
};

export type BlockinfoPostDeltaValue = {
  window: BlockinfoPostDeltaWindowKey;
  measuredAt: string | null;
  absolute: number | null;
  percent: number | null;
  formatted: string;
};

export type BlockinfoPostStatSnapshot = {
  key: BlockinfoPostStatKey;
  label: string;
  current: number | null;
  formattedCurrent: string;
  max30d: {
    value: number | null;
    measuredAt: string | null;
    isCurrent: boolean;
  };
  deltas: Record<BlockinfoPostDeltaWindowKey, BlockinfoPostDeltaValue>;
};

export type BlockinfoPostDeterministicSnapshot = {
  generatedAtIso: string;
  latestMeasuredAt: string | null;
  latestMeasuredDate: string | null;
  stats: Record<BlockinfoPostStatKey, BlockinfoPostStatSnapshot>;
  statOrder: BlockinfoPostStatKey[];
};

export type BlockinfoPostCaptionThresholdRule = {
  enabled: boolean;
  priority: number;
  absoluteThreshold?: number;
  percentThreshold?: number;
};

export type BlockinfoPostCaptionSimpleRule = {
  enabled: boolean;
  priority: number;
};

export type BlockinfoPostSproutCaptionRule = {
  enabled: boolean;
  priority: number;
  minAbsoluteChange: number;
};

export type BlockinfoPostCaptionPolicy = {
  sproutAnyChange: BlockinfoPostSproutCaptionRule;
  orchard30dMax: BlockinfoPostCaptionSimpleRule;
  totalShielded30dMax: BlockinfoPostCaptionSimpleRule;
  transparent30dMax: BlockinfoPostCaptionSimpleRule;
  difficulty30dMax: BlockinfoPostCaptionSimpleRule;
  orchardDaily: BlockinfoPostCaptionThresholdRule;
  ironwoodDaily: BlockinfoPostCaptionThresholdRule;
  totalShieldedDaily: BlockinfoPostCaptionThresholdRule;
  transparentDaily: BlockinfoPostCaptionThresholdRule;
  orchardWeekly: BlockinfoPostCaptionThresholdRule;
  ironwoodWeekly: BlockinfoPostCaptionThresholdRule;
  totalShieldedWeekly: BlockinfoPostCaptionThresholdRule;
  blockDailyFallback: BlockinfoPostCaptionSimpleRule;
  latestSnapshotFallback: BlockinfoPostCaptionSimpleRule;
};

export type BlockinfoPostCaptionRuleId =
  | keyof BlockinfoPostCaptionPolicy
  | "orchardIronwoodDailyCombined"
  | "orchardIronwoodWeeklyCombined";

export type BlockinfoPostCaptionDecision = {
  ruleId: BlockinfoPostCaptionRuleId;
  text: string;
  priority: number;
  configSummary: string;
};

export type BlockinfoPostLayoutTextAlign = "left" | "center" | "right";

export type BlockinfoPostLayoutTextBlock = {
  visible: boolean;
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: BlockinfoPostLayoutTextAlign;
  color: string;
  opacity: number;
};

export type BlockinfoPostLayoutColumn = BlockinfoPostLayoutTextBlock;

export type BlockinfoPostDeterministicLayout = {
  width: number;
  height: number;
  header: {
    eyebrow: BlockinfoPostLayoutTextBlock;
    title: BlockinfoPostLayoutTextBlock;
    subtitle: BlockinfoPostLayoutTextBlock;
  };
  table: {
    headerY: number;
    startY: number;
    rowHeight: number;
    note: BlockinfoPostLayoutTextBlock;
    columns: {
      label: BlockinfoPostLayoutColumn;
      current: BlockinfoPostLayoutColumn;
      delta1d: BlockinfoPostLayoutColumn;
      delta7d: BlockinfoPostLayoutColumn;
      delta30d: BlockinfoPostLayoutColumn;
    };
    statRows: Array<{
      key: BlockinfoPostStatKey;
      label: string;
      visible: boolean;
    }>;
  };
  footer: BlockinfoPostLayoutTextBlock;
};

export type BlockinfoPostScheduleState = {
  enabled: boolean;
  destination: BlockinfoPostDestination;
  renderMode: BlockinfoPostRenderMode;
  scheduleMode: "interval" | "daily_time";
  intervalHours: number;
  dailyHour: number;
  dailyMinute: number;
  dailyTimezone: string;
  lastRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunStatus: string | null;
  lastError: string | null;
  lockExpiresAt: string | null;
};

export const DEFAULT_BLOCKINFO_POST_SCHEDULE: BlockinfoPostScheduleState = {
  enabled: false,
  destination: "both",
  renderMode: "deterministic",
  scheduleMode: "daily_time",
  intervalHours: 24,
  dailyHour: 11,
  dailyMinute: 30,
  dailyTimezone: "America/New_York",
  lastRunStartedAt: null,
  lastRunCompletedAt: null,
  lastRunStatus: null,
  lastError: null,
  lockExpiresAt: null,
};

export type BlockinfoPostResult = {
  ok: boolean;
  mode: BlockinfoPostMode;
  renderMode?: BlockinfoPostRenderMode;
  providerModel?: string;
  destinationsRequested?: BlockinfoPostDestination;
  selectedRowSummary?: BlockinfoPostRowSummary;
  renderedPrompt?: string;
  postText?: string;
  promptTemplatePath?: string;
  imageTemplatePath?: string;
  deterministicBackgroundPath?: string;
  deterministicLayoutPath?: string;
  deterministicCaptionPolicyPath?: string;
  deterministicSnapshot?: BlockinfoPostDeterministicSnapshot;
  deterministicCaptionDecision?: BlockinfoPostCaptionDecision;
  intendedLocalFilePath?: string;
  intendedStorageObjectPath?: string;
  localFilePath?: string;
  storageObjectPath?: string;
  telegramMessageId?: number | null;
  xPostId?: string | null;
  delivery?: {
    telegram: BlockinfoPostDeliveryResult;
    x: BlockinfoPostDeliveryResult;
  };
  dataFreshness?: BlockinfoPostDataFreshness;
  schedule?: BlockinfoPostScheduleState;
  scheduled?: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
};

export type BlockinfoPostRunArgs = {
  mode: BlockinfoPostMode;
  destination: BlockinfoPostDestination;
  renderMode: BlockinfoPostRenderMode;
  scheduled?: boolean;
};

export type BlockinfoPostScheduleInput = {
  enabled: boolean;
  destination: BlockinfoPostDestination;
  renderMode: BlockinfoPostRenderMode;
  scheduleMode: "interval" | "daily_time";
  intervalHours: number;
  dailyHour: number;
  dailyMinute: number;
  dailyTimezone: string;
};

export function isBlockinfoPostDestination(value: string | null | undefined): value is BlockinfoPostDestination {
  return value === "telegram" || value === "x" || value === "both";
}

export function isBlockinfoPostRenderMode(value: string | null | undefined): value is BlockinfoPostRenderMode {
  return value === "openai" || value === "deterministic";
}

export function expandBlockinfoPostDestination(destination: BlockinfoPostDestination): BlockinfoPostChannel[] {
  if (destination === "both") return ["telegram", "x"];
  return [destination];
}
