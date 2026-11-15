# Snippets

A tiny vanilla JavaScript playground for p5.js and other browser demos. Inter is bundled locally. Switching demos removes the old instance without reloading the page.

```sh
npm install
npm run dev
```

`npm run build` creates a static site in `dist/`. `npm run preview` serves that build.

## Live editing

The Monaco editor shows the selected demo's JavaScript. Edits rerun the sketch
after a 450 ms pause, in a fresh iframe that clears the previous run's animations
and listeners. Syntax and runtime errors appear below the preview; fixing the code
runs it again. **Restart** reruns the current code; **Reset code** restores the demo
from disk. Edits are kept per demo in memory until the page reloads and do not
modify source files.

The live editor supports imports from `"../p5-demo.js"` and `"p5"`, plus demos
using browser APIs directly. Other module imports display an error; bundle any
additional libraries into `src/preview.js` and add a bridge for them to enable
them in the editor. The iframe manages each run's lifecycle; it is not a security
sandbox for untrusted code.

## Add a p5.js demo

Create `src/demos/example.js`:

```js
import { p5Demo } from "../p5-demo.js";

export const meta = {
  title: "Example",
  description: "A circle.",
  order: 5,
};

export default p5Demo((p) => {
  // The helper creates and resizes the canvas for you.
  p.setup = () => p.noStroke();
  p.draw = () => {
    p.background(240);
    p.circle(p.width / 2, p.height / 2, 50);
  };
});
```

Every `src/demos/*.js` file with a default function export is discovered automatically, along with its source code. The dropdown updates during development without reloading the page.

The `meta` export is optional. `title` defaults to the filename with hyphens and underscores replaced by spaces; `description` defaults to empty. `order` is an optional number: lower values appear first, followed by unordered demos alphabetically by title. The filename is the demo's unique ID.

## Other libraries

A demo just exports `mount(container)`, returning a cleanup function. Create your DOM or canvas inside the container, then remove listeners, stop animations, and release resources in cleanup. See `src/demos/canvas.js` for an example. Keep demo state inside `mount` so restarting creates a fresh instance.
