import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

test("Corporate site mobile navigation, legal links and responsive user journeys", async () => {
  const allowed = new Map([
    ["/", "index.html"],
    ["/index.html", "index.html"],
    ["/privacy.html", "privacy.html"],
    ["/terms.html", "terms.html"],
  ]);
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const file = allowed.get(pathname);
    if (!file) {
      res.writeHead(404, {"Content-Type": "text/plain"});
      res.end("Not found");
      return;
    }
    try {
      const data = await readFile(new URL("../" + file, import.meta.url));
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end("Unavailable");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    for (const width of [360, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: {width, height: 844},
        reducedMotion: "reduce",
        deviceScaleFactor: width <= 390 ? 2 : 1,
        hasTouch: width <= 390,
      });
      try {
        const page = await context.newPage();
        const errors = [];
        const thirdParty = [];
        page.on("pageerror", err => errors.push(err.message));
        page.on("request", req => {
          if (!req.url().startsWith(url + "/")) thirdParty.push(req.url());
        });
        const response = await page.goto(url + "/index.html", {waitUntil: "load"});
        assert.equal(response.status(), 200, "Home response at " + width);
        assert.equal(await page.locator("#main").count(), 1);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
          true,
          "Horizontal overflow at " + width,
        );
        if (width <= 390) {
          const menu = page.locator("#menu");
          const nav = page.locator("#primary-nav");
          assert.equal(await menu.isVisible(), true);
          await menu.click();
          assert.equal(await menu.getAttribute("aria-expanded"), "true");
          assert.equal(await nav.isVisible(), true);

          await page.keyboard.press("Escape");
          assert.equal(await menu.getAttribute("aria-expanded"), "false", "Escape collapses menu");
          assert.equal(await nav.isVisible(), false);
          assert.equal(await menu.evaluate(el => document.activeElement === el), true, "Focus returns to menu");

          await menu.click();
          assert.equal(await nav.isVisible(), true);
          await page.locator("#hero-title").click();
          assert.equal(await menu.getAttribute("aria-expanded"), "false", "Outside tap collapses menu");
          assert.equal(await nav.isVisible(), false);

          await menu.click();
          await page.locator('#primary-nav a[href="#work"]').click();
          assert.equal(await menu.getAttribute("aria-expanded"), "false");
          assert.equal(await nav.isVisible(), false);
          assert.ok(page.url().endsWith("#work"));

          await menu.click();
          assert.equal(await menu.getAttribute("aria-expanded"), "true");
          await page.setViewportSize({width: 768, height: 844});
          assert.equal(await menu.getAttribute("aria-expanded"), "false", "Widening viewport resets mobile state");
          await page.setViewportSize({width, height: 844});
        } else {
          assert.equal(await page.locator("#primary-nav").isVisible(), true);
        }
        await page.locator('footer a[href="privacy.html"]').click();
        assert.equal(new URL(page.url()).pathname, "/privacy.html");
        assert.match(await page.locator("main h1").innerText(), /Privacy notice/i);
        await page.locator('a[href="index.html"]').first().click();
        assert.equal(new URL(page.url()).pathname, "/index.html");
        await page.locator('footer a[href="terms.html"]').click();
        assert.equal(new URL(page.url()).pathname, "/terms.html");
        assert.match(await page.locator("main h1").innerText(), /Site terms/i);
        assert.deepEqual(errors, [], "Page errors at " + width);
        assert.deepEqual(thirdParty, [], "Unexpected third-party requests at " + width);
        console.log("PASS corporate site " + width + "px: menu, internal legal links, overflow, JS errors, third-party requests");
      } finally {
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
