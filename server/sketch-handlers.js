import { createImageCache } from "./image-cache.js";
import { renderSketchImage } from "./render-sketch.js";
import {
  readManifest,
  requestDemo,
  sendError,
  siteOrigin,
} from "./sketch-data.js";

const cachedImage = createImageCache(renderSketchImage);

function allowRead(request, response) {
  if (["GET", "HEAD"].includes(request.method)) return true;
  response.statusCode = 405;
  response.setHeader("Allow", "GET, HEAD");
  response.setHeader("Cache-Control", "no-store");
  response.end("Method not allowed.");
  return false;
}

export async function handleSketchImage(request, response, options = {}) {
  if (!allowRead(request, response)) return;
  try {
    const manifest = options.manifest ?? (await readManifest());
    const demo = requestDemo(request, manifest, { image: true });
    const origin = options.origin ?? siteOrigin();
    const { image, expiresAt } = await (options.cachedImage ?? cachedImage)(
      `${origin}:${manifest.version}:${demo.id}`,
      { origin, id: demo.id, version: manifest.version },
    );
    const maxAge = Math.max(
      0,
      Math.ceil((expiresAt - (options.now ?? Date.now)()) / 1000),
    );
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Content-Length", image.length);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${maxAge}, must-revalidate`,
    );
    response.setHeader(
      "CDN-Cache-Control",
      `public, max-age=${maxAge}, must-revalidate`,
    );
    response.setHeader(
      "Vercel-CDN-Cache-Control",
      `public, max-age=${maxAge}, must-revalidate`,
    );
    response.end(request.method === "HEAD" ? undefined : image);
  } catch (error) {
    sendError(response, error);
  }
}
