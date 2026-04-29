import test from "node:test";
import assert from "node:assert/strict";
import { parseRoadmapMarkdown, parseIsoDateUtc, startOfUtcWeek, endOfUtcWeek, diffUtcWeeks } from "./roadmap.ts";

test("parseRoadmapMarkdown returns typed periods in source order", () => {
  const periods = parseRoadmapMarkdown(`
# First period
Ship the first stage.
Start: 2026-05-06
End: 2026-05-18
- Task one
- Task two

# Second period
Follow up on the first stage.
Start: 2026-05-19
End: 2026-06-02
- Task three
`);

  assert.equal(periods.length, 2);
  assert.deepEqual(periods[0], {
    id: "first-period",
    title: "First period",
    summary: "Ship the first stage.",
    startDate: "2026-05-06",
    endDate: "2026-05-18",
    tasks: ["Task one", "Task two"],
  });
  assert.equal(periods[1].id, "second-period");
});

test("parseRoadmapMarkdown rejects invalid date values", () => {
  assert.throws(
    () =>
      parseRoadmapMarkdown(`
# Invalid period
Bad dates.
Start: 2026-02-30
End: 2026-03-04
- Task
`),
    /invalid start date/i,
  );
});

test("parseRoadmapMarkdown rejects end dates before start dates", () => {
  assert.throws(
    () =>
      parseRoadmapMarkdown(`
# Backwards period
This goes backwards.
Start: 2026-06-04
End: 2026-06-01
- Task
`),
    /End date before its Start date/i,
  );
});

test("parseRoadmapMarkdown rejects empty task lists", () => {
  assert.throws(
    () =>
      parseRoadmapMarkdown(`
# Empty tasks
Missing tasks.
Start: 2026-06-04
End: 2026-06-20
`),
    /at least one task/i,
  );
});

test("UTC week helpers align dates to Monday based weeks", () => {
  const date = parseIsoDateUtc("2026-05-06");
  assert.equal(startOfUtcWeek(date).toISOString().slice(0, 10), "2026-05-04");
  assert.equal(endOfUtcWeek(date).toISOString().slice(0, 10), "2026-05-10");
  assert.equal(diffUtcWeeks(parseIsoDateUtc("2026-05-04"), parseIsoDateUtc("2026-05-18")), 2);
});
