import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicCaptionDecision,
  getDefaultBlockinfoPostCaptionPolicy,
} from "../lib/blockinfo-post/caption-policy.ts";

const STAT_KEYS = [
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
];

function makeDelta(window, absolute = 0, percent = 0) {
  return {
    window,
    measuredAt: "2026-08-01T00:00:00.000Z",
    absolute,
    percent,
    formatted: String(absolute),
  };
}

function makeStat(key, overrides = {}) {
  const current = overrides.current ?? 100000;
  return {
    key,
    label: key,
    current,
    formattedCurrent: String(current),
    max30d: {
      value: current,
      measuredAt: "2026-08-01T00:00:00.000Z",
      isCurrent: false,
      ...(overrides.max30d ?? {}),
    },
    deltas: {
      "1d": makeDelta("1d"),
      "7d": makeDelta("7d"),
      "30d": makeDelta("30d"),
      ...(overrides.deltas ?? {}),
    },
  };
}

function makeSnapshot(overrides = {}) {
  const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, makeStat(key)]));
  for (const [key, value] of Object.entries(overrides)) {
    stats[key] = {
      ...stats[key],
      ...value,
      deltas: {
        ...stats[key].deltas,
        ...(value.deltas ?? {}),
      },
      max30d: {
        ...stats[key].max30d,
        ...(value.max30d ?? {}),
      },
    };
  }

  return {
    generatedAtIso: "2026-08-01T00:00:00.000Z",
    latestMeasuredAt: "2026-08-01T00:00:00.000Z",
    latestMeasuredDate: "2026-08-01",
    stats,
    statOrder: STAT_KEYS,
  };
}

const defaultSummary = {
  orderField: "height",
  height: 3000000,
  measuredAt: "2026-08-01T00:00:00.000Z",
  measuredDate: "2026-08-01",
  bestBlockHash: null,
};

test("Ironwood 1-day can win on its own", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    ironwood: {
      deltas: {
        "1d": makeDelta("1d", 12000, 1.2),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 0, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "ironwoodDaily");
  assert.match(result.text, /Ironwood pool over the last 24 hours\./);
});

test("Ironwood 7-day can win on its own", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    ironwood: {
      deltas: {
        "7d": makeDelta("7d", 30000, 2.5),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 0, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "ironwoodWeekly");
  assert.match(result.text, /Ironwood pool over the last 7 days\./);
});

test("Orchard and Ironwood daily flows merge when both trigger in opposite directions", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    orchard: {
      deltas: {
        "1d": makeDelta("1d", 12000, 0.6),
      },
    },
    ironwood: {
      deltas: {
        "1d": makeDelta("1d", -15000, -0.5),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 0, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "orchardIronwoodDailyCombined");
  assert.equal(result.priority, policy.orchardDaily.priority);
  assert.match(result.text, /Orchard pool/);
  assert.match(result.text, /Ironwood pool/);
  assert.match(result.text, /while/);
  assert.match(result.text, /over the last 24 hours\.$/);
  assert.match(result.configSummary, /orchardDaily/);
  assert.match(result.configSummary, /ironwoodDaily/);
});

test("Orchard and Ironwood weekly flows merge when both trigger in opposite directions", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    orchard: {
      deltas: {
        "7d": makeDelta("7d", 26000, 1),
      },
    },
    ironwood: {
      deltas: {
        "7d": makeDelta("7d", -32000, -1),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 0, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "orchardIronwoodWeeklyCombined");
  assert.equal(result.priority, policy.orchardWeekly.priority);
  assert.match(result.text, /over the last 7 days\.$/);
  assert.match(result.configSummary, /orchardWeekly/);
  assert.match(result.configSummary, /ironwoodWeekly/);
});

test("Same-direction daily pool moves do not merge", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    orchard: {
      deltas: {
        "1d": makeDelta("1d", 12000, 1.1),
      },
    },
    ironwood: {
      deltas: {
        "1d": makeDelta("1d", 14000, 1.2),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 0, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "orchardDaily");
  assert.doesNotMatch(result.text, /while/);
});

test("Daily merge still happens when one pool passes by percent and the other by absolute threshold", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    orchard: {
      deltas: {
        "1d": makeDelta("1d", 5000, 1.5),
      },
    },
    ironwood: {
      deltas: {
        "1d": makeDelta("1d", -15000, -0.5),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 0, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "orchardIronwoodDailyCombined");
});

test("Fallback still works when Orchard and Ironwood do not qualify", () => {
  const policy = getDefaultBlockinfoPostCaptionPolicy();
  policy.sproutAnyChange.enabled = false;
  const snapshot = makeSnapshot({
    orchard: {
      deltas: {
        "1d": makeDelta("1d", 1000, 0.1),
      },
    },
    ironwood: {
      deltas: {
        "1d": makeDelta("1d", -1000, -0.1),
      },
    },
    height: {
      deltas: {
        "1d": makeDelta("1d", 144, 0),
      },
    },
  });

  const result = buildDeterministicCaptionDecision(snapshot, defaultSummary, policy);
  assert.equal(result.ruleId, "blockDailyFallback");
  assert.match(result.text, /blocks later/);
});
