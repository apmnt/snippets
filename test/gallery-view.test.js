import assert from "node:assert/strict";
import test from "node:test";
import { createGallery } from "../src/gallery-view.js";

function environment() {
  const listeners = new Map();
  const window = {
    location: { origin: "http://localhost" },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  };
  const document = {
    defaultView: window,
    createElement: (tag) => new Element(tag),
  };
  class Element {
    constructor(tag) {
      this.tagName = tag;
      this.ownerDocument = document;
      this.children = [];
      this.dataset = {};
      this.events = new Map();
      this.attributes = new Map();
      if (tag === "iframe")
        this.contentWindow = {
          messages: [],
          postMessage(data, origin) {
            this.messages.push({ data, origin });
          },
        };
    }
    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
    addEventListener(name, callback) {
      this.events.set(name, callback);
    }
    append(...children) {
      this.children.push(...children);
    }
    replaceChildren(...children) {
      this.children = children;
    }
    querySelector(selector) {
      return this.children.find((child) => `.${child.className}` === selector);
    }
  }
  return {
    container: document.createElement("div"),
    listeners,
    send(frame, data, origin = window.location.origin) {
      listeners.get("message")?.({ origin, source: frame.contentWindow, data });
    },
  };
}

const demos = [
  {
    id: "first.ts",
    title: "First",
    description: "First description",
    order: 1,
  },
  {
    id: "second.js",
    title: "Second",
    description: "Second description",
    order: 2,
  },
];

test("gallery preserves metadata order and only renders canvas frames, descriptions, and redraw buttons", () => {
  const { container } = environment();
  const gallery = createGallery(container, "/preview.html");
  gallery.update(demos);
  assert.deepEqual(
    container.children.map((card) => card.dataset.demo),
    ["first.ts", "second.js"],
  );
  const [stage, footer] = container.children[0].children;
  assert.equal(stage.children[0].src, "/preview.html");
  assert.equal(stage.children[0].title, "First canvas");
  assert.equal(footer.children[0].textContent, "First description");
  assert.equal(footer.children[1].textContent, "Redraw");
});

test("redraw replaces only its own frame and rejects old frames or other origins", () => {
  const env = environment();
  const gallery = createGallery(env.container, "/preview.html");
  gallery.update(demos);
  const first = env.container.children[0];
  const secondFrame = env.container.children[1].children[0].children[0];
  const oldFrame = first.children[0].children[0];
  env.send(oldFrame, { type: "preview-ready" }, "https://elsewhere.example");
  assert.equal(oldFrame.contentWindow.messages.length, 0);
  env.send(oldFrame, { type: "preview-ready" });
  assert.deepEqual(oldFrame.contentWindow.messages[0].data, {
    type: "run-demo",
    id: "first.ts",
  });
  first.children[1].children[1].events.get("click")();
  const newFrame = first.children[0].children[0];
  assert.notEqual(newFrame, oldFrame);
  assert.equal(env.container.children[1].children[0].children[0], secondFrame);
  env.send(oldFrame, { type: "preview-ready" });
  assert.equal(oldFrame.contentWindow.messages.length, 1);
  env.send(newFrame, { type: "preview-ready" });
  assert.equal(newFrame.contentWindow.messages[0].data.id, "first.ts");
});

test("metadata updates refresh descriptions and disposal removes frames and listeners", () => {
  const env = environment();
  const gallery = createGallery(env.container, "/preview.html");
  gallery.update(demos);
  gallery.update([{ ...demos[1], description: "Updated description" }]);
  assert.equal(env.container.children.length, 1);
  assert.equal(
    env.container.children[0].children[1].children[0].textContent,
    "Updated description",
  );
  gallery.update([]);
  assert.match(env.container.children[0].textContent, /Add a demo/);
  gallery.dispose();
  assert.equal(env.container.children.length, 0);
  assert.equal(env.listeners.has("message"), false);
});
