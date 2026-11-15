export async function renderSketchImage({ origin, id, version }) {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({
      args: chromium.args,
      headless: "shell",
    }),
    executablePath:
      process.env.CHROMIUM_EXECUTABLE_PATH || (await chromium.executablePath()),
    headless: "shell",
    defaultViewport: { width: 1200, height: 1200, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const headers = request.headers();
        if (new URL(request.url()).origin === origin)
          headers["x-vercel-protection-bypass"] =
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
        request.continue({ headers }).catch(() => {});
      });
    }
    const url = new URL("/render.html", origin);
    url.searchParams.set("demo", id);
    url.searchParams.set(
      "seed",
      `${Math.floor(Date.now() / 86400000)}:${id}:${version}`,
    );
    const response = await page.goto(url.href, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    if (!response?.ok()) throw new Error("Unable to open the sketch renderer.");
    await page.waitForFunction(
      () => window.__sketchCapture?.ready || window.__sketchCapture?.error,
      { timeout: 20000 },
    );
    const state = await page.evaluate(() => window.__sketchCapture);
    if (state.error) throw new Error(state.error);
    await page.evaluate(() => document.fonts.ready);
    const canvas = await page.$("#stage canvas");
    if (!canvas) throw new Error("The sketch did not create a canvas.");
    return Buffer.from(await canvas.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }
}
