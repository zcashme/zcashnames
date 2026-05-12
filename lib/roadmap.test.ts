import test from "node:test";
import assert from "node:assert/strict";
import { parseRoadmapMarkdown, parseIsoDateUtc, startOfUtcWeek, endOfUtcWeek, diffUtcWeeks } from "./roadmap.ts";
import { buildRoadmapLayouts, buildRoadmapShareMessage, countCompletedRoadmapPeriods } from "./roadmap-status.ts";

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
    sectionTitle: undefined,
    title: "First period",
    badgeLabel: undefined,
    badgeHref: undefined,
    summary: "Ship the first stage.",
    startDate: "2026-05-06",
    endDate: "2026-05-18",
    tasks: ["Task one", "Task two"],
  });
  assert.equal(periods[1].id, "second-period");
});

test("parseRoadmapMarkdown extracts a heading badge link from the title line", () => {
  const periods = parseRoadmapMarkdown(`
# Beta v1  [\`Apply Now\`](https://zcashme.com/beta/apply)
Beta testers can apply.
Start: 2026-05-18
End: 2026-06-09
- Task one
`);

  assert.deepEqual(periods[0], {
    id: "beta-v1",
    sectionTitle: undefined,
    title: "Beta v1",
    badgeLabel: "Apply Now",
    badgeHref: "https://zcashme.com/beta/apply",
    summary: "Beta testers can apply.",
    startDate: "2026-05-18",
    endDate: "2026-06-09",
    tasks: ["Task one"],
  });
});

test("parseRoadmapMarkdown extracts an inline code badge from the title line", () => {
  const periods = parseRoadmapMarkdown(`
# Alpha v1  \`Complete\`
Alpha shipped.
Start: 2026-03-09
End: 2026-04-19
- Task one

# Beta v2  \`TBA\`
Beta pending.
Start: 2026-06-19
End: 2026-06-30
- Task two
`);

  assert.equal(periods[0].title, "Alpha v1");
  assert.equal(periods[0].badgeLabel, "Complete");
  assert.equal(periods[0].badgeHref, undefined);
  assert.equal(periods[1].title, "Beta v2");
  assert.equal(periods[1].badgeLabel, "TBA");
  assert.equal(periods[1].badgeHref, undefined);
});

test("parseRoadmapMarkdown assigns section titles from separator lines", () => {
  const periods = parseRoadmapMarkdown(`
--- Build

# Alpha v1  \`Complete\`
Alpha shipped.
Start: 2026-03-09
End: 2026-04-19
- Task one

--- Launch

# Early Access  \`TBA\`
Launch begins.
Start: 2026-07-31
End: 2026-08-14
- Task two

# Open Registration  \`TBA\`
Public launch.
Start: 2026-08-15
End: 3000-12-31
- Task three
`);

  assert.equal(periods[0].sectionTitle, "Build");
  assert.equal(periods[1].sectionTitle, "Launch");
  assert.equal(periods[2].sectionTitle, "Launch");
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

test("buildRoadmapLayouts marks a date-current phase as current", () => {
  const periods = parseRoadmapMarkdown(`
# Alpha
Current phase.
Start: 2026-05-01
End: 2026-05-20
- Task one

# Beta
Upcoming phase.
Start: 2026-05-21
End: 2026-05-30
- Task two
`);

  const layouts = buildRoadmapLayouts(periods, parseIsoDateUtc("2026-05-12"));
  assert.equal(layouts[0].isCurrent, true);
  assert.equal(layouts[0].isUpcoming, false);
  assert.equal(layouts[1].isCurrent, false);
  assert.equal(layouts[1].isUpcoming, false);
});

test("buildRoadmapLayouts marks only the first upcoming phase during a gap", () => {
  const periods = parseRoadmapMarkdown(`
# Alpha
Completed phase.
Start: 2026-05-01
End: 2026-05-08
- Task one

# Beta
First upcoming phase.
Start: 2026-05-18
End: 2026-05-30
- Task two

# Gamma
Later upcoming phase.
Start: 2026-06-01
End: 2026-06-10
- Task three
`);

  const layouts = buildRoadmapLayouts(periods, parseIsoDateUtc("2026-05-12"));
  assert.equal(layouts[0].isUpcoming, false);
  assert.equal(layouts[1].isUpcoming, true);
  assert.equal(layouts[2].isUpcoming, false);
});

test("countCompletedRoadmapPeriods counts only ended phases", () => {
  const periods = parseRoadmapMarkdown(`
# Alpha
Completed phase.
Start: 2026-05-01
End: 2026-05-08
- Task one

# Beta
Completed phase.
Start: 2026-05-09
End: 2026-05-11
- Task two

# Gamma
Upcoming phase.
Start: 2026-05-18
End: 2026-05-30
- Task three
`);

  assert.equal(countCompletedRoadmapPeriods(periods, parseIsoDateUtc("2026-05-12")), 2);
});

test("buildRoadmapShareMessage includes focus, completed count, and canonical roadmap url", () => {
  assert.equal(
    buildRoadmapShareMessage({
      currentFocusTitle: "Beta v1",
      completedCount: 2,
      totalCount: 7,
      shareUrl: "https://www.zcashnames.com/roadmap",
    }),
    "ZcashNames is currently focusing on their Beta v1, having completed 2 of the 7 phases in their roadmap so far. Check it out: https://www.zcashnames.com/roadmap",
  );
});
