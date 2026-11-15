import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs
  .readFileSync("src/main.js", "utf8")
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replaceAll("import.meta.env.BASE_URL", '"/"')
  .replaceAll("import.meta.hot", "hot");

function boot(href, demos) {
  const elements = new Map();
  class Element {
    constructor() {
      this.value = "";
      this.events = new Map();
      this.children = [];
    }
    addEventListener(name, callback) {
      this.events.set(name, callback);
    }
    replaceChildren(...children) {
      this.children = children;
      this.value = "";
    }
    add(option) {
      this.children.push(option);
      if (!this.value) this.value = option.value;
    }
    remove() {}
  }
  for (const id of [
    "demo",
    "stage",
    "preview-error",
    "console-logs",
    "status",
    "reset",
    "editor",
    "editor-language",
    "description",
    "restart",
    "format",
    "toggle-type-hints",
  ])
    elements.set(`#${id}`, new Element());
  const window = {
    location: new URL(href),
    addEventListener() {},
    removeEventListener() {},
    history: {
      state: { existing: true },
      replaceState(state, _, url) {
        this.state = state;
        window.location = new URL(url);
      },
    },
  };
  let change;
  let code = "";
  const editor = {
    getValue: () => code,
    onDidChangeModelContent(callback) {
      change = callback;
      return { dispose() {} };
    },
    getModel: () => ({ dispose() {} }),
    dispose() {},
  };
  let update;
  let dispose;
  const document = {
    querySelector: (id) => elements.get(id),
    createElement: () =>
      Object.assign(new Element(), { contentWindow: { postMessage() {} } }),
  };
  const hot = {
    accept(_, callback) {
      update = callback;
    },
    dispose(callback) {
      dispose = callback;
    },
  };
  new Function(
    "document",
    "window",
    "location",
    "initialDemos",
    "createEditor",
    "getSyntaxError",
    "setSketchError",
    "setEditorSource",
    "getPreviewSource",
    "Option",
    "hot",
    appSource,
  )(
    document,
    window,
    window.location,
    demos,
    () => editor,
    async () => undefined,
    () => {},
    (_, next) => {
      code = next;
      change?.();
    },
    async () => ({ code }),
    function Option(title, value) {
      this.title = title;
      this.value = value;
    },
    hot,
  );
  return {
    window,
    elements,
    code: () => code,
    edit(next) {
      code = next;
      change();
    },
    select(id) {
      const select = elements.get("#demo");
      select.value = id;
      select.events.get("change")();
    },
    update(demos) {
      update({ demos });
    },
    close() {
      dispose();
    },
  };
}

const demos = [
  {
    id: "waves.js",
    filename: "waves.js",
    title: "Waves",
    language: "javascript",
    code: "waves v1",
  },
  {
    id: "ioc-stack.ts",
    filename: "ioc-stack.ts",
    title: "Stack",
    language: "typescript",
    code: "stack v1",
  },
];

test("selected demo survives a full reload and preserves other URL state", () => {
  const app = boot("http://localhost/?theme=light#editor", demos);
  app.select("ioc-stack.ts");
  assert.equal(app.window.location.searchParams.get("demo"), "ioc-stack.ts");
  assert.equal(app.window.location.searchParams.get("theme"), "light");
  assert.equal(app.window.location.hash, "#editor");
  assert.deepEqual(app.window.history.state, { existing: true });
  const href = app.window.location.href;
  app.close();
  const reloaded = boot(href, demos);
  assert.equal(reloaded.elements.get("#demo").value, "ioc-stack.ts");
  assert.equal(reloaded.code(), "stack v1");
  reloaded.close();
});

test("saved file changes refresh the selected source while unrelated updates keep drafts", () => {
  const app = boot("http://localhost/?demo=ioc-stack.ts", demos);
  app.edit("browser draft");
  app.update([{ ...demos[0], code: "waves v2" }, demos[1]]);
  assert.equal(app.code(), "browser draft");
  app.update([
    { ...demos[1], code: "stack v2" },
    { ...demos[0], code: "waves v2" },
  ]);
  assert.equal(app.elements.get("#demo").value, "ioc-stack.ts");
  assert.equal(app.code(), "stack v2");
  app.close();
});

test("missing or removed selections fall back to an available demo", () => {
  const app = boot("http://localhost/?demo=missing.ts", demos);
  assert.equal(app.code(), "waves v1");
  assert.equal(app.window.location.searchParams.get("demo"), "waves.js");
  app.select("ioc-stack.ts");
  app.update([demos[0]]);
  assert.equal(app.code(), "waves v1");
  app.update([]);
  assert.equal(app.window.location.searchParams.has("demo"), false);
  app.close();
});
