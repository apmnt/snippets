import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./style.css";
import { demos as initialDemos } from "./demos.js";

const select = document.querySelector("#demo");
const stage = document.querySelector("#stage");
const error = document.querySelector("#error");
let cleanup;
let demos = initialDemos;

function updateDemos(nextDemos) {
  const selected = select.value;
  demos = nextDemos;
  select.replaceChildren();
  for (const demo of demos) {
    select.add(new Option(demo.title, demo.id));
  }
  if (demos.some((demo) => demo.id === selected)) select.value = selected;
  select.disabled = demos.length === 0;
  document.querySelector("#restart").disabled = demos.length === 0;
  showDemo();
}

function showDemo() {
  cleanup?.();
  cleanup = undefined;
  stage.replaceChildren();
  error.hidden = true;
  const demo = demos.find((item) => item.id === select.value);
  if (!demo) {
    document.querySelector("#description").textContent =
      "Add a JavaScript file to src/demos to get started.";
    document.querySelector("#source").textContent = "";
    return;
  }
  document.querySelector("#description").textContent = demo.description;
  document.querySelector("#source").textContent = demo.code;

  try {
    cleanup = demo.mount(stage);
  } catch (cause) {
    error.textContent = `Could not start this demo: ${cause.message}`;
    error.hidden = false;
    console.error(cause);
  }
}

select.addEventListener("change", showDemo);
document.querySelector("#restart").addEventListener("click", showDemo);
updateDemos(demos);

if (import.meta.hot) {
  import.meta.hot.accept("./demos.js", (module) => {
    if (module) updateDemos(module.demos);
  });
  import.meta.hot.dispose(() => cleanup?.());
}
