import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Vercel checks the filesystem before ordinary rewrites. The built index.html
// would hide the share handler, even though direct /api/share tests pass.
test("share routes precede filesystem matching on Vercel", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  for (const pathname of ["/", "/index.html"]) {
    const route = config.routes.find(
      (entry) => entry.handle || new RegExp(entry.src).test(pathname),
    );
    assert.equal(route.dest, "/api/share", pathname);
  }
  for (const pathname of [
    "/gallery.html",
    "/render.html",
    "/assets/main.js",
    "/api/sketch-image",
    "/indexXhtml",
  ]) {
    const route = config.routes.find(
      (entry) => entry.handle || new RegExp(entry.src).test(pathname),
    );
    assert.equal(route.handle, "filesystem", pathname);
  }
});
