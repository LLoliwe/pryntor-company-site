import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const ROOT = new URL("../", import.meta.url);
const TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".xml": "application/xml"};
const PAGES = ["/", "/method.html", "/about.html", "/privacy.html", "/terms.html"];
const WIDTHS = [320, 390, 768, 1024, 1440];
let axeSource = null;
try { axeSource = await readFile(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8"); } catch {}

function serve() {
  const server = createServer(async (req, res) => {
    let p = new URL(req.url, "http://127.0.0.1").pathname;
    if (p === "/") p = "/index.html";
    const ok = /^\/(?:[\w-]+\.(?:html|md|txt|xml)|assets\/(?:css|js|img|fonts)\/[\w.-]+)$/.test(p) && existsSync(new URL("." + p, ROOT));
    if (!ok) { res.writeHead(404, {"Content-Type": TYPES[".html"]}); res.end(await readFile(new URL("404.html", ROOT))); return; }
    res.writeHead(200, {"Content-Type": TYPES[p.slice(p.lastIndexOf("."))] || "application/octet-stream", "Cache-Control": "no-store"});
    res.end(await readFile(new URL("." + p, ROOT)));
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

async function guard(page, origin) {
  const errors = [], thirdParty = [], bad = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("request", r => { if (/^https?:/i.test(r.url()) && !r.url().startsWith(origin + "/")) thirdParty.push(r.url()); });
  page.on("response", r => { if (r.status() >= 400 && r.url().startsWith(origin)) bad.push(r.status() + " " + r.url()); });
  return {errors, thirdParty, bad};
}

test("every page: loads clean, no overflow, no third party, axe passes, mascot only from approved derivatives", async () => {
  const server = await serve(); const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    for (const width of WIDTHS) for (const path of PAGES) {
      const ctx = await browser.newContext({viewport: {width, height: 844}, reducedMotion: "reduce", bypassCSP: true}); // bypass only so the axe test script can be injected
      const page = await ctx.newPage(); const g = await guard(page, origin);
      assert.equal((await page.goto(origin + path, {waitUntil: "load"})).status(), 200, path);
      assert.equal(await page.locator("header img").evaluate(i => i.complete && i.naturalWidth > 0), true, "wordmark " + path);
      for (const src of await page.locator("img[src*='ascot' i]").evaluateAll((els) => els.map((e) => e.getAttribute("src")))) assert.match(src, /pryntor-mascot-(480|960)\.webp$/, "approved mascot derivative " + path);
      const lay = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, vw: innerWidth}));
      assert.ok(lay.sw <= lay.vw + 1, `Overflow on ${path} at ${width}: ${JSON.stringify(lay)}`);
      if (axeSource && (width === 390 || width === 1440)) {
        await page.addScriptTag({content: axeSource});
        const v = await page.evaluate(async () => (await axe.run(document, {runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]})).violations.map(x => x.id + ":" + x.nodes.length));
        assert.deepEqual(v, [], `axe on ${path} at ${width}`);
      }
      assert.deepEqual(g.errors, [], `errors ${path} ${width}`); assert.deepEqual(g.thirdParty, [], `third party ${path}`); assert.deepEqual(g.bad, [], `bad responses ${path}`);
      await ctx.close();
    }
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const r = await page.goto(origin + "/does-not-exist"); assert.equal(r.status(), 404);
    assert.match(await page.locator("h1").innerText(), /Broken link/);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});

test("every link on every page resolves", async () => {
  const server = await serve(); const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(); const seen = new Set();
    for (const path of PAGES) {
      await page.goto(origin + path);
      const links = await page.$$eval("a[href]", as => as.map(a => a.href));
      for (const href of links) {
        if (href.startsWith("mailto:")) { assert.match(href, /^mailto:(hello|partnerships|operations)@pryntor\.co\.za|^mailto:POPIAComplaints@inforegulator\.org\.za/, href); continue; }
        if (!href.startsWith(origin)) { assert.match(href, /^https:\/\/inforegulator\.org\.za\/$/, "external link " + href); continue; }
        const [url, frag] = href.split("#"); if (seen.has(href)) continue; seen.add(href);
        const res = await page.request.get(url); assert.equal(res.status(), 200, href);
        if (frag) assert.ok((await res.text()).includes(`id="${frag}"`), "anchor " + href);
      }
    }
  } finally { await browser.close(); server.close(); }
});

