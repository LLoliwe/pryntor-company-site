import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pages = ["index.html", "privacy.html", "terms.html"];
const html = Object.fromEntries(pages.map(name => [name, readFileSync(name, "utf8")]));
const hrefs = text => [...text.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]);

test("required pages are present and readable", () => {
  for (const name of pages) {
    assert.match(html[name], /<!doctype html>/i, name);
    assert.match(html[name], /<html\s+lang="en"/i, name);
    assert.match(html[name], /<title>[^<]+<\/title>/i, name);
    assert.match(html[name], /name="viewport"/i, name);
    assert.match(html[name], /<main(?:\s|>)/i, name);
  }
});

test("internal links resolve", () => {
  for (const name of pages) {
    for (const href of hrefs(html[name])) {
      if (/^(?:mailto:|https?:\/\/|tel:)/i.test(href)) continue;
      if (href.startsWith("#")) {
        assert.ok(html[name].includes(`id="${href.slice(1)}"`), `Missing ${href} in ${name}`);
      } else {
        const [target, fragment] = href.split("#");
        assert.ok(!target.startsWith("/") && !target.includes(".."), `Unexpected link ${href}`);
        assert.ok(existsSync(resolve(target)), `Missing ${target} from ${name}`);
        if (fragment) assert.ok(readFileSync(resolve(target), "utf8").includes(`id="${fragment}"`));
      }
    }
  }
});

test("homepage is minimal, contactable and assistant-ready", () => {
  assert.match(html["index.html"], /<h1[^>]*>PRYNTOR<\/h1>/);
  assert.match(html["index.html"], /mailto:hello@pryntor\.co\.za/);
  assert.match(html["index.html"], /id="assistant"/);
  assert.match(html["index.html"], /SpeechRecognition|webkitSpeechRecognition/);
  assert.match(html["index.html"], /speechSynthesis/);
  assert.match(html["privacy.html"], /does not send typed questions to Pryntor/i);
});

test("site has no checkout, external runtime or secret", () => {
  for (const name of pages) {
    assert.doesNotMatch(html[name], /<script[^>]*\bsrc\s*=/i, `External script in ${name}`);
    assert.doesNotMatch(html[name], /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, `Network call in ${name}`);
    assert.doesNotMatch(html[name], /(?:sk-proj-|sk_live_|BEGIN PRIVATE KEY|AWS_SECRET_ACCESS_KEY)/, `Secret in ${name}`);
    assert.doesNotMatch(html[name], /href="[^"]*(?:checkout|payment)|<button[^>]*>(?:Buy|Pay|Subscribe)/i, `Commercial action in ${name}`);
    assert.ok(!html[name].includes("®"), `Unsupported registered mark in ${name}`);
  }
});
