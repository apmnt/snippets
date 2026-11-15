import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  addShareMetadata,
  readManifest,
  requestDemo,
  sendError,
  siteOrigin,
} from "./sketch-data.js";

export async function handleShare(request, response, options = {}) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.statusCode = 405;
    response.setHeader("Allow", "GET, HEAD");
    response.setHeader("Cache-Control", "no-store");
    response.end("Method not allowed.");
    return;
  }
  try {
    const manifest = options.manifest ?? (await readManifest());
    const demo = requestDemo(request, manifest);
    const origin = options.origin ?? siteOrigin();
    const template =
      options.html ??
      (await readFile(path.join(process.cwd(), "dist/index.html"), "utf8"));
    const html = addShareMetadata(template, demo, origin, manifest.version);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    response.setHeader("Vercel-CDN-Cache-Control", "public, max-age=60");
    response.end(request.method === "HEAD" ? undefined : html);
  } catch (error) {
    sendError(response, error);
  }
}
