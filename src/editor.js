import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/editor/contrib/wordHighlighter/browser/wordHighlighter.js";
import "monaco-editor/editor/contrib/multicursor/browser/multicursor.js";
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/editor/contrib/parameterHints/browser/parameterHints.js";
import "monaco-editor/editor/contrib/inlayHints/browser/inlayHintsContribution.js";
import {
  getJavaScriptWorker,
  getTypeScriptWorker,
  javascriptDefaults,
  typescriptDefaults,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
} from "monaco-editor/language/typescript/monaco.contribution.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/typescript/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import formatOptions from "../.prettierrc.json";
import { editorLibraries } from "./editor-libraries.js";

let formatter;

function isTypeScript(model) {
  return (
    model.getLanguageId() === "typescript" || model.uri.path.endsWith(".ts")
  );
}

async function getLanguageWorker(model) {
  const getWorker = isTypeScript(model)
    ? getTypeScriptWorker
    : getJavaScriptWorker;
  return (await getWorker())(model.uri);
}

export function setEditorSource(editor, source, filename = "sketch.js") {
  const language = filename.endsWith(".ts") ? "typescript" : "javascript";
  const uri = monaco.Uri.parse(`file:///src/demos/${filename}`);
  const previous = editor.getModel();
  if (previous?.uri.toString() === uri.toString()) {
    previous.setValue(source);
  } else {
    editor.setModel(monaco.editor.createModel(source, language, uri));
    previous?.dispose();
  }
  editor.updateOptions({
    ariaLabel: `Sketch ${language === "typescript" ? "TypeScript" : "JavaScript"} source`,
  });
}

export async function getPreviewSource(editor) {
  const model = editor.getModel();
  if (!isTypeScript(model)) return { code: model.getValue() };
  const worker = await getLanguageWorker(model);
  const output = await worker.getEmitOutput(model.uri.toString());
  const script = output.outputFiles.find((file) => file.name.endsWith(".js"));
  if (output.emitSkipped || !script)
    throw new Error("TypeScript compilation failed.");
  return {
    code: script.text.replace(/^\/\/# sourceMappingURL=.*$/gm, ""),
    sourceMap: output.outputFiles.find((file) => file.name.endsWith(".js.map"))
      ?.text,
  };
}

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
  const worker = await getLanguageWorker(model);
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
      import("prettier/plugins/typescript"),
    ]);
    const [prettier, babel, estree, typescript] = await formatter;
    const result = await prettier.formatWithCursor(source, {
      ...formatOptions,
      parser: isTypeScript(model) ? "typescript" : "babel",
      plugins: [babel.default, estree.default, typescript.default],
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
    // Incomplete code stays editable until the syntax is fixed.
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
  typescriptDefaults.setDiagnosticsOptions({
    ...typescriptDefaults.getDiagnosticsOptions(),
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });
  const defaults = [javascriptDefaults, typescriptDefaults];
  for (const settings of defaults) {
    settings.setCompilerOptions({
      ...settings.getCompilerOptions(),
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      checkJs: false,
      strict: settings === typescriptDefaults,
      skipLibCheck: true,
      noEmit: false,
      noEmitOnError: false,
      sourceMap: true,
    });
    settings.setInlayHintsOptions({
      includeInlayParameterNameHints: "all",
      includeInlayFunctionParameterTypeHints: true,
      includeInlayVariableTypeHints: true,
      includeInlayPropertyDeclarationTypeHints: true,
      includeInlayFunctionLikeReturnTypeHints: true,
      includeInlayEnumMemberValueHints: true,
    });
  }
  const libraries = defaults.flatMap((settings) =>
    Object.entries(editorLibraries).map(([path, source]) =>
      settings.addExtraLib(source, path),
    ),
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
    inlayHints: { enabled: "off" },
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
