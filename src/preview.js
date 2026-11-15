import p5 from "p5";
import { init, parse } from "es-module-lexer";
import { p5Demo } from "./p5-demo.js";
import { createHelper } from "./helper.js";
import { sketchError, sketchSource, sourcePosition } from "./sketch-errors.js";
import { captureConsoleLogs } from "./preview-console.js";

// The global-name checker scans this loader's script tag, not the imported
// instance-mode sketch, and reports false collisions such as our local "code".
p5.disableSketchChecker = true;

// These libraries are bundled by Vite; edited modules import them through a
// small bridge, so the same source works in development and static builds.
window.__sketchLibraries = { p5, p5Demo, createHelper };
const bridge = URL.createObjectURL(
  new Blob(
    [
      "export const p5Demo = window.__sketchLibraries.p5Demo;\n" +
        "export default window.__sketchLibraries.p5;",
    ],
    { type: "text/javascript" },
  ),
);
const helperBridge = URL.createObjectURL(
  new Blob(
    ["export const createHelper = window.__sketchLibraries.createHelper;"],
    { type: "text/javascript" },
  ),
);
const bridges = new Map([
  ["p5", bridge],
  ["../p5-demo.js", bridge],
  ["../helper.js", helperBridge],
]);

function report(type, details = {}) {
  parent.postMessage({ type, ...details }, location.origin);
}

captureConsoleLogs(console, (text) => report("sketch-log", { text }));

window.addEventListener("error", (event) => {
  report("sketch-error", sketchError(event.error ?? event.message, event));
});
window.addEventListener("unhandledrejection", (event) => {
  report("sketch-error", sketchError(event.reason));
});

window.addEventListener("message", async (event) => {
  if (
    event.source !== parent ||
    event.origin !== location.origin ||
    event.data?.type !== "run-sketch"
  )
    return;

  let url;
  try {
    await init();
    let code = event.data.code;
    const [imports] = parse(code);
    for (const entry of imports.toReversed()) {
      if (entry.type === "import-meta") continue;
      if (!bridges.has(entry.specifier)) {
        const cause = new Error(
          `Unsupported import: ${entry.specifier ?? "dynamic expression"}. Supported imports: ${[...bridges.keys()].join(", ")}.`,
        );
        cause.sketchPosition = sourcePosition(event.data.code, entry.start);
        throw cause;
      }
      const replacement =
        entry.type === "dynamic"
          ? JSON.stringify(bridges.get(entry.specifier))
          : bridges.get(entry.specifier);
      // Keep original line numbers even for multiline dynamic imports.
      const newlines =
        code.slice(entry.start, entry.end).match(/\n/g)?.length ?? 0;
      code =
        code.slice(0, entry.start) +
        replacement +
        "\n".repeat(newlines) +
        code.slice(entry.end);
    }
    code += `\n//# sourceURL=${sketchSource}\n`;
    url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const module = await import(/* @vite-ignore */ url);
    if (typeof module.default !== "function") {
      throw new Error(
        "Export a default mount(container) function or p5Demo sketch.",
      );
    }
    module.default(document.querySelector("#stage"));
    report("sketch-ready");
  } catch (cause) {
    report("sketch-error", sketchError(cause));
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
});

report("preview-ready");
