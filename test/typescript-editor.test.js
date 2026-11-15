import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { build } from "vite";
import { TypeScriptWorker } from "../node_modules/monaco-editor/esm/vs/languages/features/typescript/tsWorker.js";
import { typescript as ts } from "../node_modules/monaco-editor/esm/vs/languages/features/typescript/lib/typescriptServices.js";
import { sketchError, sketchSource } from "../src/sketch-errors.js";

// Exercise the exact library files Vite bundles for the browser's worker.
const result = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    write: false,
    minify: false,
    lib: { entry: "src/editor-libraries.js", formats: ["es"] },
  },
});
const bundle = Array.isArray(result) ? result[0] : result;
const { editorLibraries } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      bundle.output.find((file) => file.type === "chunk").code,
    ).toString("base64")
);

function createWorker(source, extension = "ts") {
  const file = `file:///src/demos/test.${extension}`;
  const worker = new TypeScriptWorker(
    {
      getMirrorModels: () => [
        {
          uri: { path: `/src/demos/test.${extension}`, toString: () => file },
          version: 1,
          getValue: () => source,
        },
      ],
    },
    {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        allowJs: true,
        allowSyntheticDefaultImports: true,
        allowNonTsExtensions: true,
        strict: true,
        skipLibCheck: true,
        sourceMap: true,
        noEmit: false,
        noEmitOnError: false,
      },
      extraLibs: Object.fromEntries(
        Object.entries(editorLibraries).map(([name, content]) => [
          name,
          { content, version: 1 },
        ]),
      ),
    },
  );
  return { worker, file };
}

test("TypeScript worker reports type errors and infers p5 API types", async () => {
  const source = `import { p5Demo } from "../p5-demo.js";
import { createHelper } from "../helper.js";
type Point = [number, number];
const point: Point = [1, "wrong"];
export default p5Demo((p) => {
  p.circle("wrong", 20, 30);
  const helper = createHelper(p);
  helper.palette("red", { spread: "wrong" });
});`;
  const { worker, file } = createWorker(source);
  try {
    assert.equal((await worker.getSyntacticDiagnostics(file)).length, 0);
    const diagnostics = await worker.getSemanticDiagnostics(file);
    assert.ok(
      diagnostics.some(
        (item) =>
          item.code === 2322 && item.start === source.indexOf('"wrong"'),
      ),
    );
    assert.ok(diagnostics.some((item) => item.code === 2345));
    assert.ok(diagnostics.filter((item) => item.category === 1).length >= 3);
    const suggestions = await worker.getCompletionsAtPosition(
      file,
      source.indexOf("p.circle") + 2,
    );
    assert.ok(suggestions.entries.some((item) => item.name === "createVector"));
    const output = await worker.getEmitOutput(file);
    assert.equal(output.emitSkipped, false);
    assert.ok(output.outputFiles.some((item) => item.name.endsWith(".js.map")));
  } finally {
    worker.getLanguageService().dispose();
  }
});

test("runtime errors map to original TypeScript lines after types are erased", async () => {
  const source = `type Point = [number, number];
interface Options {
  radius: number;
}

export default function mount() {
  const position: Point = [10, 20];
  const options: Options = { radius: 4 };
  throw new Error("typed runtime error");
}`;
  const { worker, file } = createWorker(source);
  try {
    const output = await worker.getEmitOutput(file);
    const script = output.outputFiles.find((item) =>
      item.name.endsWith(".js"),
    ).text;
    const map = output.outputFiles.find((item) =>
      item.name.endsWith(".js.map"),
    ).text;
    const code =
      script.replace(/^\/\/# sourceMappingURL=.*$/gm, "") +
      `\n//# sourceURL=${sketchSource}`;
    const module = await import(
      "data:text/javascript;base64," + Buffer.from(code).toString("base64")
    );
    try {
      module.default();
      assert.fail("Expected a runtime error");
    } catch (cause) {
      const error = sketchError(cause, undefined, map);
      assert.equal(error.message, "typed runtime error");
      assert.equal(error.line, 9);
      assert.ok(error.column > 0);
    }
  } finally {
    worker.getLanguageService().dispose();
  }
});

test("JavaScript remains valid in the same virtual project", async () => {
  const source =
    'import {p5Demo} from "../p5-demo.js"; export default p5Demo(p => { p.circle(10, 20, 30); });';
  const { worker, file } = createWorker(source, "js");
  try {
    assert.equal((await worker.getSyntacticDiagnostics(file)).length, 0);
    const suggestions = await worker.getCompletionsAtPosition(
      file,
      source.indexOf("p.circle") + 2,
    );
    assert.ok(suggestions.entries.some((item) => item.name === "createVector"));
  } finally {
    worker.getLanguageService().dispose();
  }
});

test("a .ts file must compile even if the editor falls back to plaintext", async () => {
  const source =
    'import type p5 from "p5";\nlet point: p5.Vector;\nexport default function mount() {}';
  const { worker, file } = createWorker(source);
  const model = {
    getLanguageId: () => "plaintext",
    getValue: () => source,
    uri: { path: "/src/demos/test.ts", toString: () => file },
  };
  // Load the actual orchestration functions without browser-only imports.
  const editorSource = fs
    .readFileSync("src/editor.js", "utf8")
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/^export /gm, "");
  const { getPreviewSource } = new Function(
    "getTypeScriptWorker",
    "getJavaScriptWorker",
    "self",
    editorSource + "\nreturn { getPreviewSource };",
  )(
    async () => async () => worker,
    () => {
      throw new Error("Wrong worker selected for a .ts file");
    },
    {},
  );
  try {
    const output = await getPreviewSource({ getModel: () => model });
    assert.doesNotMatch(output.code, /import type|: p5\.Vector/);
    assert.ok(output.sourceMap);
    // A worker failure must reject instead of returning raw TypeScript.
    const failedWorker = worker.getEmitOutput;
    worker.getEmitOutput = async () => {
      throw new Error("Compiler unavailable");
    };
    await assert.rejects(
      getPreviewSource({ getModel: () => model }),
      /Compiler unavailable/,
    );
    worker.getEmitOutput = failedWorker;
  } finally {
    worker.getLanguageService().dispose();
  }
});
