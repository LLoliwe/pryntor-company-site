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
      if (/^(?:data:|mailto:|https?:\/\/|tel:)/i.test(href)) continue;
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

test("homepage is the early-list experience, contactable and accessible", () => {
  const home = html["index.html"];
  assert.match(home, /<img[^>]*alt="PRYNTOR"/);
  assert.match(home, /mailto:hello@pryntor\.co\.za/);
  assert.match(home, /id="join"/);
  assert.match(home, /id="consent"[^>]*required/);
  assert.match(home, /POPIA/);
  assert.match(home, /[Uu]nsubscribe/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /id="sound-toggle"[^>]*aria-pressed="false"/, "Sound must be off by default");
  assert.doesNotMatch(home, /getContext\(|webgl/i, "No WebGL motif; brand uses original assets");
  assert.match(home, /src="assets\/img\/pryntor-wordmark-white\.png"/, "Original uppercase wordmark");
  assert.match(home, /src="assets\/img\/pryntor-mascot\.webp"/, "Original mascot");
  assert.match(home, /--orange:#FF6A00/, "Single orange accent from founder-liked deck");
  assert.match(home, /Make the change\.[\s\S]*Prove the chain\./);
  assert.doesNotMatch(home, /—/, "No em dashes");
  assert.doesNotMatch(home, /noindex|PRIVATE DESIGN REVIEW|Private R4 review/i);
});

test("homepage network access is limited to the configured Supabase list", () => {
  const home = html["index.html"];
  const csp = home.match(/connect-src ([^;]+);/)[1].trim().split(/\s+/);
  assert.ok(csp.every(src => src === "'none'" || /^https:\/\/[A-Za-z0-9_-]+\.supabase\.co$/.test(src)), "connect-src " + csp);
  assert.match(home, /supabaseUrl: "", anonKey: ""/, "Ships unconfigured; founder sets keys");
  assert.match(home, /if\(!configured\(\)\) return Promise\.resolve\(\{mode:"mailto"\}\)/, "fetch only after configuration");
  assert.doesNotMatch(home, /service_role/);
});

test("site has no checkout, external runtime or secret", () => {
  for (const name of pages) {
    assert.doesNotMatch(html[name], /<script[^>]*\bsrc\s*=/i, `External script in ${name}`);
    const code = name === "index.html" ? html[name].replace(/return fetch\(cfg\.supabaseUrl\+"\/rest\/v1\/rpc\/join_waitlist"/, "") : html[name];
    assert.doesNotMatch(code, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, `Network call in ${name}`);
    assert.doesNotMatch(html[name], /(?:sk-proj-|sk_live_|BEGIN PRIVATE KEY|AWS_SECRET_ACCESS_KEY)/, `Secret in ${name}`);
    assert.doesNotMatch(html[name], /href="[^"]*(?:checkout|payment)|<button[^>]*>(?:Buy|Pay|Subscribe)/i, `Commercial action in ${name}`);
    assert.ok(!html[name].includes("®"), `Unsupported registered mark in ${name}`);
  }
});
