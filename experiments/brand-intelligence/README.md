# Pryntor Growth OS / AI Visibility Workbench

**Status:** Original, internal, browser-executable research prototype, 19 October 2026. **Do not merge, publish, or treat as independently approved.**

This feature is staged within the **existing** company-site source repo and the **existing** [PRY-128 Growth OS brand-positioning workstream](https://linear.app/pryntor/issue/PRY-128/p1-research-and-positioning-zero-copy-brand-and-category-strategy). The root website and its release hold are unchanged.

## Running

Open `index.html` in a browser (or serve the folder locally). Pure HTML, CSS and JavaScript with no external scripts, trackers, network fetches, billing or scheduled runs.

## Working features

- Dashboard filters for brand, market and research persona; mention/rank/source coverage reports with visible denominators.
- Prompt-level discovery and response inspection, model comparison and synthetic sample warnings.
- Local persona creation and removal.
- CSV/JSON import/export with validation; imported rows are labelled **user-imported, unverified**.
- Original deterministic creative briefs from individual prompt gaps, exported to Markdown.
- Offline text-readiness GEO checklist (no live URL fetch or real ranking estimate).
- Share of Model weekly **Brand-module** credit estimator based on documented per-model rates, with no execution capability.

**Trust boundary:** Every initial model response is an invented synthetic fixture, **not** an actual ChatGPT, Gemini, Claude or Perplexity answer. Imported responses require independent validation. We do not claim access to Share of Model internals or model weights.

## Evidence and limitations

Local Chromium Playwright interaction check on widths 1440, 768, 390 and 350: navigation, persona creation, creative brief and download, GEO checks, 6/12-credit scenario, CSV export and import, zero page errors and zero horizontal overflow all passed. Browser test harness used `page.set_content` due to sandbox restrictions on navigation, so this does **not** prove external hosting or Safari behaviour.

**Remaining gates:** iOS Safari/device verification, keyboard/screen-reader review, independent code and data/privacy review, real-model measurement adapters with explicit run budgets, rights/claims review, and founder-controlled publication approval.

## Reference products (public facts only)

- https://help.trypencil.com/en/articles/16035254-what-is-share-of-model-and-how-does-it-use-your-pencil-generations
- https://help.trypencil.com/en/articles/11949968-how-can-i-use-the-share-of-model-agent-and-creative-scores
- https://shareofmodel.ai/platform/search-visibility
- https://trypencil.com/the-platform

This is Pryntor-owned original implementation of general research workflows, not a copy of Pencil/Share of Model source code, branding, data, private routes or licensed model internals.
