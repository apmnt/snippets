import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/editor/contrib/wordHighlighter/browser/wordHighlighter.js";
import "monaco-editor/editor/contrib/multicursor/browser/multicursor.js";
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/editor/contrib/parameterHints/browser/parameterHints.js";
import {
  getJavaScriptWorker,
  javascriptDefaults,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
} from "monaco-editor/language/typescript/monaco.contribution.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import formatOptions from "../.prettierrc.json";
import { editorLibraries } from "./editor-libraries.js";

let formatter;

export function setSketchError(editor, error) {
  const model = editor.getModel();
  if (!model) return;
  const line = Math.min(error?.line ?? 1, model.getLineCount());
  monaco.editor.setModelMarkers(
    model,
    "sketch",
    error?.line
      ? [
          {
            severity: monaco.MarkerSeverity.Error,
            message: error.message,
            source: "Sketch",
            startLineNumber: line,
            startColumn: error.column ?? 1,
            endLineNumber: line,
            endColumn: model.getLineMaxColumn(line),
          },
        ]
      : [],
  );
}

export async function getSyntaxError(editor) {
  const model = editor.getModel();
  const worker = await (await getJavaScriptWorker())(model.uri);
  const diagnostics = await worker.getSyntacticDiagnostics(
    model.uri.toString(),
  );
  const diagnostic = diagnostics.find((item) => item.category === 1);
  if (!diagnostic) return;
  const position = model.getPositionAt(diagnostic.start ?? 0);
  const flattenMessage = (message) =>
    typeof message === "string"
      ? message
      : [message.messageText, ...(message.next ?? []).map(flattenMessage)].join(
          " ",
        );
  return {
    message: flattenMessage(diagnostic.messageText),
    line: position.lineNumber,
    column: position.column,
  };
}

async function formatCode(editor) {
  const model = editor.getModel();
  if (!model || model.isDisposed()) return false;
  const version = model.getVersionId();
  const source = model.getValue();
  const position = editor.getPosition();
  const cursorOffset = position ? model.getOffsetAt(position) : 0;
  try {
    formatter ??= Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);
    const [prettier, babel, estree] = await formatter;
    const result = await prettier.formatWithCursor(source, {
      ...formatOptions,
      parser: "babel",
      plugins: [babel.default, estree.default],
      cursorOffset,
    });
    // Formatting can finish after another edit or a demo change.
    if (
      model.isDisposed() ||
      editor.getModel() !== model ||
      model.getVersionId() !== version
    )
      return true;
    if (result.formatted !== source) {
      editor.pushUndoStop();
      editor.executeEdits("prettier", [
        { range: model.getFullModelRange(), text: result.formatted },
      ]);
      editor.setPosition(model.getPositionAt(result.cursorOffset));
      editor.pushUndoStop();
    }
    return true;
  } catch {
    // Incomplete JavaScript stays editable until the syntax is fixed.
    return false;
  }
}

self.MonacoEnvironment = {
  getWorker(_, label) {
    return label === "javascript" || label === "typescript"
      ? new TypeScriptWorker()
      : new EditorWorker();
  },
};

export function createEditor(container) {
  javascriptDefaults.setCompilerOptions({
    ...javascriptDefaults.getCompilerOptions(),
    target: ScriptTarget.ESNext,
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.NodeJs,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    checkJs: false,
  });
  const libraries = Object.entries(editorLibraries).map(([path, source]) =>
    javascriptDefaults.addExtraLib(source, path),
  );
  const editor = monaco.editor.create(container, {
    model: monaco.editor.createModel(
      "",
      "javascript",
      monaco.Uri.parse("file:///src/demos/sketch.js"),
    ),
    automaticLayout: true,
    quickSuggestions: { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: true,
    hover: { enabled: true },
    parameterHints: { enabled: true },
    occurrencesHighlight: "singleFile",
    selectionHighlight: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: { top: 16, bottom: 16 },
    ariaLabel: "Sketch JavaScript source",
  });
  editor.onDidDispose(() => libraries.forEach((library) => library.dispose()));
  editor.addAction({
    id: "format-code",
    label: "Format code",
    keybindings: [
      monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    ],
    contextMenuGroupId: "1_modification",
    run: () => formatCode(editor),
  });
  editor.onDidBlurEditorText(() => void formatCode(editor));
  return editor;
}
