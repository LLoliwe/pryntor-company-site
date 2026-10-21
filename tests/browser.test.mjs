import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

test("Pryntor early-list homepage and legal journeys", async () => {
  const allowed = new Map([["/", "index.html"], ["/index.html", "index.html"], ["/privacy.html", "privacy.html"], ["/terms.html", "terms.html"], ["/about.html", "about.html"]]);
  const server = createServer(async (req, res) => {
    const file = allowed.get(new URL(req.url, "http://127.0.0.1").pathname);
    if (!file) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"});
    res.end(await readFile(new URL("../" + file, import.meta.url)));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    await mkdir("evidence", {recursive: true});
    browser = await chromium.launch({headless: true});
    for (const [width, motion] of [[320, "reduce"], [390, "no-preference"], [768, "reduce"], [1440, "no-preference"]]) {
      const context = await browser.newContext({viewport: {width, height: 844}, reducedMotion: motion, hasTouch: width <= 390});
      try {
        const page = await context.newPage();
        const errors = [], thirdParty = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", r => { if (/^https?:/i.test(r.url()) && !r.url().startsWith(origin + "/")) thirdParty.push(r.url()); });
        const response = await page.goto(origin + "/", {waitUntil: "load"});
        assert.equal(response.status(), 200);
        assert.equal(await page.locator("header img").getAttribute("alt"), "PRYNTOR");
        assert.equal(await page.locator("h1").getAttribute("aria-label"), "Built to hold up.");
        const stage = page.locator("#field");
        assert.equal(await stage.getAttribute("data-motion"), motion === "reduce" ? "paused" : "running", "motion state at " + width);
        assert.equal(await page.locator("#sound-toggle").getAttribute("aria-pressed"), "false");
        await page.locator("#motion-toggle").click();
        assert.equal(await stage.getAttribute("data-motion"), motion === "reduce" ? "running" : "paused");
        const layout = await page.evaluate(() => ({scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth}));
        assert.ok(layout.scrollWidth <= layout.viewport + 2, `Overflow at ${width}: ${JSON.stringify(layout)}`);
        await page.screenshot({path: `evidence/home-${width}.png`});
        // consent is required
        await page.locator("#email").fill("test@example.com");
        await page.locator("#wl .cta").click();
        assert.match(await page.locator("#err").innerText(), /consent/i);
        await page.locator("#consent").check();
        await page.locator("#wl .cta").click();
        await page.locator("#after.on").waitFor();
        assert.equal(await page.locator("#mailto-note").isVisible(), true, "Unconfigured backend falls back to mailto");
        assert.match(await page.locator("#mailto-link").getAttribute("href"), /^mailto:hello@pryntor\.co\.za/);
        assert.equal(await page.locator("#reflink").inputValue(), "https://pryntor.co.za/");
        await page.screenshot({path: `evidence/after-${width}.png`});
        await page.locator('footer a[href="privacy.html"]').click();
        await page.waitForURL(/privacy\.html$/);
        assert.match(await page.locator("h1").innerText(), /Privacy/i);
        assert.deepEqual(errors, [], `Page errors at ${width}`);
        assert.deepEqual(thirdParty, [], `Third-party request at ${width}`);
      } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
