import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoMeta } from "../src/demo-meta.js";
import { init, parse } from "es-module-lexer";
import { transformWithEsbuild } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function createManifest(filenames) {
  const files =
    filenames ??
    (await readdir(path.join(root, "src/demos"))).filter(
      (name) => /\.(js|ts)$/.test(name) && !name.endsWith(".d.ts"),
    );
  await init();
  const sources = await Promise.all(
    files.sort().map(async (id) => ({
      id,
      code: await readFile(path.join(root, "src/demos", id), "utf8"),
    })),
  );
  const exported = await Promise.all(
    sources.map(async (item) => {
      const javascript = item.id.endsWith(".ts")
        ? (await transformWithEsbuild(item.code, item.id, { loader: "ts" }))
            .code
        : item.code;
      return parse(javascript)[1].some((entry) => entry.name === "default")
        ? item
        : undefined;
    }),
  );
  const demos = exported
    .filter(Boolean)
    .map(({ id }) => ({
      id,
      title:
        demoMeta[id]?.title ??
        id.replace(/\.(js|ts)$/, "").replace(/[-_]/g, " "),
      description: demoMeta[id]?.description ?? "",
      order: demoMeta[id]?.order ?? Infinity,
    }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const shared = await Promise.all(
    [
      "src/helper.js",
      "src/helper-colors.js",
      "src/p5-demo.js",
      "src/p5-locale.js",
      "src/render.js",
      "server/render-sketch.js",
      "render.html",
      "package-lock.json",
    ].map((name) => readFile(path.join(root, name), "utf8")),
  );
  const version = createHash("sha256")
    .update(JSON.stringify([sources, shared, demoMeta]))
    .digest("hex")
    .slice(0, 16);
  return { version, demos };
}

export function sketchImagesPlugin() {
  return {
    name: "sketch-images",
    async generateBundle() {
      const directory = path.join(root, "src/demos");
      const filenames = [...this.getModuleIds()]
        .filter(
          (id) =>
            path.dirname(id) === directory &&
            /\.(js|ts)$/.test(id) &&
            this.getModuleInfo(id)?.exports.includes("default"),
        )
        .map((id) => path.basename(id));
      this.emitFile({
        type: "asset",
        fileName: "sketch-manifest.json",
        source: JSON.stringify(await createManifest(filenames)),
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (
          !["/api/sketch-image", "/api/share", "/", "/index.html"].includes(
            pathname,
          )
        )
          return next();
        try {
          const { handleSketchImage } =
            await import("../server/sketch-handlers.js");
          const { handleShare } = await import("../server/share-page.js");
          const origin = new URL(
            server.resolvedUrls?.local[0] ?? "http://localhost:4173",
          ).origin;
          if (pathname === "/api/sketch-image")
            await handleSketchImage(request, response, { origin });
          else await handleShare(request, response, { origin });
        } catch (error) {
          next(error);
        }
      });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (
          !["/api/sketch-image", "/api/share", "/", "/index.html"].includes(
            pathname,
          )
        )
          return next();
        try {
          const { handleSketchImage } =
            await import("../server/sketch-handlers.js");
          const { handleShare } = await import("../server/share-page.js");
          const manifest = await createManifest();
          const origin = new URL(
            server.resolvedUrls?.local[0] ?? "http://localhost:5173",
          ).origin;
          if (pathname === "/api/sketch-image")
            return await handleSketchImage(request, response, {
              manifest,
              origin,
            });
          const html = await server.transformIndexHtml(
            request.url,
            await readFile(path.join(root, "index.html"), "utf8"),
          );
          await handleShare(request, response, { manifest, origin, html });
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
