import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./style.css";
import { demos as initialDemos } from "./demos.js";
import { createEditor } from "./editor.js";

const select = document.querySelector("#demo");
const stage = document.querySelector("#stage");
const error = document.querySelector("#error");
const status = document.querySelector("#status");
const reset = document.querySelector("#reset");
const editor = createEditor(document.querySelector("#editor"));
const drafts = new Map();
let demos = initialDemos;
let preview;
let previewCode;
let pending;
let changingDemo = false;

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
  showDemo();
}

function runPreview() {
  clearTimeout(pending);
  error.hidden = true;
  status.textContent = "Running…";
  previewCode = editor.getValue();
  preview = document.createElement("iframe");
  preview.title = "Live sketch preview";
  preview.src = `${import.meta.env.BASE_URL}preview.html`;
  stage.replaceChildren(preview);
}

function showDemo() {
  clearTimeout(pending);
  const demo = demos.find((item) => item.id === select.value);
  changingDemo = true;
  editor.setValue(demo ? (drafts.get(demo.id) ?? demo.code) : "");
  changingDemo = false;
  document.querySelector("#description").textContent =
    demo?.description ?? "Add a JavaScript file to src/demos to get started.";
  if (demo) {
    runPreview();
  } else {
    preview = undefined;
    stage.replaceChildren();
    error.hidden = true;
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
      { type: "run-sketch", code: previewCode },
      location.origin,
    );
  } else if (event.data?.type === "sketch-ready") {
    // An animation can throw before setup finishes; retain that error.
    if (error.hidden) status.textContent = "Live preview";
  } else if (event.data?.type === "sketch-error") {
    error.textContent = event.data.message;
    error.hidden = false;
    status.textContent = "Check your code";
  }
}

const changes = editor.onDidChangeModelContent(() => {
  if (changingDemo || !select.value) return;
  drafts.set(select.value, editor.getValue());
  clearTimeout(pending);
  status.textContent = "Waiting for edits…";
  pending = setTimeout(runPreview, 450);
});

window.addEventListener("message", onPreviewMessage);
select.addEventListener("change", showDemo);
document.querySelector("#restart").addEventListener("click", runPreview);
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
    window.removeEventListener("message", onPreviewMessage);
    preview?.remove();
    changes.dispose();
    const model = editor.getModel();
    editor.dispose();
    model?.dispose();
  });
}
