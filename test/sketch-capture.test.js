import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { createManifest } from "../scripts/sketch-images.js";
import { renderSketchImage } from "../server/render-sketch.js";

test(
  "Chromium captures setup-only and animated sketches as PNGs",
  { timeout: 90000 },
  async (t) => {
    const server = await createServer({
      server: { host: "127.0.0.1", port: 0 },
    });
    await server.listen();
    try {
      const manifest = await createManifest();
      for (const demo of manifest.demos) {
        await t.test(demo.id, async () => {
          const image = await renderSketchImage({
            origin: server.resolvedUrls.local[0],
            id: demo.id,
            version: manifest.version,
          });
          assert.equal(image.subarray(1, 4).toString(), "PNG");
          assert.equal(image.readUInt32BE(16), 1200);
          assert.equal(image.readUInt32BE(20), 1200);
        });
      }
    } finally {
      await server.close();
    }
  },
);
