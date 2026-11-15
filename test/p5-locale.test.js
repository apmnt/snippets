import assert from "node:assert/strict";
import test from "node:test";
import { getValidLanguages } from "../src/p5-locale.js";

test("falls back to English for POSIX and malformed locales", () => {
  for (const languages of [["c"], ["C.UTF-8"], ["en_US"], [null], []]) {
    assert.deepEqual(getValidLanguages(languages), ["en"]);
  }
  assert.deepEqual(getValidLanguages(), ["en"]);
});

test("preserves valid preferences and removes invalid entries", () => {
  assert.deepEqual(getValidLanguages(["c", "fi-fi", "en-US", "fi-FI"]), [
    "fi-FI",
    "en-US",
  ]);
});
