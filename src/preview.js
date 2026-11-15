import p5 from "p5";
import { init, parse } from "es-module-lexer";
import { p5Demo } from "./p5-demo.js";

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

function report(type, message) {
  parent.postMessage({ type, message }, location.origin);
}

window.addEventListener("error", (event) => {
  report("sketch-error", event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  report("sketch-error", event.reason?.message ?? String(event.reason));
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
        throw new Error(
          `Unsupported import: ${entry.specifier ?? "dynamic expression"}. Use "p5" or "../p5-demo.js" in the live editor.`,
        );
      }
      const replacement =
        entry.type === "dynamic" ? JSON.stringify(bridge) : bridge;
      code = code.slice(0, entry.start) + replacement + code.slice(entry.end);
    }
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
    report("sketch-error", cause.message);
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
});

report("preview-ready");
