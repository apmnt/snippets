import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/language/typescript/monaco.contribution.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

self.MonacoEnvironment = {
  getWorker(_, label) {
    return label === "javascript" || label === "typescript"
      ? new TypeScriptWorker()
      : new EditorWorker();
  },
};

export function createEditor(container) {
  return monaco.editor.create(container, {
    value: "",
    language: "javascript",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: { top: 16, bottom: 16 },
    ariaLabel: "Sketch JavaScript source",
  });
}
