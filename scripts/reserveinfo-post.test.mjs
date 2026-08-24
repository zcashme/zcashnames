import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompletedReserveinfoWindow,
  buildReserveinfoSchedule,
  normalizeReservedNames,
  paginateReservedNames,
  parseReservedNameMemo,
} from "../lib/reserveinfo-post/planning.ts";

test("completed reserve window is the prior Monday through Sunday in New York", () => {
  const window = buildCompletedReserveinfoWindow(new Date("2026-08-24T15:00:00.000Z"));
  assert.equal(window.weekStartDateKey, "2026-08-17");
  assert.equal(window.weekEndDateKey, "2026-08-24");
  assert.equal(window.weekStartIso, "2026-08-17T04:00:00.000Z");
  assert.equal(window.weekEndIso, "2026-08-24T04:00:00.000Z");
});

test("dedupes case-insensitively, keeps the earliest row, and puts nonnumeric names first", () => {
  const names = normalizeReservedNames([
    { name: "zed9", reservedAt: "2026-08-18T10:00:00.000Z" },
    { name: "Alpha", reservedAt: "2026-08-18T12:00:00.000Z" },
    { name: "alpha", reservedAt: "2026-08-18T09:00:00.000Z" },
    { name: "beta", reservedAt: "2026-08-18T11:00:00.000Z" },
    { name: "444", reservedAt: "2026-08-18T08:00:00.000Z" },
  ]);
  assert.deepEqual(names.map((entry) => entry.name), ["alpha", "beta", "zed9"]);
  assert.equal(names[0].reservedAt, "2026-08-18T09:00:00.000Z");
});

test("extracts names only from valid reserve transaction memos", () => {
  assert.equal(parseReservedNameMemo("ZNS:RESERVE|Name::jean|UUID::09590e3c-4e40-4d65-9169-1eb5c3d3872e"), "jean");
  assert.equal(parseReservedNameMemo("ZNS:RESERVE|Name::  zcash  |UUID::abc"), "zcash");
  assert.equal(parseReservedNameMemo("ZNS:REGISTER|Name::jean|UUID::abc"), null);
  assert.equal(parseReservedNameMemo(null), null);
});

test("paginates 30 names into fixed display ranges", () => {
  const names = Array.from({ length: 61 }, (_, index) => ({ name: `name${index}`, reservedAt: "2026-08-18T00:00:00.000Z" }));
  const pages = paginateReservedNames(names);
  assert.deepEqual(pages.map((page) => [page.names.length, page.shownStart, page.shownEnd]), [[30, 1, 30], [30, 31, 60], [1, 61, 61]]);
});

test("schedules 1, 5, 6, 9, 15, and 16 pages across weekdays in chronological order", () => {
  for (const count of [1, 5, 6, 9, 15, 16, 28]) {
    const schedule = buildReserveinfoSchedule(count, "2026-08-17");
    assert.equal(schedule.length, count);
    assert.deepEqual([...schedule].sort(), schedule);
  }
  const six = buildReserveinfoSchedule(6, "2026-08-17");
  assert.equal(six[0], "2026-08-24T15:30:00.000Z");
  assert.equal(six[1], "2026-08-24T20:30:00.000Z");
  const sixteen = buildReserveinfoSchedule(16, "2026-08-17");
  assert.equal(new Date(sixteen[0]).getUTCHours(), 12);
});
