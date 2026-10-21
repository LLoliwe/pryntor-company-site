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
        page.on("request", request => { if (/^https?:/i.test(request.url()) && !request.url().startsWith(origin + "/")) thirdParty.push(request.url()); });
        const response = await page.goto(origin + "/index.html", {waitUntil: "load"});
        assert.equal(response.status(), 200);
        await page.locator("#stage[data-render=turntable]").waitFor();
        assert.equal(await page.locator("h1 img").getAttribute("alt"), "PRYNTOR");
        assert.equal(await page.locator("h1 img").evaluate(image => image.complete && image.naturalWidth > 0), true);
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
        assert.match(await page.locator("a.primary").first().getAttribute("href"), /^mailto:hello@pryntor\.co\.za/);
        // Independent keyboard, motion and visual-control regression at each viewport.
        // Reduced motion is enabled in this test context, so the turntable must start paused.
        const stage = page.locator("#stage");
        assert.equal(await stage.getAttribute("data-motion"), "paused", "Reduced motion starts paused at " + width);
        const initialAngle = Number(await stage.getAttribute("data-angle"));
        await page.locator("#rotate-right").focus();
        await page.keyboard.press("Enter");
        assert.ok(Number(await stage.getAttribute("data-angle")) > initialAngle,
          "Keyboard rotation changes the rendered frame angle at " + width);
        await page.locator("#reset-view").click();
        assert.ok(Math.abs(Number(await stage.getAttribute("data-angle"))) < 0.002,
          "Reset returns the turntable to front at " + width);
        const motion = page.locator("#motion-toggle");
        await motion.focus();
        await page.keyboard.press("Enter");
        assert.equal(await motion.getAttribute("aria-pressed"), "true");
        assert.equal(await stage.getAttribute("data-motion"), "running");
        await page.keyboard.press("Enter");
        assert.equal(await motion.getAttribute("aria-pressed"), "false");
        assert.equal(await stage.getAttribute("data-motion"), "paused");

        // Contact CTA may open a local dialog, never navigate to a mail client by itself.
        const contact = page.locator(".contact-top");
        const beforeContact = page.url();
        await contact.focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#contact").isVisible(), true,
          "Contact modal opens from keyboard at " + width);
        assert.equal(page.url(), beforeContact, "Contact activation remains local at " + width);
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#contact").isHidden(), true);
        assert.equal(await contact.evaluate(el => document.activeElement === el), true,
          "Contact dialog restores focus to opener at " + width);

        await page.screenshot({path: `evidence/pryntor-home-${width}.png`, fullPage: true});

        const opener = page.locator("#ask");
        await opener.click();
        assert.equal(await page.locator("#assistant").isVisible(), true);
        assert.equal(await page.locator('label[for="question"]').innerText(), "Your question");
        await page.locator("#question").fill("How do I contact you?");
        await page.locator("#guide-form").press("Enter");
        assert.match(await page.locator(".message.guide .message-text").last().innerText(), /hello@pryntor\.co\.za/i);
        await page.screenshot({path: `evidence/pryntor-assistant-${width}.png`, fullPage: true});
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#assistant").isHidden(), true);
        assert.equal(await opener.evaluate(node => document.activeElement === node), true);

        await page.locator('footer a[href="#privacy"]').click();
        assert.equal(await page.locator("#privacy").isVisible(), true);
        assert.match(await page.locator("#privacy-title").innerText(), /Privacy/i);
        await page.keyboard.press("Escape");
        assert.deepEqual(errors, [], `Page errors at ${width}`);
        assert.deepEqual(thirdParty, [], `Third-party request at ${width}`);
      } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
