import assert from "node:assert/strict";
import test from "node:test";

import { buildReserveinfoXPostBody } from "../lib/reserveinfo-post/x-delivery.ts";

test("builds quote-root page posts and CTA replies for X", () => {
  assert.deepEqual(buildReserveinfoXPostBody({ text: "page one", mediaId: "media-1" }), {
    text: "page one",
    media: { media_ids: ["media-1"] },
  });
  assert.deepEqual(buildReserveinfoXPostBody({ text: "page two", mediaId: "media-2", quoteTweetId: "page-one" }), {
    text: "page two",
    media: { media_ids: ["media-2"] },
    quote_tweet_id: "page-one",
  });
  assert.deepEqual(buildReserveinfoXPostBody({ text: "protection CTA", replyTo: "page-two" }), {
    text: "protection CTA",
    reply: { in_reply_to_tweet_id: "page-two" },
  });
});
