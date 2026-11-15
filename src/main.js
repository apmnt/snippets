import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./style.css";
import { demos as initialDemos } from "./demos.js";
import {
  createEditor,
  getSyntaxError,
  setSketchError,
  setEditorSource,
  getPreviewSource,
} from "./editor.js";

const select = document.querySelector("#demo");
const stage = document.querySelector("#stage");
const previewError = document.querySelector("#preview-error");
const consoleLogs = document.querySelector("#console-logs");
const status = document.querySelector("#status");
const reset = document.querySelector("#reset");
const editor = createEditor(document.querySelector("#editor"));
const drafts = new Map();
let demos = initialDemos;
let preview;
let previewCode;
let previewSource;
let pending;
let changingDemo = false;
let runVersion = 0;

function showError(details) {
  previewError.textContent = details.line
    ? `Line ${details.line}: ${details.message}`
    : details.message;
  previewError.hidden = false;
  status.textContent = details.line
    ? `Error on line ${details.line}`
    : "Check your code";
  setSketchError(editor, details);
}

function clearError() {
  previewError.hidden = true;
  setSketchError(editor);
}

function updateDemos(nextDemos) {
  const selected = select.value;
  // Refresh untouched demos from disk, keeping edits made in the browser.
  for (const demo of demos) {
    if (drafts.get(demo.id) === demo.code) drafts.delete(demo.id);
  }
  demos = nextDemos;
  select.replaceChildren();
  for (const demo of demos) {
    select.add(new Option(demo.title, demo.id));
  }
  if (demos.some((demo) => demo.id === selected)) select.value = selected;
  select.disabled = demos.length === 0;
  document.querySelector("#restart").disabled = demos.length === 0;
  reset.disabled = demos.length === 0;
  document.querySelector("#format").disabled = demos.length === 0;
  showDemo();
}

async function runPreview() {
  clearTimeout(pending);
  const version = ++runVersion;
  consoleLogs.replaceChildren();
  clearError();
  status.textContent = "Running…";
  previewCode = editor.getValue();
  preview = undefined;
  stage.replaceChildren();
  try {
    const syntaxError = await getSyntaxError(editor);
    if (version !== runVersion) return;
    if (syntaxError) {
      showError(syntaxError);
      return;
    }
  } catch {
    // A worker failure must not prevent the preview from running.
    if (version !== runVersion) return;
  }
  try {
    const source = await getPreviewSource(editor);
    if (version !== runVersion) return;
    previewSource = source;
  } catch (cause) {
    if (version !== runVersion) return;
    showError({ message: cause.message });
    return;
  }
  preview = document.createElement("iframe");
  preview.title = "Live sketch preview";
  preview.src = `${import.meta.env.BASE_URL}preview.html`;
  stage.replaceChildren(preview);
}

function showDemo() {
  ++runVersion;
  consoleLogs.replaceChildren();
  clearError();
  clearTimeout(pending);
  const demo = demos.find((item) => item.id === select.value);
  changingDemo = true;
  setEditorSource(
    editor,
    demo ? (drafts.get(demo.id) ?? demo.code) : "",
    demo?.filename,
  );
  changingDemo = false;
  document.querySelector("#editor-language").textContent =
    demo?.language === "typescript" ? "TypeScript" : "JavaScript";
  document.querySelector("#description").textContent =
    demo?.description ??
    "Add a JavaScript or TypeScript file to src/demos to get started.";
  if (demo) {
    runPreview();
  } else {
    preview = undefined;
    stage.replaceChildren();
    status.textContent = "No demos";
  }
}

function onPreviewMessage(event) {
  if (
    event.source !== preview?.contentWindow ||
    event.origin !== location.origin
  )
    return;
  if (event.data?.type === "preview-ready") {
    preview.contentWindow.postMessage(
      { type: "run-sketch", ...previewSource },
      location.origin,
    );
  } else if (event.data?.type === "sketch-ready") {
    // An animation can throw before setup finishes; retain that error.
    if (previewError.hidden) status.textContent = "Live preview";
  } else if (event.data?.type === "sketch-log") {
    if (editor.getValue() !== previewCode) return;
    if (typeof event.data.text !== "string") return;
    const follow =
      consoleLogs.scrollTop + consoleLogs.clientHeight >=
      consoleLogs.scrollHeight - 8;
    const row = document.createElement("div");
    row.textContent = event.data.text;
    consoleLogs.append(row);
    while (consoleLogs.childElementCount > 100)
      consoleLogs.firstElementChild.remove();
    if (follow) consoleLogs.scrollTop = consoleLogs.scrollHeight;
  } else if (event.data?.type === "sketch-error") {
    if (editor.getValue() === previewCode) showError(event.data);
  }
}

const changes = editor.onDidChangeModelContent(() => {
  if (changingDemo || !select.value) return;
  ++runVersion;
  clearError();
  drafts.set(select.value, editor.getValue());
  clearTimeout(pending);
  status.textContent = "Waiting for edits…";
  pending = setTimeout(runPreview, 450);
});

window.addEventListener("message", onPreviewMessage);
select.addEventListener("change", showDemo);
document.querySelector("#restart").addEventListener("click", runPreview);
document.querySelector("#format").addEventListener("click", async () => {
  const formatted = await editor.getAction("format-code").run();
  if (!formatted) status.textContent = "Couldn't format. Check syntax.";
  editor.focus();
});
reset.addEventListener("click", () => {
  drafts.delete(select.value);
  showDemo();
});
updateDemos(demos);

if (import.meta.hot) {
  import.meta.hot.accept("./demos.js", (module) => {
    if (module) updateDemos(module.demos);
  });
  import.meta.hot.dispose(() => {
    clearTimeout(pending);
    ++runVersion;
    window.removeEventListener("message", onPreviewMessage);
    preview?.remove();
    changes.dispose();
    const model = editor.getModel();
    editor.dispose();
    model?.dispose();
  });
}
