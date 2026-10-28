# Pryntor Expo 02 · 28 October 2026

## Source and scope

Canonical repository: `LLoliwe/pryntor-company-site`.
Production branch: `release/pryntor-co-za-20261026`.
Baseline for this rebuild: `c9426bb9f2788e0ff265d0697347db62e03768c4`.
The user requested an ambitious upgrade informed by award-winning interactive
sites. The existing homepage, approved identity, source repository, public
content boundaries and deployment destination are retained.

Audience: curious visitors, potential collaborators and mobile users.
Primary journey: homepage → Expo → manipulate an experiment → inspect the
consequence → visit the existing work/method page or contact Pryntor.

The visible idea is a playable workbench: five different ways to make an idea
tangible. This replaces the first edition's five descriptive portfolio tiles.
All experiments are explicitly illustrative, original website demonstrations.
No private venture source/assets or unreleased product demonstrations are used.
No product availability, customer, performance or adoption-ranking claim is made.

## Working experience

- Assembly field: 36 original CSS blocks, a reversible disorder slider, scatter
  and assemble buttons, and direct pointer/keyboard activation of the field.
- Wave laboratory: actual sine-wave geometry with frequency/amplitude inputs and
  optional phase animation. Animation starts only on request and can be paused.
- Evidence sorting: eight visibly fictional fixtures. Threshold filtering and
  answer reveal demonstrate why confidence does not guarantee correctness.
  Counters are computed from the same fixtures displayed in the two lanes.
- Poster studio: editable local text, uniform character scaling and two approved
  backdrop colours. Uses the exact existing corporate character asset.
- Reach study: planar forward kinematics for a two-link arm. Angles and endpoint
  coordinates are computed together. No robot or external service is connected.
- Spatial overview: direct chapter navigation, bounded pointer dragging,
  zoom/fit, keyboard selection, deep links and a session-only visited count.

The responsive design reflows the editorial introduction and controls on phones.
It does not shrink a whole desktop scene to make the controls fit. Initial
loading has no continuous animation. The only requestAnimationFrame loop is the
user-started wave, capped to approximately 30 updates per second. It pauses on
scene exit, page hiding and motion-off. Reduced-motion preferences are honoured.

## HTML-in-Canvas

`expo-renderer.mjs` progressively draws the active room's actual DOM subtree,
including native inputs, SVGs, text and images, into a 2D canvas. Uses the modern
`content="drawable"`, `drawable`, `onpaint`, `requestPaint()` and
`drawElementImage()` interfaces. The browser synchronises input geometry.

The backing bitmap tracks the current room and viewport, with DPR capped at 2.
Only one room is mounted into a canvas at a time. Original DOM nodes and their
input values are restored on scene changes. Unsupported APIs, drawing/request
errors, context loss and a 1.6-second first-paint timeout preserve the HTML view
and focused input. Native status is reported only after a successful draw.

Google's current docs state the API shipped in Chrome 157. The first edition's
blanket experimental-only caveat is superseded. Other browsers still need the
fallback. Sources checked on 28 October 2026:

- https://developer.chrome.com/docs/web-platform/html-in-canvas/2d?hl=en
- https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts?hl=en
- https://developer.chrome.com/blog/html-in-canvas-ot-changes

No rasterisation library, third-party runtime, network requests, trackers,
persisted form values, external integrations or audio are added. Expo source
(HTML, CSS and three JS modules) is about 49 KB uncompressed, excluding reused
fonts/images. Existing homepage analytics and consent behaviour are unchanged.

## Design references and ownership

Applied the installed `design-taste-frontend` and `polish-brand-social-design`
instructions, and the user's `Insposite-design-reference.md`. Read
`reverse-engineer-anything`; its ordinary source-code route applies. No
reverse-engineering executable or uninstalled design tool is claimed as run.

Research references:

- CSS Design Awards: Lusion v3, Website of the Year 2023:
  https://www.cssdesignawards.com/blog/2023-website-of-the-year-winners/394/
- CSS Design Awards: Bruno Simon portfolio, Website of the Year 2019:
  https://www.cssdesignawards.com/blog/website-of-the-year-2019-winners/330/
- https://lusion.co/ and https://bruno-simon.com/ were opened for direct visual
  research. Their WebGL scenes did not render in this cloud browser. Lusion's
  console explicitly reported WebGL unavailable. No claim of completing their
  full interactive experience is made. Award evidence and published descriptions
  support the reference selection, not a claim that today's sites match the
  historical award versions.
- https://www.shopify.com/uk/editions/fall2026 rendered successfully. Inspected
  its section navigation, spatial overview and interactive content organisation.
  No claim that its Expo-specific mode was exercised in this browser is made.
- https://www.insposite.com/, https://emilkowal.ski/ and https://chanhdai.com/
  informed the earlier selection/index and purposeful-motion work.

Adapted principles: a memorable input-driven hero; a playable explanation of an
idea; clear navigation through a spatial collection; direct controls with
visible consequences. This is original implementation, not copied third-party
source, artwork, video, music, fonts or branding. All Pryntor logo, mascot and
Inter font bytes remain unchanged. Existing OFL licence is retained.

## Verification

- `node --check` on the entry script and renderer: pass.
- `node --test tests/expo.test.mjs`: 12 passed. Meaningful coverage includes
  threshold ties/empty/all/error counts; known arm poses and full allowed reach;
  sine geometry; deterministic reversible assembly; native adapter errors,
  resizing, focus restoration and context loss; local resource availability.
- Native-renderer tests use explicit API doubles. They do not prove native
  browser drawing, input hit testing or accessibility geometry.
- Browser fallback: assembly buttons and direct Enter activation; wave frequency
  input and playback; answer reveal; poster text/backdrop; arm angle extremes;
  overview drag/zoom/fit and map entry; motion-off stopping playback.
- All six views checked in browser iframe viewports at 320, 390, 768 and 1440
  CSS pixels: document scrollWidth equals viewport width. This is responsive
  browser testing, not physical-device testing.
- Visually reviewed desktop assembly, wave, evidence, poster and map, plus
  phone assembly and the smallest evidence layout with all eight samples in one
  lane. Fixed block clipping and arm bounds. Result copy and labels enlarged.
- Scripts-disabled fallback shows explanatory text and real work/method links;
  JS navigation and demo controls are hidden. No dead interactive field role.
- No application console errors observed. Browser-extension metadata errors
  were unrelated. Retained homepage CSP style hash and XML sitemap pass.
- `git diff --check`: pass. No asset bytes changed.

## Remaining limits

The available browser exercised the HTML fallback, not native HTML-in-Canvas.
A compatible native browser/device pass remains necessary to verify its actual
pixels, input mapping and accessibility geometry. Physical iPhone/Safari,
screen-reader and full accessibility/performance audits remain unverified.
This is self-review, not independent human or founder art approval. No claim of
being an award winner or the world's second adopter is made.
