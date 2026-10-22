// Deterministic design lint with impeccable (Apache-2.0, https://github.com/pbakaus/impeccable).
// Scans the rendered pages (URL mode) so section backgrounds and computed contrast are real.
// The static file mode cannot resolve dark section backgrounds and reports false contrast findings; see DESIGN.md.
// Brand exceptions live in .impeccable/config.json with reasons. Any other finding fails the test.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";

const bin = new URL("../node_modules/.bin/impeccable", import.meta.url).pathname;
const TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2"};

test("impeccable finds no anti-patterns on rendered pages", {skip: !existsSync(bin) && "impeccable not installed (npm install)"}, async () => {
  const root = new URL("../", import.meta.url);
  const server = createServer(async (req, res) => {
    let p = new URL(req.url, "http://x").pathname; if (p === "/") p = "/index.html";
    if (!/^\/(?:[\w-]+\.html|assets\/(?:css|js|img|fonts)\/[\w.-]+)$/.test(p) || !existsSync(new URL("." + p, root))) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {"Content-Type": TYPES[p.slice(p.lastIndexOf("."))]}); res.end(await readFile(new URL("." + p, root)));
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const page of ["/", "/method.html", "/about.html", "/privacy.html", "/terms.html"]) for (const vp of ["1280x800", "390x844"]) {
      const out = await new Promise(resolve => execFile(bin, ["detect", "--json", "--viewport", vp, base + page], {env: {...process.env, IMPECCABLE_NO_TELEMETRY: "1"}, timeout: 120000, maxBuffer: 1 << 24}, (err, stdout) => resolve(stdout)));
      const findings = JSON.parse(out || "[]").filter(f => !f.advisory);
      assert.deepEqual(findings.map(f => f.antipattern + ": " + (f.snippet || f.description || "").slice(0, 80)), [], `${page} at ${vp}`);
    }
  } finally { server.close(); }
});
