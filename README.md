# Snippets

A tiny vanilla JavaScript playground for p5.js and other browser demos. Inter is bundled locally. Switching demos removes the old instance without reloading the page.

```sh
npm install
npm run dev
```

`npm run build` creates a static site in `dist/`. `npm run preview` serves that build.

## Live editing

The Monaco editor shows the selected demo's JavaScript and extends to the bottom
of the viewport alongside the preview on larger screens. Edits rerun the sketch
after a 450 ms pause, in a fresh iframe that clears the previous run's animations
and listeners. Syntax and runtime errors appear below the canvas with their source
line number and an underline in the code when a source location is available; fixing the code
runs it again. **Restart** reruns the current code; **Reset code** restores the demo
from disk. Edits are kept per demo in memory until the page reloads and do not
modify source files.

Code formats with the project's Prettier settings when you leave the editor.
Use **Format code**, **Alt+Shift+F**, or **Ctrl/Cmd+S** to format manually.
Formatting is undoable; code with syntax errors is left unchanged.

The live editor supports imports from `"../p5-demo.js"`, `"../helper.js"`, and `"p5"`, plus demos
using browser APIs directly. Other module imports display an error; bundle any
additional libraries into `src/preview.js` and add a bridge for them to enable
them in the editor. The iframe manages each run's lifecycle; it is not a security
sandbox for untrusted code.

## Add a p5.js demo

Create `src/demos/example.js`:

```js
import { p5Demo } from "../p5-demo.js";

export default p5Demo((p) => {
  // The helper creates and resizes the canvas for you.
  p.setup = () => p.noStroke();
  p.draw = () => {
    p.background(240);
    p.circle(p.width / 2, p.height / 2, 50);
  };
});
```

Every `src/demos/*.js` or `src/demos/*.ts` file with a default function export is discovered automatically, along with its source code. The dropdown updates during development without reloading the page.

Demo metadata lives in `src/demo-meta.js`, keyed by the full filename, including
its `.js` or `.ts` extension. For example, add this entry for the demo above:

```js
"example.js": {
  title: "Example",
  description: "A circle.",
  order: 5,
},
```

Metadata is optional. `title` defaults to the filename with hyphens and underscores
replaced by spaces; `description` defaults to empty. Lower `order` values appear
first, followed by unordered demos alphabetically by title. Metadata updates
refresh the dropdown during development.

## Drawing helpers

Import `createHelper` from `../helper.js` in a p5 demo. Create one helper per sketch,
then call its tools at the end of `p.draw()` to draw overlays above your artwork.
They use canvas coordinates (top left is 0, 0), follow canvas resizing, and restore
your drawing styles and transforms afterward. They work in the live editor too.

```js
import { p5Demo } from "../p5-demo.js";
import { createHelper } from "../helper.js";

export default p5Demo((p) => {
  const helper = createHelper(p);
  p.draw = () => {
    p.background(240);
    // Draw your sketch here, then overlays:
    helper.grid({ spacing: 50, labels: true });
    helper.axes();
    helper.point(120, 80, "target");
    helper.bounds(100, 60, 40, 40, { label: "hitbox" });
    helper.vector(120, 80, 40, 20, { label: "velocity" });
    helper.hud();
  };
});
```

Set `helper.enabled = false` to hide all overlays, or start disabled with
`createHelper(p, { enabled: false })`. The **Helper tools** demo shows every tool
and uses **D** to toggle them when the preview has keyboard focus.

| Tool                                   | Options                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `grid(options)`                        | `spacing` (50), `majorEvery` (5), `originX`, `originY` (0), `labels` (false), `color`, `majorColor` |
| `axes(options)`                        | `x`, `y` (canvas center), `xColor`, `yColor`; positive y points down                                |
| `point(x, y, label, options)`          | `color`, `size` (6); omit label to show coordinates                                                 |
| `bounds(x, y, width, height, options)` | `color`, `label`                                                                                    |
| `vector(x, y, dx, dy, options)`        | `color`, `scale` (1), `label`                                                                       |
| `hud(options)`                         | `x`, `y` (12), `mouse`, `fps` (both true)                                                           |

## Other libraries

A demo just exports `mount(container)`, returning a cleanup function. Create your DOM or canvas inside the container, then remove listeners, stop animations, and release resources in cleanup. See `src/demos/canvas.js` for an example. Keep demo state inside `mount` so restarting creates a fresh instance.
