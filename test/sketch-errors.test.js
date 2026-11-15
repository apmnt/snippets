import assert from "node:assert/strict";
import test from "node:test";
import { sketchError, sourcePosition } from "../src/sketch-errors.js";

test("finds the edited source frame behind library frames", () => {
  const error = new Error("Drawing failed");
  error.stack =
    "Error: Drawing failed\n at library (p5.js:900:4)\n at draw (snippets-sketch.js:23:7)";
  assert.deepEqual(sketchError(error), { message: "Drawing failed", line: 23 });
});

test("keeps runtime stack line numbers from executed code", async () => {
  const code =
    '\n\nthrow new Error("Broken sketch");\n//# sourceURL=snippets-sketch.js';
  await assert.rejects(
    import(`data:text/javascript,${encodeURIComponent(code)}`),
    (error) => {
      assert.deepEqual(sketchError(error), {
        message: "Broken sketch",
        line: 3,
      });
      return true;
    },
  );
});

test("uses browser error locations when a stack is unavailable", () => {
  assert.deepEqual(
    sketchError("Oops", { filename: "snippets-sketch.js", lineno: 9 }),
    {
      message: "Oops",
      line: 9,
    },
  );
});

test("does not attribute library or locationless errors to a sketch line", () => {
  assert.deepEqual(
    sketchError(new Error("Library failed"), {
      filename: "p5.js",
      lineno: 900,
    }),
    {
      message: "Library failed",
    },
  );
  assert.deepEqual(sketchError("Rejected"), { message: "Rejected" });
});

test("reports unsupported import positions in the original source", () => {
  const source = '\n// Sketch\nimport x from "unknown";';
  const error = new Error("Unsupported import");
  error.sketchPosition = sourcePosition(source, source.indexOf("unknown"));
  assert.deepEqual(sketchError(error), {
    message: "Unsupported import",
    line: 3,
    column: 16,
  });
});
