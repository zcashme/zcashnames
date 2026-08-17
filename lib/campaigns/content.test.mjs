import assert from "node:assert/strict";
import test from "node:test";

import {
  parseEmailContent,
  parseEmailInlineContent,
} from "./content.ts";

test("parses markdown mailto links", () => {
  const parts = parseEmailInlineContent("Email [support](mailto:hello@zcashnames.com) anytime.");
  assert.deepEqual(parts, [
    { type: "text", text: "Email " },
    { type: "link", text: "support", href: "mailto:hello@zcashnames.com" },
    { type: "text", text: " anytime." },
  ]);
});

test("parses mailto links with query strings", () => {
  const parts = parseEmailInlineContent(
    "[Ask](mailto:hello@zcashnames.com?subject=Beta%20help)",
  );
  assert.deepEqual(parts, [
    {
      type: "link",
      text: "Ask",
      href: "mailto:hello@zcashnames.com?subject=Beta%20help",
    },
  ]);
});

test("autolinks bare mailto urls", () => {
  const parts = parseEmailInlineContent("Write mailto:hello@zcashnames.com today.");
  assert.deepEqual(parts, [
    { type: "text", text: "Write " },
    { type: "link", text: "hello@zcashnames.com", href: "mailto:hello@zcashnames.com" },
    { type: "text", text: " today." },
  ]);
});

test("still parses https markdown links", () => {
  const parts = parseEmailInlineContent("See [site](https://zcashnames.com).");
  assert.deepEqual(parts, [
    { type: "text", text: "See " },
    { type: "link", text: "site", href: "https://zcashnames.com" },
    { type: "text", text: "." },
  ]);
});

test("parses box center alignment onto the box and its children", () => {
  const blocks = parseEmailContent([":::box center", "Hello there", ":::"].join("\n"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.type, "box");
  assert.equal(blocks[0]?.align, "center");
  assert.deepEqual(blocks[0]?.blocks, [
    { type: "paragraph", text: "Hello there", align: "center" },
  ]);
});

test("parses :::empty as a kept blank line", () => {
  const blocks = parseEmailContent(["Hello", ":::empty", "there"].join("\n"));
  assert.deepEqual(blocks, [
    { type: "paragraph", text: "Hello", align: "left" },
    { type: "empty", align: "left" },
    { type: "paragraph", text: "there", align: "left" },
  ]);
});

test("keeps stacked :::empty markers and the :::br alias", () => {
  const blocks = parseEmailContent(["Hello", ":::empty", ":::br", "there"].join("\n"));
  assert.deepEqual(blocks, [
    { type: "paragraph", text: "Hello", align: "left" },
    { type: "empty", align: "left" },
    { type: "empty", align: "left" },
    { type: "paragraph", text: "there", align: "left" },
  ]);
});

test("parses :::empty inside a box", () => {
  const blocks = parseEmailContent(
    [":::box center", "Hello", ":::empty", "there", ":::"].join("\n"),
  );
  assert.equal(blocks[0]?.type, "box");
  assert.deepEqual(blocks[0]?.blocks, [
    { type: "paragraph", text: "Hello", align: "center" },
    { type: "empty", align: "center" },
    { type: "paragraph", text: "there", align: "center" },
  ]);
});
