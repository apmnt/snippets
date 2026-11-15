import p5 from "p5";
import { init, parse } from "es-module-lexer";
import { p5Demo } from "./p5-demo.js";
import { sketchError, sketchSource, sourcePosition } from "./sketch-errors.js";

// These libraries are bundled by Vite; edited modules import them through a
// small bridge, so the same source works in development and static builds.
window.__sketchLibraries = { p5, p5Demo };
const bridge = URL.createObjectURL(
  new Blob(
    [
      "export const p5Demo = window.__sketchLibraries.p5Demo;\n" +
        "export default window.__sketchLibraries.p5;",
    ],
    { type: "text/javascript" },
  ),
);

function report(type, details = {}) {
  parent.postMessage({ type, ...details }, location.origin);
}

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
      if (!["../p5-demo.js", "p5"].includes(entry.specifier)) {
        const cause = new Error(
          `Unsupported import: ${entry.specifier ?? "dynamic expression"}. Use "p5" or "../p5-demo.js" in the live editor.`,
        );
        cause.sketchPosition = sourcePosition(event.data.code, entry.start);
        throw cause;
      }
      const replacement =
        entry.type === "dynamic" ? JSON.stringify(bridge) : bridge;
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
