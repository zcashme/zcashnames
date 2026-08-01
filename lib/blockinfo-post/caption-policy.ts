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
    orchard30dMax: {
      enabled: true,
      priority: 950,
    },
    totalShielded30dMax: {
      enabled: true,
      priority: 900,
    },
    transparent30dMax: {
      enabled: true,
      priority: 850,
    },
    difficulty30dMax: {
      enabled: true,
      priority: 800,
    },
    orchardDaily: {
      enabled: true,
      priority: 700,
      absoluteThreshold: 10000,
      percentThreshold: 1,
    },
    ironwoodDaily: {
      enabled: true,
      priority: 675,
      absoluteThreshold: 10000,
      percentThreshold: 1,
    },
    totalShieldedDaily: {
      enabled: true,
      priority: 650,
      absoluteThreshold: 25000,
      percentThreshold: 1,
    },
    transparentDaily: {
      enabled: true,
      priority: 600,
      absoluteThreshold: 10000,
      percentThreshold: 1,
    },
    orchardWeekly: {
      enabled: true,
      priority: 500,
      absoluteThreshold: 25000,
      percentThreshold: 2,
    },
    ironwoodWeekly: {
      enabled: true,
      priority: 475,
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

function configSummaryForCombinedRules(
  policy: BlockinfoPostCaptionPolicy,
  ruleIds: Array<keyof BlockinfoPostCaptionPolicy>,
): string {
  return ruleIds.map((ruleId) => `${ruleId}: ${configSummaryForRule(policy, ruleId)}`).join(" | ");
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

function isThirtyDayMax(snapshot: BlockinfoPostDeterministicSnapshot, key: BlockinfoPostStatKey): boolean {
  const stat = snapshot.stats[key];
  return stat.max30d.value != null && stat.current != null && stat.max30d.isCurrent && stat.current === stat.max30d.value;
}

function formatPoolFlowObservation(poolLabel: string, absolute: number, windowText: string): string {
  const amount = formatZecAmount(absolute);
  return absolute >= 0
    ? `${amount} more $ZEC entered the ${poolLabel} pool`
    : `${amount} $ZEC left the ${poolLabel} pool`;
}

function maybeBuildCombinedPoolCaption(args: {
  orchardDelta: ReturnType<typeof getDelta>;
  orchardRule: BlockinfoPostCaptionThresholdRule;
  orchardRuleId: "orchardDaily" | "orchardWeekly";
  ironwoodDelta: ReturnType<typeof getDelta>;
  ironwoodRule: BlockinfoPostCaptionThresholdRule;
  ironwoodRuleId: "ironwoodDaily" | "ironwoodWeekly";
  combinedRuleId: "orchardIronwoodDailyCombined" | "orchardIronwoodWeeklyCombined";
  windowText: "over the last 24 hours." | "over the last 7 days.";
  policy: BlockinfoPostCaptionPolicy;
}): BlockinfoPostCaptionDecision | null {
  if (
    !passesThresholdRule(args.orchardDelta.absolute, args.orchardDelta.percent, args.orchardRule) ||
    !passesThresholdRule(args.ironwoodDelta.absolute, args.ironwoodDelta.percent, args.ironwoodRule)
  ) {
    return null;
  }

  if (args.orchardDelta.absolute == null || args.ironwoodDelta.absolute == null) {
    return null;
  }

  if (Math.sign(args.orchardDelta.absolute) === Math.sign(args.ironwoodDelta.absolute)) {
    return null;
  }

  return {
    ruleId: args.combinedRuleId,
    priority: Math.max(args.orchardRule.priority, args.ironwoodRule.priority),
    configSummary: configSummaryForCombinedRules(args.policy, [args.orchardRuleId, args.ironwoodRuleId]),
    text: `${formatPoolFlowObservation("Orchard", args.orchardDelta.absolute, args.windowText)} while ${formatPoolFlowObservation("Ironwood", args.ironwoodDelta.absolute, args.windowText)} ${args.windowText}`,
  };
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

  if (policy.orchard30dMax.enabled && isThirtyDayMax(snapshot, "orchard")) {
    candidates.push({
      ruleId: "orchard30dMax",
      priority: policy.orchard30dMax.priority,
      configSummary: configSummaryForRule(policy, "orchard30dMax"),
      text: `The Orchard pool is at its highest level in the last 30 days, now holding ${snapshot.stats.orchard.formattedCurrent} $ZEC.`,
    });
  }

  if (policy.totalShielded30dMax.enabled && isThirtyDayMax(snapshot, "total_shielded")) {
    candidates.push({
      ruleId: "totalShielded30dMax",
      priority: policy.totalShielded30dMax.priority,
      configSummary: configSummaryForRule(policy, "totalShielded30dMax"),
      text: `Shielded ZEC just reached its highest level in the last 30 days at ${snapshot.stats.total_shielded.formattedCurrent} $ZEC.`,
    });
  }

  if (policy.transparent30dMax.enabled && isThirtyDayMax(snapshot, "transparent")) {
    candidates.push({
      ruleId: "transparent30dMax",
      priority: policy.transparent30dMax.priority,
      configSummary: configSummaryForRule(policy, "transparent30dMax"),
      text: `The transparent pool is at a 30-day high with ${snapshot.stats.transparent.formattedCurrent} $ZEC.`,
    });
  }

  if (policy.difficulty30dMax.enabled && isThirtyDayMax(snapshot, "difficulty")) {
    candidates.push({
      ruleId: "difficulty30dMax",
      priority: policy.difficulty30dMax.priority,
      configSummary: configSummaryForRule(policy, "difficulty30dMax"),
      text: `Network difficulty is at its highest point in the last 30 days.`,
    });
  }

  const orchard1d = getDelta(snapshot, "orchard", "1d");
  const ironwood1d = getDelta(snapshot, "ironwood", "1d");
  const combinedDaily = maybeBuildCombinedPoolCaption({
    orchardDelta: orchard1d,
    orchardRule: policy.orchardDaily,
    orchardRuleId: "orchardDaily",
    ironwoodDelta: ironwood1d,
    ironwoodRule: policy.ironwoodDaily,
    ironwoodRuleId: "ironwoodDaily",
    combinedRuleId: "orchardIronwoodDailyCombined",
    windowText: "over the last 24 hours.",
    policy,
  });
  if (combinedDaily) {
    candidates.push(combinedDaily);
  } else if (passesThresholdRule(orchard1d.absolute, orchard1d.percent, policy.orchardDaily)) {
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

  if (!combinedDaily && passesThresholdRule(ironwood1d.absolute, ironwood1d.percent, policy.ironwoodDaily)) {
    const amount = formatZecAmount(ironwood1d.absolute as number);
    candidates.push({
      ruleId: "ironwoodDaily",
      priority: policy.ironwoodDaily.priority,
      configSummary: configSummaryForRule(policy, "ironwoodDaily"),
      text:
        (ironwood1d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the Ironwood pool over the last 24 hours.`
          : `${amount} $ZEC left the Ironwood pool over the last 24 hours.`,
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

  const orchard7d = getDelta(snapshot, "orchard", "7d");
  const ironwood7d = getDelta(snapshot, "ironwood", "7d");
  const combinedWeekly = maybeBuildCombinedPoolCaption({
    orchardDelta: orchard7d,
    orchardRule: policy.orchardWeekly,
    orchardRuleId: "orchardWeekly",
    ironwoodDelta: ironwood7d,
    ironwoodRule: policy.ironwoodWeekly,
    ironwoodRuleId: "ironwoodWeekly",
    combinedRuleId: "orchardIronwoodWeeklyCombined",
    windowText: "over the last 7 days.",
    policy,
  });
  if (combinedWeekly) {
    candidates.push(combinedWeekly);
  } else if (passesThresholdRule(orchard7d.absolute, orchard7d.percent, policy.orchardWeekly)) {
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

  if (!combinedWeekly && passesThresholdRule(ironwood7d.absolute, ironwood7d.percent, policy.ironwoodWeekly)) {
    const amount = formatZecAmount(ironwood7d.absolute as number);
    candidates.push({
      ruleId: "ironwoodWeekly",
      priority: policy.ironwoodWeekly.priority,
      configSummary: configSummaryForRule(policy, "ironwoodWeekly"),
      text:
        (ironwood7d.absolute as number) >= 0
          ? `${amount} more $ZEC entered the Ironwood pool over the last 7 days.`
          : `${amount} $ZEC left the Ironwood pool over the last 7 days.`,
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
