import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/language/typescript/monaco.contribution.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import formatOptions from "../.prettierrc.json";

let formatter;

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
  const editor = monaco.editor.create(container, {
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
