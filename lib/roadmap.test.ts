import test from "node:test";
import assert from "node:assert/strict";
import {
  diffUtcWeeks,
  endOfUtcWeek,
  getRoadmapStatusMeta,
  parseIsoDateUtc,
  parseRoadmapMarkdown,
  startOfUtcWeek,
} from "./roadmap.ts";

test("parseRoadmapMarkdown returns typed periods in source order", () => {
  const periods = parseRoadmapMarkdown(`
# First period  \`Complete\`
Ship the first stage.
Start: 2026-05-06
End: 2026-05-18
- Task one
- Task two

# Second period  \`Apply Now\`
Follow up on the first stage.
Start: 2026-05-19
End: 2026-06-02
- Task three
`);

  assert.equal(periods.length, 2);
  assert.deepEqual(periods[0], {
    id: "first-period",
    title: "First period",
    status: "Complete",
    summary: "Ship the first stage.",
    startDate: "2026-05-06",
    endDate: "2026-05-18",
    tasks: ["Task one", "Task two"],
  });
  assert.equal(periods[1].id, "second-period");
  assert.equal(periods[1].title, "Second period");
  assert.equal(periods[1].status, "Apply Now");
});

test("parseRoadmapMarkdown rejects invalid date values", () => {
  assert.throws(
    () =>
      parseRoadmapMarkdown(`
# Invalid period  \`TBA\`
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
# Backwards period  \`TBA\`
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
# Empty tasks  \`TBA\`
Missing tasks.
Start: 2026-06-04
End: 2026-06-20
`),
    /at least one task/i,
  );
});

test("parseRoadmapMarkdown rejects headings without a status pill", () => {
  assert.throws(
    () =>
      parseRoadmapMarkdown(`
# Missing status
This should fail.
Start: 2026-06-04
End: 2026-06-20
- Task
`),
    /status pill/i,
  );
});

test("getRoadmapStatusMeta maps status labels to badge semantics", () => {
  assert.deepEqual(getRoadmapStatusMeta("Complete"), {
    kind: "complete",
    icon: "check",
    animated: false,
  });
  assert.deepEqual(getRoadmapStatusMeta("Apply Now"), {
    kind: "apply-now",
    icon: "checkbox",
    animated: true,
  });
  assert.deepEqual(getRoadmapStatusMeta("TBA"), {
    kind: "attention",
    icon: "dot",
    animated: false,
  });
});

test("UTC week helpers align dates to Monday based weeks", () => {
  const date = parseIsoDateUtc("2026-05-06");
  assert.equal(startOfUtcWeek(date).toISOString().slice(0, 10), "2026-05-04");
  assert.equal(endOfUtcWeek(date).toISOString().slice(0, 10), "2026-05-10");
  assert.equal(diffUtcWeeks(parseIsoDateUtc("2026-05-04"), parseIsoDateUtc("2026-05-18")), 2);
});
