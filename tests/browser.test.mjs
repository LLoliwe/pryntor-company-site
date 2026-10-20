import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

test("Pryntor homepage, assistant and legal journeys", async () => {
  const allowed = new Map([["/", "index.html"], ["/index.html", "index.html"], ["/privacy.html", "privacy.html"], ["/terms.html", "terms.html"]]);
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const file = allowed.get(pathname);
    if (!file) { res.writeHead(404); res.end("Not found"); return; }
    const data = await readFile(new URL("../" + file, import.meta.url));
    res.writeHead(200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"});
    res.end(data);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    await mkdir("evidence", {recursive: true});
    browser = await chromium.launch({headless: true});
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({viewport: {width, height: 844}, reducedMotion: "reduce", hasTouch: width <= 390});
      try {
        const page = await context.newPage();
        const errors = [];
        const thirdParty = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", request => { if (!request.url().startsWith(origin + "/")) thirdParty.push(request.url()); });
        const response = await page.goto(origin + "/index.html", {waitUntil: "load"});
        assert.equal(response.status(), 200);
        assert.equal(await page.locator("h1").innerText(), "PRYNTOR");
        const layout = await page.evaluate(() => ({
          viewport: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          widest: [...document.querySelectorAll("body *")]
            .map(node => ({tag: node.tagName, id: node.id, className: String(node.className || ""), right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width}))
            .filter(item => item.right > innerWidth + 2)
            .sort((a, b) => b.right - a.right)
            .slice(0, 3)
        }));
        assert.equal(layout.scrollWidth <= layout.viewport + 2, true, `Overflow at ${width}: ${JSON.stringify(layout)}`);
        assert.match(await page.locator("a.contact").getAttribute("href"), /^mailto:hello@pryntor\.co\.za/);
        await page.screenshot({path: `evidence/pryntor-home-${width}.png`, fullPage: true});

        const opener = page.locator("#ask-top");
        await opener.click();
        assert.equal(await page.locator("#assistant").isVisible(), true);
        await page.locator("#assistant-input").fill("How do I contact you?");
        await page.locator("#assistant-form").press("Enter");
        assert.match(await page.locator(".assistant-message").last().innerText(), /hello@pryntor\.co\.za/i);
        await page.screenshot({path: `evidence/pryntor-assistant-${width}.png`, fullPage: true});
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#assistant").isHidden(), true);
        assert.equal(await opener.evaluate(node => document.activeElement === node), true);

        await page.locator('footer a[href="privacy.html"]').click();
        assert.match(await page.locator("main h1").innerText(), /Privacy/i);
        assert.deepEqual(errors, [], `Page errors at ${width}`);
        assert.deepEqual(thirdParty, [], `Third-party request at ${width}`);
      } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
