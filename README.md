# pryntor-company-site
Pryntor original company website — source-controlled, evidence-gated static candidate

## Local checks

Run `node --test tests/site.test.mjs` for the dependency-free static contract.
For browser checks, install the same Playwright version as CI:

```sh
npm install --no-save --ignore-scripts --no-audit --no-fund playwright@1.64.1
npx playwright install chromium
node --test tests/browser.test.mjs
```

If Chromium is already provisioned locally, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute executable path. CI keeps
using Playwright's pinned browser by default. Mobile checks include keyboard
activation of all four menu destinations and explicit focus transfer when the
navigation collapses. Passing these checks does not grant publication approval.
