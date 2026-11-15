import assert from "node:assert/strict";
import test from "node:test";
import { disablePageZoom } from "../src/disable-zoom.js";

function touchEvent(type, time, touches, changedTouches = []) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "timeStamp", { value: time });
  return Object.assign(event, { touches, changedTouches });
}

test("blocks double taps and pinch gestures while allowing scrolling", () => {
  const target = new EventTarget();
  const dispose = disablePageZoom(target);
  const point = { clientX: 100, clientY: 100 };
  const tap = touchEvent("touchend", 1000, [], [point]);
  target.dispatchEvent(tap);
  assert.equal(tap.defaultPrevented, false);
  const doubleTap = touchEvent("touchend", 1200, [], [point]);
  target.dispatchEvent(doubleTap);
  assert.equal(doubleTap.defaultPrevented, true);
  const distantTap = touchEvent(
    "touchend",
    1300,
    [],
    [{ clientX: 250, clientY: 100 }],
  );
  target.dispatchEvent(distantTap);
  assert.equal(distantTap.defaultPrevented, false);
  const scroll = touchEvent("touchmove", 1500, [point]);
  target.dispatchEvent(scroll);
  assert.equal(scroll.defaultPrevented, false);
  const pinch = touchEvent("touchmove", 1600, [point, point]);
  target.dispatchEvent(pinch);
  assert.equal(pinch.defaultPrevented, true);
  for (const type of ["gesturestart", "gesturechange"]) {
    const gesture = new Event(type, { cancelable: true });
    target.dispatchEvent(gesture);
    assert.equal(gesture.defaultPrevented, true);
  }
  dispose();
  const afterDispose = new Event("gesturestart", { cancelable: true });
  target.dispatchEvent(afterDispose);
  assert.equal(afterDispose.defaultPrevented, false);
});
