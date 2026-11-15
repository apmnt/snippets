import assert from "node:assert/strict";
import test from "node:test";
import {
  captureConsoleLogs,
  formatConsoleLog,
} from "../src/preview-console.js";

test("formats multiple values, circular objects, errors, and bigint", () => {
  const object = { count: 3 };
  object.self = object;
  assert.equal(
    formatConsoleLog(["hello", 42, null, undefined, 2n]),
    'hello 42 null undefined "2n"',
  );
  assert.equal(formatConsoleLog([object]), '{"count":3,"self":"[Circular]"}');
  assert.equal(formatConsoleLog([new Error("Oops")]), "Error: Oops");
  const shared = { x: 1 };
  assert.equal(formatConsoleLog([shared, shared]), '{"x":1} {"x":1}');
  assert.ok(formatConsoleLog(["x".repeat(20000)]).length <= 10000);
});

test("forwards logs and keeps the original developer console working", () => {
  const originalValues = [];
  const messages = [];
  const target = { log: (...values) => originalValues.push(values) };
  const original = target.log;
  const restore = captureConsoleLogs(target, (text) => messages.push(text));
  target.log("position", { x: 10 });
  assert.deepEqual(messages, ['position {"x":10}']);
  assert.deepEqual(originalValues, [["position", { x: 10 }]]);
  restore();
  assert.equal(target.log, original);
});
