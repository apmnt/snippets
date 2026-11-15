import assert from "node:assert/strict";
import test from "node:test";
import { createHelper } from "../src/helper.js";

function canvas() {
  const calls = [];
  const stack = [];
  let state = { stroke: "original", fill: "original", transform: "original" };
  const p = {
    width: 100,
    height: 100,
    mouseX: 12.4,
    mouseY: 20.8,
    push() {
      stack.push({ ...state });
    },
    pop() {
      state = stack.pop();
    },
    resetMatrix() {
      state.transform = "reset";
    },
    stroke(value) {
      state.stroke = value;
    },
    fill(value) {
      state.fill = value;
    },
    frameRate: () => 60,
    textWidth: (text) => text.length * 7,
  };
  for (const method of [
    "colorMode",
    "blendMode",
    "rectMode",
    "ellipseMode",
    "strokeWeight",
    "textFont",
    "textSize",
    "textStyle",
    "textAlign",
    "noStroke",
    "noFill",
    "line",
    "rect",
    "circle",
    "text",
  ]) {
    p[method] = (...args) => calls.push({ method, args });
  }
  return { p, calls, state: () => state, stack };
}

test("grid covers the current canvas and follows resizing", () => {
  const { p, calls } = canvas();
  const helper = createHelper(p);
  helper.grid({ spacing: 50 });
  assert.ok(
    calls.some(
      (call) => call.method === "line" && call.args.join() === "100,0,100,100",
    ),
  );
  calls.length = 0;
  p.width = 200;
  helper.grid({ spacing: 50 });
  assert.ok(
    calls.some(
      (call) => call.method === "line" && call.args.join() === "200,0,200,100",
    ),
  );
});

test("every overlay preserves drawing state and disabled helpers draw nothing", () => {
  const { p, calls, state, stack } = canvas();
  const original = { ...state() };
  const helper = createHelper(p);
  const draw = () => {
    helper.grid();
    helper.axes();
    helper.point(10, 20);
    helper.bounds(0, 0, 30, 40, { label: "bounds" });
    helper.vector(10, 20, 30, 40, { label: "speed" });
    helper.hud();
  };
  draw();
  assert.deepEqual(state(), original);
  assert.equal(stack.length, 0);
  assert.ok(
    calls.some(
      (call) => call.method === "text" && call.args[0] === "Mouse: 12, 21",
    ),
  );
  assert.ok(
    calls.some(
      (call) => call.method === "text" && call.args[0] === "FPS: 60.0",
    ),
  );
  calls.length = 0;
  helper.enabled = false;
  draw();
  assert.equal(calls.length, 0);
  helper.enabled = true;
  helper.point(10, 20);
  assert.ok(calls.length > 0);
});

test("invalid grid spacing fails instead of hanging a sketch", () => {
  const { p } = canvas();
  for (const spacing of [0, -1, NaN, Infinity]) {
    assert.throws(() => createHelper(p).grid({ spacing }), RangeError);
  }
});

test("drawing failures still restore the sketch state", () => {
  const { p, state, stack } = canvas();
  const original = { ...state() };
  p.line = () => {
    throw new Error("Draw failed");
  };
  assert.throws(() => createHelper(p).axes(), /Draw failed/);
  assert.deepEqual(state(), original);
  assert.equal(stack.length, 0);
});
