import p5 from "p5";
import { demos } from "./demos.js";

p5.disableSketchChecker = true;
window.__sketchCapture = { ready: false };

const fail = (error) => {
  window.__sketchCapture = {
    ready: false,
    error: error?.message ?? String(error),
  };
};
window.addEventListener("error", (event) => fail(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => fail(event.reason));

// Stable within a day's render seed, including randomness used before setup().
const query = new URLSearchParams(location.search);
let seed = [...(query.get("seed") ?? "1")].reduce(
  (value, character) =>
    Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0,
  2166136261,
);
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let p5Started = false;
p5.registerAddon((_, __, hooks) => {
  hooks.presetup = function () {
    p5Started = true;
  };
  // Setup-only sketches never run postdraw. p5 awaits setup before this hook.
  hooks.postsetup = function () {
    if (typeof this.draw !== "function") {
      this.noLoop();
      if (!window.__sketchCapture.error)
        window.__sketchCapture = { ready: true };
    }
  };
  hooks.postdraw = function () {
    this.noLoop();
    if (!window.__sketchCapture.error) window.__sketchCapture = { ready: true };
  };
});

async function render() {
  const demo = demos.find((item) => item.id === query.get("demo"));
  if (!demo) throw new Error("Demo not found.");
  await demo.mount(document.querySelector("#stage"));
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  if (!p5Started && !window.__sketchCapture.error) {
    if (!document.querySelector("#stage canvas"))
      throw new Error("The sketch did not create a canvas.");
    window.__sketchCapture = { ready: true };
  }
}
render().catch(fail);
