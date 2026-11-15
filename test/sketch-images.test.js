import assert from "node:assert/strict";
import test from "node:test";
import { createImageCache, IMAGE_TTL } from "../server/image-cache.js";
import { handleSketchImage } from "../server/sketch-handlers.js";
import { handleShare } from "../server/share-page.js";
import { siteOrigin } from "../server/sketch-data.js";

const manifest = {
  version: "revision1",
  demos: [
    {
      id: "ioc-stack.ts",
      title: 'Stack "blue"',
      description: "A <blue> stack & more",
    },
  ],
};

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

test("image cache coalesces renders, expires after 24h, and removes failures", async () => {
  let time = 1000;
  let calls = 0;
  const cache = createImageCache(
    async () => {
      calls++;
      return Buffer.from(`image${calls}`);
    },
    { now: () => time },
  );
  const [a, b] = await Promise.all([cache("stack"), cache("stack")]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  assert.equal(a.expiresAt, 1000 + IMAGE_TTL * 1000);
  time += IMAGE_TTL * 1000 - 1;
  assert.equal(await cache("stack"), a);
  time++;
  assert.notEqual(await cache("stack"), a);
  assert.equal(calls, 2);
  let tries = 0;
  const retry = createImageCache(async () => {
    if (++tries === 1) throw new Error("Render failed");
    return Buffer.from("ok");
  });
  await assert.rejects(retry("stack"), /Render failed/);
  assert.equal((await retry("stack")).image.toString(), "ok");
});

test("PNG response caches for the remaining lifetime, not a fresh 24h on each hit", async () => {
  let time = 1000;
  let renders = 0;
  const cachedImage = createImageCache(
    async () => {
      renders++;
      return Buffer.from("PNG");
    },
    { now: () => time },
  );
  const options = {
    manifest,
    origin: "https://sketch.example",
    cachedImage,
    now: () => time,
  };
  const first = response();
  await handleSketchImage(
    { method: "GET", url: "/api/sketch-image?demo=ioc-stack.ts&v=revision1" },
    first,
    options,
  );
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers["Content-Type"], "image/png");
  assert.match(first.headers["Vercel-CDN-Cache-Control"], /max-age=86400/);
  assert.equal(first.body.toString(), "PNG");
  time += 23 * 60 * 60 * 1000;
  const later = response();
  await handleSketchImage(
    { method: "GET", url: "/api/sketch-image?demo=ioc-stack.ts" },
    later,
    options,
  );
  assert.match(later.headers["Cache-Control"], /max-age=3600,/);
  assert.equal(renders, 1);
  const head = response();
  await handleSketchImage(
    { method: "HEAD", url: "/api/sketch-image?demo=ioc-stack.ts" },
    head,
    options,
  );
  assert.equal(head.body, undefined);
  assert.equal(renders, 1);
});

test("invalid demo requests do not invoke Chromium or cache error responses", async () => {
  const cachedImage = () => {
    throw new Error("Should not render");
  };
  for (const [url, status] of [
    ["/api/sketch-image?demo=../../private", 404],
    ["/api/sketch-image?demo=missing.ts", 404],
    ["/api/sketch-image?demo=ioc-stack.ts&demo=other", 400],
    ["/api/sketch-image?demo=ioc-stack.ts&v=old", 307],
    ["/api/sketch-image?demo=ioc-stack.ts&url=https://elsewhere.example", 400],
  ]) {
    const res = response();
    await handleSketchImage({ method: "GET", url }, res, {
      manifest,
      cachedImage,
    });
    assert.equal(res.statusCode, status);
    assert.equal(res.headers["Cache-Control"], "no-store");
    if (status === 307)
      assert.equal(
        res.headers.Location,
        "/api/sketch-image?demo=ioc-stack.ts&v=revision1",
      );
  }
  const failed = response();
  await handleSketchImage({ method: "GET", url: "/api/sketch-image" }, failed, {
    manifest,
    cachedImage: async () => {
      throw new Error("Internal details");
    },
  });
  assert.equal(failed.statusCode, 500);
  assert.equal(failed.headers["Cache-Control"], "no-store");
  assert.doesNotMatch(failed.body, /Internal details/);
  const post = response();
  await handleSketchImage({ method: "POST", url: "/api/sketch-image" }, post);
  assert.equal(post.statusCode, 405);
});

test("shared links return escaped per-demo metadata in the initial HTML", async () => {
  const res = response();
  await handleShare({ method: "GET", url: "/?demo=ioc-stack.ts" }, res, {
    manifest,
    origin: "https://sketch.example",
    html: '<html><head><title>Snippets</title></head><body><script src="/assets/main.js"></script></body></html>',
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Stack &quot;blue&quot; · Snippets/);
  assert.match(res.body, /A &lt;blue&gt; stack &amp; more/);
  assert.match(
    res.body,
    /og:image" content="https:\/\/sketch.example\/api\/sketch-image\?demo=ioc-stack.ts&amp;v=revision1/,
  );
  assert.match(res.body, /twitter:card/);
  assert.match(res.body, /src="\/assets\/main.js"/);
});

test("render origin comes from trusted deployment configuration", () => {
  assert.equal(
    siteOrigin({
      VERCEL_PROJECT_PRODUCTION_URL: "sketch.example",
      VERCEL_URL: "deployment.vercel.app",
    }),
    "https://sketch.example",
  );
  assert.equal(
    siteOrigin({
      VERCEL_ENV: "preview",
      VERCEL_PROJECT_PRODUCTION_URL: "sketch.example",
      VERCEL_URL: "preview.vercel.app",
    }),
    "https://preview.vercel.app",
  );
  assert.equal(
    siteOrigin({ SKETCH_SITE_URL: "http://localhost:4173/path" }),
    "http://localhost:4173",
  );
  assert.throws(() => siteOrigin({ SKETCH_SITE_URL: "file:///private" }));
});
