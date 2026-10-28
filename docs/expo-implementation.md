# Pryntor Expo, 28 October 2026

## Source and brief

Update the existing Pryntor website with an Expo-style HTML-in-Canvas experience.
Canonical repository: LLoliwe/pryntor-company-site. Production branch:
`release/pryntor-co-za-20261026`. Baseline: `9a4d553d40e014f851e1f7f77d95abdc9b3697d5`.
The baseline homepage SHA-256 exactly matched https://pryntor.co.za/ before editing:
`cde54aa1f25fa10f829c9f793d2331ca46ac5de1130386235fe4e7071bfae602`.

Audience: people exploring Pryntor's original work, including mobile visitors.
Primary journey: homepage > Enter Expo mode > select an area > read its current
status > follow the method/work link or email contact. Preserve the current
homepage, existing navigation, consent flow, legal copy and all approved assets.

Composition: an explorable exhibition of the five existing work areas. Selection
moves from the spatial overview to a readable exhibit. No invented performance,
product availability, launches, partners or adoption ranking.

## Implementation

- `expo.html`, `assets/css/expo.css`, `assets/js/expo.js`: semantic HTML, optional
  native `drawElementImage` rendering, CSS spatial view, native anchors, explicit
  navigation and motion control, deep links and keyboard focus handling.
- Compatibility includes the current `content="drawable"` / `drawable` API and
  the earlier `layoutsubtree` and DOMMatrix-returning API. Real DOM nodes are
  drawn in `onpaint`; no screenshot rasterizer or third-party rendering library.
- Unsupported features, drawing errors, request errors, context loss and an
  initial paint timeout restore the HTML nodes. Rendering status only announces
  native activation after successful draw calls. No continuous canvas loop.
- Native bitmap is capped at 2175 × 1350 (DPR 1.5). New page/CSS/JS total is under
  28 KB uncompressed, excluding reused fonts and character assets.
- No new dependencies, network APIs, tracking, storage, microphone, sound or
  collection of personal data. Existing analytics implementation is unchanged.
- Homepage adds one Expo link; sitemap includes the new route. Existing homepage
  style hash still matches its CSP. No host, DNS, audience or stack migration.

## Skills and design references

Read and applied `design-taste-frontend`: source identity, existing brand,
progressive enhancement, mobile and evidence gates. `polish-brand-social-design`:
reuse the exact logo and mascot files without redrawing or changing base colours.
Read `reverse-engineer-anything`: its ordinary-source-repository route applies;
no reverse-engineering installation or execution was needed.

Read the newly shared `Insposite-design-reference.md` and consulted
https://www.insposite.com/. Selected references were https://emilkowal.ski/ and
https://chanhdai.com/. Adapted ideas: a clear project index, compact controls,
and purposeful selection feedback. Emil Kowalski's guidance at
https://emilkowal.ski/ui/you-dont-need-animations informed immediate keyboard
transitions and user-triggered spatial motion. No third-party code, artwork or
fonts were copied from these references.

API sources checked on 28 October 2026:
- https://wicg.github.io/html-in-canvas/
- https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts

The API is experimental. No claim that Pryntor is the world's second adopter.

## Asset record

All logos, character images and Inter font files are the exact assets already
present on the production branch. No asset bytes changed. Inter's existing OFL
licence stays in `assets/fonts/LICENSE-Inter-OFL.txt`. The interface diagrams are
original CSS geometry for this implementation, not product screenshots. The
mascot is presented as the existing brand character, not as a rigged 3D asset.

## Verification actually performed

- `node --check assets/js/expo.js`: pass.
- `node --test tests/expo.test.mjs`: 10 tests passed. Navigation, deep links,
  keyboard focus, Escape, motion controls, native/legacy adapter contracts,
  errors, missing paints, context loss, print fallback and no external calls.
  Native API tests use explicit doubles. They do not prove native browser drawing.
- Local-resource targets, XML sitemap, retained homepage CSP hash and
  `git diff --check`: pass.
- Cloud Chromium browser inspected the running local preview via the supported
  preview service. Homepage entry, exhibit selection/detail destination,
  next/previous/overview, motion, Escape and return to homepage worked.
- Rendered widths 320, 390, 768 and 1440 CSS pixels via same-origin iframe test
  viewports: document scrollWidth equalled viewport width at each size. Screens
  were visually inspected. At 390px all six exhibit selectors measured 44px high.
  This is browser viewport testing, not physical phone testing.
- Scripts-disabled iframe: all five exhibits are visible semantic links, with
  a no-JavaScript explanation. No unusable JS-only controls are shown.
- Available browser reports HTML/CSS fallback. No application console errors
  observed; browser-extension metadata errors were present and unrelated.

## Limitations

Native HTML-in-Canvas rendering is implemented but not exercised in a real
flag-enabled browser in this session. Physical iPhone/Safari, screen-reader
and full accessibility audits remain unverified. Self-review only; no independent
human/design approval is claimed. The fallback is the verified public path.
