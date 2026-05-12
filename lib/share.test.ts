import test from "node:test";
import assert from "node:assert/strict";
import { buildEmailShareHref, buildTelegramShareHref, buildXShareHref } from "./share.ts";

test("buildXShareHref encodes the message for X sharing", () => {
  const message = "ZcashNames roadmap update https://www.zcashnames.com/roadmap";
  assert.equal(
    buildXShareHref(message),
    "https://x.com/intent/post?text=ZcashNames%20roadmap%20update%20https%3A%2F%2Fwww.zcashnames.com%2Froadmap",
  );
});

test("buildTelegramShareHref encodes the message for Telegram sharing", () => {
  const message = "ZcashNames roadmap update https://www.zcashnames.com/roadmap";
  assert.equal(
    buildTelegramShareHref(message),
    "https://t.me/share/url?url=ZcashNames%20roadmap%20update%20https%3A%2F%2Fwww.zcashnames.com%2Froadmap",
  );
});

test("buildEmailShareHref encodes the subject and body for email sharing", () => {
  const subject = "ZcashNames Roadmap";
  const message = "Completed 2 of 7. https://www.zcashnames.com/roadmap";
  assert.equal(
    buildEmailShareHref(subject, message),
    "mailto:?subject=ZcashNames%20Roadmap&body=Completed%202%20of%207.%20https%3A%2F%2Fwww.zcashnames.com%2Froadmap",
  );
});
