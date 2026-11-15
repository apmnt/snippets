import p5DemoSource from "./p5-demo.js?raw";
import helperSource from "./helper.js?raw";
import helperColorsSource from "./helper-colors.js?raw";
import p5LocaleSource from "./p5-locale.js?raw";
import p5Types from "../node_modules/p5/types/p5.d.ts?raw";

export const editorLibraries = {
  // Monaco's virtual filesystem resolves bare imports through this entry point.
  "file:///node_modules/p5/index.d.ts": p5Types,
  "file:///src/p5-demo.js": p5DemoSource,
  "file:///src/p5-locale.js": p5LocaleSource,
  "file:///src/helper.js": helperSource,
  "file:///src/helper-colors.js": helperColorsSource,
};
