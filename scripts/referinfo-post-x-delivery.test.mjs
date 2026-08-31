import assert from "node:assert/strict";
import test from "node:test";

import {
  buildXPostRequestBody,
  getReferinfoXPostTarget,
  normalizeReferinfoXThreadMode,
  shouldBlockReferinfoXDeliveryAfterFailure,
} from "../lib/referinfo-post/x-delivery.ts";

test("normalizes quote-root policy mode and preserves the legacy default", () => {
  assert.equal(normalizeReferinfoXThreadMode("quote_root"), "quote_root");
  assert.equal(normalizeReferinfoXThreadMode("linear"), "linear");
  assert.equal(normalizeReferinfoXThreadMode("unknown"), "linear");
  assert.equal(normalizeReferinfoXThreadMode(undefined), "linear");
});

test("builds standalone, quote, and CTA reply X payloads", () => {
  assert.deepEqual(buildXPostRequestBody({ text: "root", mediaId: "media-1" }), {
    text: "root",
    media: { media_ids: ["media-1"] },
  });
  assert.deepEqual(buildXPostRequestBody({ text: "quote", target: { type: "quote", quotedTweetId: "tweet-1" } }), {
    text: "quote",
    quote_tweet_id: "tweet-1",
  });
  assert.deepEqual(buildXPostRequestBody({ text: "CTA", target: { type: "reply", replyToTweetId: "tweet-2" } }), {
    text: "CTA",
    reply: { in_reply_to_tweet_id: "tweet-2" },
  });
});

test("quote-root delivery chains top-level posts and replies to the current top-level post", () => {
  const kinds = ["summary_top10", "top_movers", "top_newcomers", "top_indirect", "leader_changes", "closing_note"];
  let latestTopLevelTweetId = null;
  const targets = [];

  for (const kind of kinds) {
    const target = getReferinfoXPostTarget({ mode: "quote_root", kind, latestTopLevelTweetId });
    targets.push(target);
    if (kind !== "closing_note") latestTopLevelTweetId = `tweet-${kind}`;
  }

  assert.deepEqual(targets, [
    { type: "standalone" },
    { type: "quote", quotedTweetId: "tweet-summary_top10" },
    { type: "quote", quotedTweetId: "tweet-top_movers" },
    { type: "quote", quotedTweetId: "tweet-top_newcomers" },
    { type: "quote", quotedTweetId: "tweet-top_indirect" },
    { type: "reply", replyToTweetId: "tweet-leader_changes" },
  ]);
});

test("missing previous top-level post falls back to standalone and only top-level failures stop X delivery", () => {
  assert.deepEqual(
    getReferinfoXPostTarget({ mode: "quote_root", kind: "top_movers", latestTopLevelTweetId: null }),
    { type: "standalone" },
  );
  assert.equal(shouldBlockReferinfoXDeliveryAfterFailure("summary_top10"), true);
  assert.equal(shouldBlockReferinfoXDeliveryAfterFailure("closing_note"), false);
});
