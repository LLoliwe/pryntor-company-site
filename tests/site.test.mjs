import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pages = ["index.html", "privacy.html", "terms.html"];
const html = Object.fromEntries(pages.map(name => [name, readFileSync(name, "utf8")]));
const hrefs = text => [...text.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]);

test("all required static pages are present and readable", () => {
  for (const name of pages) {
    assert.match(html[name], /<!doctype html>/i, name);
    assert.match(html[name], /<html\s+lang="en"/i, name);
    assert.match(html[name], /<title>[^<]+<\/title>/i, name);
    assert.match(html[name], /name="viewport"/i, name);
    assert.match(html[name], /<main(?:\s|>)/i, name);
  }
});

test("all internal links resolve to an existing HTML file or named target", () => {
  for (const name of pages) {
    for (const href of hrefs(html[name])) {
      if (/^(?:mailto:|https?:\/\/|tel:)/i.test(href)) continue;
      assert.ok(!/^javascript:/i.test(href), `Unsafe URL in ${name}`);
      if (href.startsWith("#")) {
        assert.ok(html[name].includes(`id="${href.slice(1)}"`), `Missing target ${href} in ${name}`);
      } else {
        const [target, fragment] = href.split("#");
        assert.ok(!target.startsWith("/") && !target.includes(".."), `Unexpected link ${href}`);
        assert.ok(existsSync(resolve(target)), `Missing file ${target} from ${name}`);
        if (fragment) assert.ok(readFileSync(resolve(target), "utf8").includes(`id="${fragment}"`));
      }
    }
  }
});

test("corporate site has meaningful legal pages but no checkout or buyer funnel", () => {
  assert.match(html["index.html"], /href="privacy.html"/);
  assert.match(html["index.html"], /href="terms.html"/);
  assert.match(html["privacy.html"], /Pryntor \(Pty\) Ltd/);
  assert.match(html["terms.html"], /No commercial offer/);
  assert.doesNotMatch(html["index.html"], /<form\b|<input\b|checkout|<button[^>]*type="submit"/i);
});

test("unsupported registered mark is absent from visible pages", () => {
  for (const name of pages) assert.ok(!html[name].includes("®"), `Unapproved registered mark in ${name}`);
});

test("no third party script, analytics pixel or inline credential in static pages", () => {
  for (const name of pages) {
    assert.doesNotMatch(html[name], /<script[^>]*\bsrc\s*=/i, `External script in ${name}`);
    assert.doesNotMatch(html[name], /(?:sk-proj-|sk_live_|BEGIN PRIVATE KEY|AWS_SECRET_ACCESS_KEY)/, `Sensitive value in ${name}`);
  }
});


test("skip-to-content target is keyboard focusable and reduced-motion styles are present", () => {
  assert.match(html["index.html"], /<a class="skip" href="#main">Skip to content<\/a>/);
  assert.match(html["index.html"], /<main id="main" tabindex="-1">/);
  assert.match(html["index.html"], /@media\(prefers-reduced-motion:reduce\)/);
});
