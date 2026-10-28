# Editorial R5 · 29 October 2026

Founder rejected R4's execution. Baseline: f474a50381891dff08ac2aca48b606b272bd94e6. It remains recoverable in Git history.

## Defects addressed
- The six-part collage created competing focal points and a large empty centre. Replaced it with one literal company introduction and a substantial, functioning poster editor.
- Conceptual sculptures did not predict the actual controls behind them. Removed repeated conceptual artwork from the homepage; the opening visual is the thing visitors actually edit and download.
- GRIDSHIFT appeared as isolated numbers. It now has a named case, a plain explanation, a synthetic-data qualifier and a pinned public source example.
- Supporting demos now form a compact, labelled sequence: wave, answer check, arm and blocks. Original identities, public information pages and working studio scenes remain intact.

## New primary journey
Homepage → type a headline → choose blue/white → download a PNG. Reset returns the original words and colour. No registration, navigation or external service is required. The homepage and Open Studio share the same export module. Input is written as text, never evaluated or persisted.

Desktop pairs the company introduction and controls with the actual portrait artwork. Phone layout uses compact literal copy, editor controls, then artwork in one column. Primary targets are at least 44px high; no mandatory animation or decorative loading sequence.

## Evidence and ownership
The exact approved Pryntor wordmark, fonts and character are retained. No new generated artwork is needed for this revision. R4 artwork remains available in the repository and studio index.

GRIDSHIFT fixture: https://github.com/LLoliwe/gridshift-assurance/blob/ae8f53d466a7d203635972c5b414b7977a7858c6/fixtures/demo_energy_2024.json
The displayed 500 MWh × 0.960 = 480 tCO2e is an illustrative inventory calculation, not emissions savings, audited data or a customer result. The homepage presentation is an explanation, not a claimed screenshot of the CLI.

## Verification
- 15 tests pass, including shared export wrapping for long unbroken headlines, explicit line breaks and Unicode.
- Browser: homepage edit, background change, reset, downloaded PNG reopened and visually inspected. Existing Open Studio poster export checked after sharing the helper.
- Separate AI reviewer checked desktop and 320/390px wrappers, including 24 wide letters. No horizontal document overflow. Reviewer found a mobile line-break whitespace defect; fixed.
- Local preview is HTTP. Its copy of index.html omits upgrade-insecure-requests to avoid upgrading images to a different HTTPS origin and tainting canvas. Canonical production source retains its existing CSP. This preview-only difference must not be mistaken for production verification; the final public HTTPS download is checked separately.
- Physical iPhone/Safari, native HTML-in-Canvas rendering, complete screen-reader/contrast/performance audits and founder visual acceptance remain unverified. This revision does not claim superior conversion or customer preference.
