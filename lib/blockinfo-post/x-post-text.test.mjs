import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeXPostText } from "./x-post-text.ts";

test("keeps a single cashtag unchanged", () => {
  assert.equal(
    sanitizeXPostText("12,000 more $ZEC entered the Orchard pool over the last 24 hours."),
    "12,000 more $ZEC entered the Orchard pool over the last 24 hours.",
  );
});

test("removes additional cashtags after the first one", () => {
  assert.equal(
    sanitizeXPostText("12,000 more $ZEC entered the Orchard pool while 15,000 $ZEC left the Ironwood pool."),
    "12,000 more $ZEC entered the Orchard pool while 15,000 ZEC left the Ironwood pool.",
  );
});

test("ignores dollar-prefixed text embedded in larger words", () => {
  assert.equal(
    sanitizeXPostText("alpha$ZEC beta $ZEC gamma $ZEC"),
    "alpha$ZEC beta $ZEC gamma ZEC",
  );
});