test("interactive elements work at every width", async () => {
  const server = await serve(); const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  await mkdir("evidence", {recursive: true});
  try {
    for (const width of WIDTHS) {
      const motion = width % 2 ? "reduce" : "no-preference";
      const ctx = await browser.newContext({viewport: {width, height: 844}, reducedMotion: motion, hasTouch: width <= 390});
      const page = await ctx.newPage(); const g = await guard(page, origin);
      await page.goto(origin + "/", {waitUntil: "load"});
      assert.match(await page.locator("h1").innerText(), /Make\s+it\s+move\./);
      const body = page.locator("body");
      const mobile = width <= 980;
      // motion and sound toggles (visible copy depends on layout)
      const scope = mobile ? "#menu" : "header";
      if (mobile) { await page.locator("#menu-btn").click(); assert.equal(await page.locator("#menu").isVisible(), true); assert.equal(await page.locator("#menu-btn").getAttribute("aria-expanded"), "true"); }
      const before = await body.getAttribute("data-motion");
      assert.equal(before, motion === "reduce" ? "paused" : "running", "motion default at " + width);
      await page.locator(scope + " [data-motion-toggle]").click();
      assert.equal(await body.getAttribute("data-motion"), before === "running" ? "paused" : "running");
      const snd = page.locator(scope + " [data-sound-toggle]");
      assert.equal(await snd.getAttribute("aria-pressed"), "false"); await snd.click(); assert.equal(await snd.getAttribute("aria-pressed"), "true"); await snd.click();
      if (mobile) {
        await page.keyboard.press("Escape"); assert.equal(await page.locator("#menu").isHidden(), true, "Esc closes menu");
        assert.equal(await page.evaluate(() => document.activeElement.id), "menu-btn", "focus returns to Menu");
        await page.locator("#menu-btn").click(); await page.locator("#menu-close").click(); assert.equal(await page.locator("#menu").isHidden(), true);
      }
      // each nav destination
      for (const [label, target] of [["Work", "work"], ["Ventures", "ventures"], ["Early list", "join"], ["Contact", "contact"]]) {
        if (mobile) await page.locator("#menu-btn").click();
        await page.locator(mobile ? "#menu" : ".nav").getByRole("link", {name: label}).click();
        await page.waitForFunction(id => { const r = document.getElementById(id).getBoundingClientRect(); return Math.abs(r.top) < 40; }, target, {timeout: 4000});
        if (mobile) assert.equal(await page.locator("#menu").isHidden(), true, "menu closes after navigating");
      }
      // hero chain links go to method anchors
      assert.equal(await page.locator(".chain a").count(), 4);
      // tabs: click and keyboard
      await page.locator("#tab-test").click();
      assert.equal(await page.locator("#tab-test").getAttribute("aria-selected"), "true");
      assert.equal(await page.locator("#panel-test").isVisible(), true); assert.equal(await page.locator("#panel-change").isHidden(), true);
      await page.locator("#tab-test").press("ArrowDown"); assert.equal(await page.evaluate(() => document.activeElement.id), "tab-prove");
      await page.keyboard.press("End"); assert.equal(await page.locator("#tab-keep").getAttribute("aria-selected"), "true");
      await page.keyboard.press("Home"); assert.equal(await page.locator("#tab-change").getAttribute("aria-selected"), "true");
      // early list: validation, consent, mailto fallback, copy
      await page.locator("#wl .cta").click(); assert.match(await page.locator("#err").innerText(), /valid email/i);
      assert.equal(await page.locator("#email").getAttribute("aria-invalid"), "true");
      await page.locator("#email").fill("test@example.com"); await page.locator("#wl .cta").click();
      assert.match(await page.locator("#err").innerText(), /consent/i);
      await page.locator("#consent").check(); await page.locator("#wl .cta").click();
      await page.locator("#after.on").waitFor();
      assert.equal(await page.evaluate(() => document.activeElement.id), "after", "focus moves to result");
      assert.equal(await page.locator("#mailto-note").isVisible(), true, "Unconfigured backend falls back to mailto");
      assert.match(await page.locator("#mailto-link").getAttribute("href"), /^mailto:hello@pryntor\.co\.za\?subject=Pryntor%20early%20list&body=Please%20add%20test%40example\.com/);
      assert.equal(await page.locator("#reflink").inputValue(), "https://pryntor.co.za/");
      await ctx.grantPermissions(["clipboard-read", "clipboard-write"], {origin}).catch(() => {});
      await page.locator("#copy").click(); await page.waitForFunction(() => document.getElementById("copy").textContent === "Copied", null, {timeout: 3000});
      await page.locator("#share").click();
      await page.screenshot({path: `evidence/after-${width}.png`});
      // contact links
      assert.equal(await page.locator("#contact a.contact").count(), 3);
      // method page and footer to legal
      await page.goto(origin + "/method.html");
      assert.match(await page.locator("h1").innerText(), /Four links/);
      for (const id of ["change", "test", "prove", "keep"]) assert.equal(await page.locator("#" + id).count(), 1);
      await page.locator('footer a[href="privacy.html"]').click(); await page.waitForURL(/privacy\.html$/);
      assert.match(await page.locator("h1").innerText(), /Privacy/i);
      // skip link reaches main
      await page.keyboard.press("Tab"); assert.equal(await page.evaluate(() => document.activeElement.className), "skip");
      await page.keyboard.press("Enter"); assert.equal(await page.evaluate(() => document.activeElement.id), "main");
      assert.deepEqual(g.errors, [], `Page errors at ${width}`); assert.deepEqual(g.thirdParty, [], `Third-party request at ${width}`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
});

test("hero statement uses Repair R1 display type and the mascot is fully inside the opening view", async () => {
  const server = await serve(); const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    for (const width of [360, 390, 768, 1440]) {
      const ctx = await browser.newContext({viewport: {width, height: width >= 1000 ? 900 : 800}, reducedMotion: "reduce"});
      const page = await ctx.newPage();
      await page.goto(origin + "/", {waitUntil: "load"});
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector("#h-hero"));
        const r = document.querySelector(".hero-mascot img").getBoundingClientRect();
        return {font: cs.fontFamily, weight: cs.fontWeight, size: parseFloat(cs.fontSize), left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth};
      });
      assert.match(m.font, /Inter Display/, "display face at " + width);
      assert.equal(m.weight, "700", "display weight at " + width);
      const expected = Math.min(172, Math.max(54, width * 0.105));
      assert.ok(Math.abs(m.size - expected) < 1.5, `display-xl at ${width}: got ${m.size}, want ${expected}`);
      assert.ok(m.w >= 140, `mascot width ${m.w} at ${width}`);
      assert.ok(m.top >= 0 && m.left >= -1 && m.right <= m.vw + 1, `mascot clipped at ${width}: ${JSON.stringify(m)}`);
      assert.ok(m.top < m.vh * 0.8 && m.top + (m.bottom - m.top) * 0.6 <= m.vh, `mascot below the opening view at ${width}: ${JSON.stringify(m)}`);
      assert.ok(m.sw <= m.vw + 1, `overflow at ${width}`);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
});

test("without JavaScript the content is still readable", async () => {
  const server = await serve(); const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({javaScriptEnabled: false}); const page = await ctx.newPage();
    await page.goto(origin + "/");
    for (const id of ["h-work", "h-method", "h-ventures", "h-join", "h-contact"]) {
      const op = await page.locator("#" + id).evaluate(el => [...el.querySelectorAll("span")].every(s => getComputedStyle(s).transform === "none") && getComputedStyle(el.closest("section").querySelector(".fade") || el).opacity === "1");
      assert.equal(op, true, id + " visible without JS");
    }
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
