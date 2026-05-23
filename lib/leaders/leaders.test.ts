import test from "node:test";
import assert from "node:assert/strict";
import type { WaitlistReferralRow } from "./referral-dashboard.ts";
import { buildWeeklyRankingsFromRows } from "./rankings.ts";

test("buildWeeklyRankingsFromRows groups Monday-Sunday weeks and omits empty weeks", () => {
  const rows = buildFixtureRows();

  const weeklyRows = buildWeeklyRankingsFromRows(rows);

  assert.equal(weeklyRows.length, 3);
  assert.deepEqual(
    weeklyRows.map((row) => row.week),
    [
      "2026-03-30 to 2026-04-05",
      "2026-04-06 to 2026-04-12",
      "2026-04-20 to 2026-04-26",
    ],
  );
  assert.equal(weeklyRows[0].weekStart, "2026-03-30");
  assert.equal(weeklyRows[0].weekEnd, "2026-04-05");
});

test("buildWeeklyRankingsFromRows aggregates weekly top 3 and cumulative all-time standings", () => {
  const rows = buildFixtureRows();

  const weeklyRows = buildWeeklyRankingsFromRows(rows);

  assert.deepEqual(
    weeklyRows[0].weekly.map((entry) => entry?.referral_code ?? null),
    ["alpha", "beta", null],
  );
  assert.deepEqual(
    weeklyRows[1].weekly.map((entry) => entry?.referral_code ?? null),
    ["beta", "gamma", "alpha"],
  );
  assert.deepEqual(
    weeklyRows[1].allTime.map((entry) => entry?.referral_code ?? null),
    ["alpha", "beta", "gamma"],
  );
  assert.deepEqual(
    weeklyRows[1].allTime.map((entry) => entry?.count ?? null),
    [3, 3, 2],
  );
});

test("buildWeeklyRankingsFromRows applies lexical tie-breaking within equal weekly counts", () => {
  const rows = buildFixtureRows();

  const secondWeek = buildWeeklyRankingsFromRows(rows)[1];

  assert.equal(secondWeek.weekly[0]?.referral_code, "beta");
  assert.equal(secondWeek.weekly[1]?.referral_code, "gamma");
  assert.equal(secondWeek.weekly[0]?.count, 2);
  assert.equal(secondWeek.weekly[1]?.count, 2);
});

test("buildWeeklyRankingsFromRows exposes preferred human-readable codes while keeping canonical identity", () => {
  const rows: WaitlistReferralRow[] = [
    owner("Alpha", "alpha", "2026-03-30", "alice"),
    owner("Beta", "beta", "2026-03-30"),
    referral("A1", "a1", "alpha", "2026-03-30"),
    referral("B1", "b1", "beta", "2026-03-30"),
  ];

  const firstWeek = buildWeeklyRankingsFromRows(rows)[0];

  assert.equal(firstWeek.weekly[0]?.referral_code, "alice");
  assert.equal(firstWeek.weekly[0]?.canonical_referral_code, "alpha");
});

function buildFixtureRows(): WaitlistReferralRow[] {
  return [
    owner("Alpha", "alpha", "2026-03-30"),
    owner("Beta", "beta", "2026-03-30"),
    owner("Gamma", "gamma", "2026-03-30"),
    owner("Delta", "delta", "2026-03-30"),
    referral("A1", "a1", "alpha", "2026-03-30"),
    referral("A2", "a2", "alpha", "2026-04-05"),
    referral("B1", "b1", "beta", "2026-04-05"),
    referral("B2", "b2", "beta", "2026-04-06"),
    referral("B3", "b3", "beta", "2026-04-07"),
    referral("G1", "g1", "gamma", "2026-04-08"),
    referral("G2", "g2", "gamma", "2026-04-09"),
    referral("A3", "a3", "alpha", "2026-04-10"),
    referral("D1", "d1", "delta", "2026-04-20"),
  ];
}

function owner(
  name: string,
  referral_code: string,
  date: string,
  human_referral_code?: string,
): WaitlistReferralRow {
  return {
    name,
    referral_code,
    human_referral_code: human_referral_code ?? null,
    preferred_referral_code: human_referral_code ?? referral_code,
    referred_by: null,
    email_verified: true,
    cabal: false,
    created_at: `${date}T00:00:00.000Z`,
  };
}

function referral(name: string, referral_code: string, referred_by: string, date: string): WaitlistReferralRow {
  return {
    name,
    referral_code,
    human_referral_code: null,
    preferred_referral_code: referral_code,
    referred_by,
    email_verified: true,
    cabal: false,
    created_at: `${date}T12:00:00.000Z`,
  };
}
