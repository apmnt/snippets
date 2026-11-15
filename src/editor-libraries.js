import p5DemoSource from "./p5-demo.js?raw";
import helperSource from "./helper.js?raw";

// Keep package paths intact so p5's declaration imports and references resolve.
// exhaustive includes these explicitly selected files inside node_modules.
const p5Types = import.meta.glob(
  [
    "../node_modules/@types/p5/*.d.ts",
    "../node_modules/@types/p5/src/**/*.d.ts",
  ],
  { eager: true, query: "?raw", import: "default", exhaustive: true },
);

export const editorLibraries = {
  ...Object.fromEntries(
    Object.entries(p5Types).map(([path, source]) => [
      `file:///${path.slice(3)}`,
      source,
    ]),
  ),
  "file:///src/p5-demo.js": p5DemoSource,
  "file:///src/helper.js": helperSource,
};
