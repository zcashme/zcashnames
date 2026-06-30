import type {
  BlockinfoPostDeterministicSnapshot,
  BlockinfoPostRowSummary,
  BlockinfoPostStatKey,
} from "@/lib/blockinfo-post/types";

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
  orchardDaily: BlockinfoPostCaptionThresholdRule;
  totalShieldedDaily: BlockinfoPostCaptionThresholdRule;
  transparentDaily: BlockinfoPostCaptionThresholdRule;
  difficultyDaily: BlockinfoPostCaptionThresholdRule;
  orchardWeekly: BlockinfoPostCaptionThresholdRule;
  totalShieldedWeekly: BlockinfoPostCaptionThresholdRule;
  blockDailyFallback: BlockinfoPostCaptionSimpleRule;
  latestSnapshotFallback: BlockinfoPostCaptionSimpleRule;
};

export type BlockinfoPostCaptionDecision = {
  ruleId: keyof BlockinfoPostCaptionPolicy;
  text: string;
  priority: number;
  configSummary: string;
};

function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatZecAmount(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 100) return formatWholeNumber(absolute);
  if (absolute >= 10) {
    return absolute.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }
  return absolute.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatPercentValue(value: number): string {
  return Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function getDelta(
  snapshot: BlockinfoPostDeterministicSnapshot,
  key: BlockinfoPostStatKey,
  window: "1d" | "7d",
) {
  return snapshot.stats[key].deltas[window];
}

export function getDefaultBlockinfoPostCaptionPolicy(): BlockinfoPostCaptionPolicy {
  return {
    sproutAnyChange: {
      enabled: true,
      priority: 1000,
      minAbsoluteChange: 0,
    },
    orchardDaily: {
      enabled: true,
      priority: 900,
      absoluteThreshold: 10000,
      percentThreshold: 1,
    },
    totalShieldedDaily: {
      enabled: true,
      priority: 800,
      absoluteThreshold: 25000,
      percentThreshold: 1,
    },
    transparentDaily: {
      enabled: true,
      priority: 700,
      absoluteThreshold: 10000,
      percentThreshold: 1,
    },
    difficultyDaily: {
      enabled: true,
      priority: 600,
      percentThreshold: 10,
    },
    orchardWeekly: {
      enabled: true,
      priority: 500,
      absoluteThreshold: 25000,
      percentThreshold: 2,
    },
    totalShieldedWeekly: {
      enabled: true,
      priority: 450,
      absoluteThreshold: 50000,
      percentThreshold: 2,
    },
    blockDailyFallback: {
      enabled: true,
      priority: 200,
    },
    latestSnapshotFallback: {
      enabled: true,
      priority: 100,
    },
  };
}

function configSummaryForRule(policy: BlockinfoPostCaptionPolicy, ruleId: keyof BlockinfoPostCaptionPolicy): string {
  const rule = policy[ruleId];
  if ("minAbsoluteChange" in rule) {
    return `priority ${rule.priority}; min absolute change ${rule.minAbsoluteChange}`;
  }
  if ("absoluteThreshold" in rule || "percentThreshold" in rule) {
    const parts = [`priority ${rule.priority}`];
    if (typeof rule.absoluteThreshold === "number") parts.push(`absolute >= ${rule.absoluteThreshold}`);
    if (typeof rule.percentThreshold === "number") parts.push(`percent >= ${rule.percentThreshold}%`);
    return parts.join("; ");
  }
  return `priority ${rule.priority}`;
}

function passesThresholdRule(
  absolute: number | null,
  percent: number | null,
  rule: BlockinfoPostCaptionThresholdRule,
): boolean {
  if (!rule.enabled || absolute == null) return false;
  const absHit = typeof rule.absoluteThreshold === "number" ? Math.abs(absolute) >= rule.absoluteThreshold : false;
  const percentHit = typeof rule.percentThreshold === "number" && percent != null ? Math.abs(percent) >= rule.percentThreshold : false;
  return absHit || percentHit;
}

export function buildDeterministicCaptionDecision(
  snapshot: BlockinfoPostDeterministicSnapshot,
  summary: BlockinfoPostRowSummary,
  policy: BlockinfoPostCaptionPolicy,
): BlockinfoPostCaptionDecision {
  const candidates: BlockinfoPostCaptionDecision[] = [];

  const sprout1d = getDelta(snapshot, "sprout", "1d");
  if (
    policy.sproutAnyChange.enabled &&
    sprout1d.absolute != null &&
    Math.abs(sprout1d.absolute) > policy.sproutAnyChange.minAbsoluteChange
  ) {
    const amount = formatZecAmount(sprout1d.absolute);
    candidates.push({
      ruleId: "sproutAnyChange",
      priority: policy.sproutAnyChange.priority,
      configSummary: configSummaryForRule(policy, "sproutAnyChange"),
      text:
        sprout1d.absolute < 0
          ? `Wow, ${amount} $ZEC moved out of the Sprout pool over the last 24 hours.`
          : `${amount} $ZEC moved into the Sprout pool over the last 24 hours.`,
    });
  }

  const orchard1d = getDelta(snapshot, "orchard", "1d");
  if (passesThresholdRule(orchard1d.absolute, orchard1d.percent, policy.orchardDaily)) {
    const amount = formatZecAmount(orchard1d.absolute as number);
    candidates.push({
      ruleId: "orchardDaily",
      priority: policy.orchardDaily.priority,
      configSummary: configSummaryForRule(policy, "orchardDaily"),
      text:
        (orchard1d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the Orchard pool over the last 24 hours.`
          : `${amount} $ZEC left the Orchard pool over the last 24 hours.`,
    });
  }

  const totalShielded1d = getDelta(snapshot, "total_shielded", "1d");
  if (passesThresholdRule(totalShielded1d.absolute, totalShielded1d.percent, policy.totalShieldedDaily)) {
    const amount = formatZecAmount(totalShielded1d.absolute as number);
    candidates.push({
      ruleId: "totalShieldedDaily",
      priority: policy.totalShieldedDaily.priority,
      configSummary: configSummaryForRule(policy, "totalShieldedDaily"),
      text:
        (totalShielded1d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the shielded pool over the last 24 hours.`
          : `${amount} $ZEC left the shielded pool over the last 24 hours.`,
    });
  }

  const transparent1d = getDelta(snapshot, "transparent", "1d");
  if (passesThresholdRule(transparent1d.absolute, transparent1d.percent, policy.transparentDaily)) {
    const amount = formatZecAmount(transparent1d.absolute as number);
    candidates.push({
      ruleId: "transparentDaily",
      priority: policy.transparentDaily.priority,
      configSummary: configSummaryForRule(policy, "transparentDaily"),
      text:
        (transparent1d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the transparent pool over the last 24 hours.`
          : `${amount} $ZEC moved out of the transparent pool over the last 24 hours.`,
    });
  }

  const difficulty1d = getDelta(snapshot, "difficulty", "1d");
  if (
    policy.difficultyDaily.enabled &&
    difficulty1d.percent != null &&
    typeof policy.difficultyDaily.percentThreshold === "number" &&
    Math.abs(difficulty1d.percent) >= policy.difficultyDaily.percentThreshold
  ) {
    candidates.push({
      ruleId: "difficultyDaily",
      priority: policy.difficultyDaily.priority,
      configSummary: configSummaryForRule(policy, "difficultyDaily"),
      text: `Network difficulty ${difficulty1d.percent >= 0 ? "jumped" : "fell"} ${formatPercentValue(difficulty1d.percent)}% over the last 24 hours.`,
    });
  }

  const orchard7d = getDelta(snapshot, "orchard", "7d");
  if (passesThresholdRule(orchard7d.absolute, orchard7d.percent, policy.orchardWeekly)) {
    const amount = formatZecAmount(orchard7d.absolute as number);
    candidates.push({
      ruleId: "orchardWeekly",
      priority: policy.orchardWeekly.priority,
      configSummary: configSummaryForRule(policy, "orchardWeekly"),
      text:
        (orchard7d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the Orchard pool over the last 7 days.`
          : `${amount} $ZEC left the Orchard pool over the last 7 days.`,
    });
  }

  const totalShielded7d = getDelta(snapshot, "total_shielded", "7d");
  if (passesThresholdRule(totalShielded7d.absolute, totalShielded7d.percent, policy.totalShieldedWeekly)) {
    const amount = formatZecAmount(totalShielded7d.absolute as number);
    candidates.push({
      ruleId: "totalShieldedWeekly",
      priority: policy.totalShieldedWeekly.priority,
      configSummary: configSummaryForRule(policy, "totalShieldedWeekly"),
      text:
        (totalShielded7d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the shielded pool over the last 7 days.`
          : `${amount} $ZEC left the shielded pool over the last 7 days.`,
    });
  }

  const height1d = getDelta(snapshot, "height", "1d");
  if (policy.blockDailyFallback.enabled && height1d.absolute != null && height1d.absolute > 0) {
    candidates.push({
      ruleId: "blockDailyFallback",
      priority: policy.blockDailyFallback.priority,
      configSummary: configSummaryForRule(policy, "blockDailyFallback"),
      text: `${formatWholeNumber(height1d.absolute)} blocks later, here's the latest Zcash chain snapshot.`,
    });
  }

  if (policy.latestSnapshotFallback.enabled && summary.height != null) {
    candidates.push({
      ruleId: "latestSnapshotFallback",
      priority: policy.latestSnapshotFallback.priority,
      configSummary: configSummaryForRule(policy, "latestSnapshotFallback"),
      text: `Latest Zcash block snapshot: height ${formatWholeNumber(summary.height)}.`,
    });
  }

  return candidates.sort((a, b) => b.priority - a.priority)[0] ?? {
    ruleId: "latestSnapshotFallback",
    priority: 0,
    configSummary: "fallback",
    text: "Latest Zcash block snapshot.",
  };
}
