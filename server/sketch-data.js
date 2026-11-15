import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readManifest() {
  return JSON.parse(
    await readFile(
      path.join(process.cwd(), "dist/sketch-manifest.json"),
      "utf8",
    ),
  );
}

export function siteOrigin(env = process.env) {
  const configured =
    env.SKETCH_SITE_URL ||
    (env.VERCEL_ENV === "preview" && env.VERCEL_URL
      ? `https://${env.VERCEL_URL}`
      : env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : env.VERCEL_URL
          ? `https://${env.VERCEL_URL}`
          : "http://localhost:5173");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid sketch site URL.");
  return url.origin;
}

export function requestDemo(request, manifest, { image = false } = {}) {
  const url = new URL(request.url, "http://localhost");
  const ids = url.searchParams.getAll("demo");
  if (ids.length > 1)
    throw Object.assign(new Error("Specify one demo."), { status: 400 });
  const demo = ids.length
    ? manifest.demos.find((item) => item.id === ids[0])
    : manifest.demos[0];
  if (!demo) throw Object.assign(new Error("Demo not found."), { status: 404 });
  if (image) {
    for (const key of url.searchParams.keys())
      if (!["demo", "v"].includes(key))
        throw Object.assign(new Error("Unknown image option."), {
          status: 400,
        });
    const versions = url.searchParams.getAll("v");
    if (versions.length > 1)
      throw Object.assign(new Error("Specify one version."), { status: 400 });
    if (versions.length && versions[0] !== manifest.version) {
      const current = new URL("/api/sketch-image", "http://localhost");
      current.searchParams.set("demo", demo.id);
      current.searchParams.set("v", manifest.version);
      throw Object.assign(new Error("The sketch has been updated."), {
        status: 307,
        location: current.pathname + current.search,
      });
    }
  }
  return demo;
}

export function sendError(response, error) {
  response.statusCode = error.status ?? 500;
  response.setHeader("Cache-Control", "no-store");
  if (error.location) response.setHeader("Location", error.location);
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(
    error.status
      ? error.message
      : "Unable to render this sketch. Please try again.",
  );
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

export function addShareMetadata(html, demo, origin, version) {
  const page = new URL("/", origin);
  page.searchParams.set("demo", demo.id);
  const image = new URL("/api/sketch-image", origin);
  image.searchParams.set("demo", demo.id);
  image.searchParams.set("v", version);
  const title = `${demo.title} · Snippets`;
  const tags = [
    ["name", "description", demo.description],
    ["property", "og:type", "website"],
    ["property", "og:title", title],
    ["property", "og:description", demo.description],
    ["property", "og:url", page.href],
    ["property", "og:image", image.href],
    ["property", "og:image:type", "image/png"],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "1200"],
    ["property", "og:image:alt", demo.description || demo.title],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", demo.description],
    ["name", "twitter:image", image.href],
  ]
    .map(
      ([attribute, key, value]) =>
        `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`,
    )
    .join("\n    ");
  return html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace("</head>", `    ${tags}\n  </head>`);
}
