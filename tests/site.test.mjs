import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const pages = ["index.html", "method.html", "about.html", "privacy.html", "terms.html"];
const html = Object.fromEntries(pages.map(name => [name, readFileSync(name, "utf8")]));
const js = Object.fromEntries(["site.js", "waitlist.js", "config.js"].map(n => [n, readFileSync("assets/js/" + n, "utf8")]));
const css = readFileSync("assets/css/site.css", "utf8");
const hrefs = text => [...text.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match => match[1]);
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); if (/^(node_modules|\.git|evidence)$/.test(f)) return []; return statSync(p).isDirectory() ? walk(p) : [p]; });
// Files a static host would publish: pages, assets and agent-readable text. Repo docs, tests and tooling are excluded.
const publicFiles = [...pages, "404.html", "index.md", "llms.txt", "robots.txt", "sitemap.xml", "_headers", ...walk("assets")];

test("required pages are present and readable", () => {
  for (const name of pages) {
    assert.match(html[name], /<!doctype html>/i, name);
    assert.match(html[name], /<html\s+lang="en"/i, name);
    assert.match(html[name], /<title>[^<]+<\/title>/i, name);
    assert.match(html[name], /name="viewport"/i, name);
    assert.match(html[name], /<main(?:\s|>)/i, name);
    assert.match(html[name], /<h1[\s>]/i, name);
    assert.match(html[name], /class="skip" href="#main"/, name + " skip link");
    assert.equal((html[name].match(/<h1[\s>]/g) || []).length, 1, name + " has one h1");
  }
});

test("internal links and assets resolve on every page", () => {
  for (const name of pages) {
    for (const href of hrefs(html[name])) {
      if (/^(?:data:|mailto:|https?:\/\/|tel:)/i.test(href)) continue;
      if (href.startsWith("#")) {
        assert.ok(html[name].includes(`id="${href.slice(1)}"`), `Missing ${href} in ${name}`);
      } else {
        const [target, fragment] = href.split("#");
        assert.ok(!target.startsWith("/") && !target.includes(".."), `Unexpected link ${href}`);
        assert.ok(existsSync(resolve(target)), `Missing ${target} from ${name}`);
        if (fragment) assert.ok(readFileSync(resolve(target), "utf8").includes(`id="${fragment}"`), `Missing #${fragment} in ${target}`);
      }
    }
  }
});

test("every page shares the same working navigation", () => {
  for (const name of pages) {
    assert.match(html[name], /<nav class="nav" aria-label="Main">/, name);
    for (const label of ["Work", "Method", "Ventures", "Early list", "Contact"]) assert.ok(html[name].includes(`>${label}</a>`), `${label} in ${name}`);
    assert.match(html[name], /id="menu-btn"[^>]*aria-expanded="false"[^>]*aria-controls="menu"/, name);
    assert.match(html[name], /id="menu" role="dialog" aria-modal="true"/, name);
  }
});

test("homepage is the early-list experience, contactable and accessible", () => {
  const home = html["index.html"];
  assert.match(home, /<img[^>]*alt="PRYNTOR"/);
  assert.match(home, /mailto:hello@pryntor\.co\.za/);
  for (const id of ["work", "method", "ventures", "join", "contact"]) assert.match(home, new RegExp(`id="${id}"`));
  assert.match(home, /id="consent"[^>]*required/);
  assert.match(home, /POPIA/);
  assert.match(home, /[Uu]nsubscribe/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(home, /id="sound-toggle"[^>]*aria-pressed="false"/, "Sound must be off by default");
  assert.match(home, /role="tablist"/);
  assert.equal((home.match(/role="tab"/g) || []).length, 4);
  assert.match(home, /src="assets\/img\/pryntor-wordmark-white-264\.webp"/, "Original uppercase wordmark, resized from the original pixels");
  assert.match(css, /--orange:#FF6A00/, "Single orange accent from founder-liked deck");
  assert.match(css, /--white:#FFFFFF/, "Pure white, no cream");
  assert.match(home, /Make the change\.[\s\S]*Prove the chain\./);
  assert.doesNotMatch(home, /noindex|PRIVATE DESIGN REVIEW|Private R4 review/i);
  for (const f of Object.values(js)) assert.doesNotMatch(f, /getContext\(|webgl/i, "No WebGL motif");
});

test("only the three approved business addresses are published", () => {
  for (const name of pages) {
    const mails = [...html[name].matchAll(/mailto:([^"?]+)/g)].map(m => m[1].toLowerCase());
    for (const m of mails) assert.ok(["hello@pryntor.co.za", "partnerships@pryntor.co.za", "operations@pryntor.co.za", "popiacomplaints@inforegulator.org.za"].includes(m), `${m} in ${name}`);
    assert.doesNotMatch(html[name], /lebo@/i);
  }
});

test("mascot is absent from every public file and path", () => {
  for (const f of publicFiles) {
    assert.doesNotMatch(f, /mascot/i, "Mascot file in public path: " + f);
    if (/\.(html|css|js|md|txt|xml|json)$/.test(f)) assert.doesNotMatch(readFileSync(f, "utf8"), /mascot/i, "Mascot reference in " + f);
  }
});

test("no em dashes or cream colours in public copy and styles", () => {
  for (const f of publicFiles.filter(f => /\.(html|css|js|md|txt)$/.test(f))) {
    const t = readFileSync(f, "utf8");
    assert.doesNotMatch(t, /\u2014/, "Em dash in " + f);
    assert.doesNotMatch(t, /#(?:FFFDF|FAF7F|F5F1E|FFF8E|FDFBF)[0-9A-F]/i, "Cream colour in " + f);
  }
});

test("strict CSP: same-origin scripts and styles only, network limited to the configured list", () => {
  for (const name of pages) {
    const csp = html[name].match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /script-src 'self';/, name);
    const style = html[name].match(/<style>([\s\S]*?)<\/style>/);
    assert.ok(style, name + " inlines its stylesheet");
    const hash = "sha256-" + createHash("sha256").update(style[1]).digest("base64");
    assert.ok(csp.includes(`style-src '${hash}';`), name + " style hash pinned in CSP");
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/, name);
    const connect = csp.match(/connect-src ([^;]+);/)[1].trim().split(/\s+/);
    assert.ok(connect.every(src => src === "'none'" || src === "'self'" || /^https:\/\/[A-Za-z0-9_-]+\.supabase\.co$/.test(src)), "connect-src " + connect);
    assert.doesNotMatch(html[name], /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/i, `Inline script in ${name}`);
    assert.doesNotMatch(html[name], /\sstyle="/i, `Inline style attribute in ${name}`);
    assert.doesNotMatch(html[name], /\son[a-z]+="/i, `Inline handler in ${name}`);
  }
  assert.match(js["config.js"], /supabaseUrl: "", anonKey: ""/, "Ships unconfigured; founder sets keys");
  assert.match(js["waitlist.js"], /if\(!configured\(\)\) return Promise\.resolve\(\{mode:"mailto"\}\)/, "fetch only after configuration");
});

test("site has no checkout, external runtime or secret", () => {
  for (const name of pages) {
    for (const m of html[name].matchAll(/<script[^>]*\bsrc="([^"]+)"/gi)) assert.match(m[1], /^assets\/js\/[\w-]+\.js$/, `Non-local script ${m[1]} in ${name}`);
    assert.doesNotMatch(html[name], /<link[^>]*rel="(?:stylesheet|preload|modulepreload|preconnect)"[^>]*href="https?:/i, `External stylesheet or font in ${name}`);
    assert.doesNotMatch(html[name], /(?:sk-proj-|sk_live_|BEGIN PRIVATE KEY|AWS_SECRET_ACCESS_KEY|service_role)/, `Secret in ${name}`);
    assert.doesNotMatch(html[name], /href="[^"]*(?:checkout|payment)|<button[^>]*>(?:Buy|Pay|Subscribe)/i, `Commercial action in ${name}`);
    assert.ok(!html[name].includes("®"), `Unsupported registered mark in ${name}`);
  }
  const code = js["waitlist.js"].replace(/return fetch\(cfg\.supabaseUrl\+"\/rest\/v1\/rpc\/join_waitlist"/, "") + js["site.js"];
  assert.doesNotMatch(code, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/, "Unexpected network call");
  assert.doesNotMatch(css, /url\(\s*["']?https?:/i, "External CSS resource");
});

test("pages carry no claims the site cannot back", () => {
  const all = pages.map(p => html[p]).join("\n");
  assert.doesNotMatch(all, /testimonial|trusted by|customers love|\d+\+? (?:clients|customers|users)|award-winning/i);
  assert.doesNotMatch(all, /chat assistant (?:is|answers)|homepage assistant/i);
  assert.match(html["index.html"], /None has been released publicly yet\./);
});

test("static 404 is small, branded and links home", () => {
  const nf = readFileSync("404.html", "utf8");
  assert.ok(Buffer.byteLength(nf) < 3072, "404 under 3 KB");
  assert.match(nf, /noindex/); assert.match(nf, /href="\/"/); assert.match(nf, /<h1>/);
  assert.doesNotMatch(nf, /<script/);
});

test("proof chain diagram is inline, labelled and small", () => {
  const svg = html["index.html"].match(/<svg[\s\S]*?<\/svg>/)[0];
  assert.match(svg, /role="img"/); assert.match(svg, /aria-label="The proof chain/);
  assert.ok(Buffer.byteLength(svg) < 4096);
  assert.equal((svg.match(/<circle[^>]*class="on"/g) || []).length, 1, "one orange node");
});
