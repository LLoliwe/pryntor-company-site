# Pryntor reference-led redesign · 28 October 2026

## Scope and provenance
Canonical repository: LLoliwe/pryntor-company-site. Production branch: release/pryntor-co-za-20261026.
Live baseline: dd13830da7a1d378605ac4401e3a89ede7b44e6d. The rejected intermediate presentation is preserved in checkpoint dab7e7d and matching before/after captures. This revision replaces the homepage and Expo presentation while preserving original logo, character, fonts, public information pages, analytics consent and five working experiments.

Pryntor is an independent technology and creative company in Durban, South Africa. Software, learning tools and visual experiences are introduced plainly. AI evaluation and robotics simulation are identified as research. No invented customers, adoption, savings or conversion claims.

## Primary journey
Homepage → illustrated specimen or Open Studio → working experiment → relevant company work or contact. No account required.
Poster: 24-character text, character scale, white/cobalt background, PNG download and Reset.
Wave: frequency, amplitude and play/pause.
Evidence: eight fictional arithmetic answers, confidence threshold and actual correctness.
Arm: two-joint movement, reachable target and new target.
Assembly: 36 blocks, scatter and reassemble.
These are website demonstrations, not finished commercial products or connected hardware.

## Implementation table
Direct desktop browser observations unless noted. Visual quality does not establish commercial effectiveness.

| Reference | Exact observed mechanism | Decision and user relevance | Location | Verification |
| --- | --- | --- | --- | --- |
| [Studio Freight](https://studiofreight.com/) | Small perimeter navigation, a field of image links around a central statement, white ground | A: closely reproduce the compositional mechanism using six Pryntor subjects | Homepage seven-column/five-row composition; two-column mobile specimens | Desktop/mobile rendering and specimen navigation |
| [PORTO ROCHA](https://www.portorocha.com/all) | Varied image proportions, small project names and short captions | A/B: asymmetric work presentation with independent copy/art | Selected work, 12-column 7/5 blocks; studio index | Image crops, caption readability, keyboard links |
| [Chrome Music Lab / Song Maker](https://musiclab.chromeexperiments.com/Song-Maker/) | No-account entry; note editing immediately; Save enables after input; link/MIDI/WAV/embed options | B: reproduce immediate creation and useful portable output | Poster editor, PNG download and Reset | Actual download reopened; reset restores initial state |
| Previous Pryntor presentation | Long introduction and repeated dark panels before comparing activities | C: concise explanation and image-led index, preserving direct links | Homepage and studio opening | Matching before/after captures |
| Cinematic WebGL intros | Mandatory motion can delay a useful action; WebGL unavailable in this test browser | D: exclude a mandatory intro or WebGL runtime | Primary journey | No compulsory animation or new runtime dependency |

Primary benchmark: Studio Freight. Specialists: PORTO ROCHA and Chrome Music Lab. These are adjacent experience benchmarks, not established direct commercial competitors. No customer-churn study, task-timing benchmark or conversion test was performed. Competitor mobile journeys remain unverified. Original HTML/CSS/JS, original artwork and existing Pryntor identity are used; competitor code, proprietary assets and branding are not included.

## Interaction specification
- Homepage reflows its introduction ahead of two-column specimens on mobile. Primary navigation remains visible.
- Studio has a five-experiment image index. All experiments and Escape return to it; fragments open a scene directly.
- Active scene has a visible h1; skip link preserves the scene. Native controls, visible results, keyboard navigation and focus recovery are retained.
- Poster export draws the current text, colour and same-origin character into Canvas 2D. Font loading, wrapping, letter spacing, Unicode, text fitting and uniform image sizing are handled. Export errors retain the work and offer retry.
- Wave animation starts only on request; scene exit, motion-off and page hiding stop it. Decorative entrance motion respects reduced-motion preference.
- Scripts-disabled studio explains its limitation with working work/about links and hides inactive demo controls.
- HTML-in-Canvas remains progressive enhancement. The HTML fallback is the tested production journey.

## Public evidence
The [GRIDSHIFT public repository](https://github.com/LLoliwe/gridshift-assurance) supplies the concrete prototype example. Synthetic fixture: 500 MWh × 0.960 tCO2e/MWh = 480 tCO2e. This is an illustrative inventory calculation, not emissions saved, an audited customer footprint or carbon neutrality. The repository documents its MIT-licensed offline prototype and limits.

## Artwork and revision sources
Two original concepts were created with the built-in image-generation tool, inspected and integrated. No paid third-party call or subscription was added. Both are conceptual illustrations, not photographs of functioning products. Existing character and wordmark bytes are unchanged.

| Artwork | Purpose | Final files | Sources |
| --- | --- | --- | --- |
| Assembly sculpture | Make modular software tangible | assets/art/assembly.webp and assembly-small.webp | assets/art/assembly-original.png |
| Wave sculpture | Make learning through interaction recognisable | assets/art/wave.webp and wave-small.webp | assets/art/wave-original.png |

Final derivatives are 1200px and 640px wide; total served WebP artwork is 133,372 bytes. ImageMagick only resized/compressed outputs. No layered/vector source was generated. Prompts below preserve the generation direction.

### Assembly prompt
Use case: stylized-concept. Asset type: original editorial artwork for Pryntor, a Durban technology and creative company. Create an exceptionally art-directed photographed physical sculpture about software built from independent parts. Landscape 3:2 composition, close-up, a low sculptural arrangement of precision-cut blocks interlocking into a strange but compelling machine, primarily vivid cobalt blue #1637F3, a few substantial safety-orange #FF461D pieces, off-white ceramic and tiny black joining pins. A cobalt sculptural arch spans two block towers; an orange rectangular beam slides through the arch. Real object scale, grounded contact shadows. Surface finish: thick pigmented painted wood, subtle honest fine grain and tiny edge wear, crisp machined geometry; gallery-quality studio still life photographed on a pale grey seamless floor. Raking sunlight from upper left, long graphic shadow to right, directional dramatic composition, generous white negative space around the sculpture but the object fills most of frame. Camera almost at floor height, 70mm lens, all parts sharp. Feel like a commissioned design magazine photograph of a handmade engineering maquette. No letters, no text, no logos, no eyes, no mascot, no UI, no glowing light, no chrome, no floating pieces, no gradients, no neon, no space, no glossy plastic AI blob. It should be bold, specific and tactile.

### Wave prompt
Use case: stylized-concept. Asset type: original editorial artwork for Pryntor's interactive learning experiments. Landscape 3:2 composition. A real tactile wave sculpture photographed in a design studio: a single long, continuous broad cobalt blue #1637F3 sheet formed into three graceful sine-wave folds, rising and falling across the image from left foreground to right rear. An orange #FF461D narrow ribbon precisely follows one edge with a slight phase shift. Thick matte painted aluminium, delicate physical shadows, slight visible surface texture. White rectangular gallery plinth on a vivid cobalt floor and cobalt backdrop, the blue sheet is distinguished by grazing daylight and crisp edge lighting. The folds are monumental, architectural and clean, like a beautifully constructed physical model in a science museum. Asymmetric tight composition, low three-quarter view, real material plausibility, 80mm architectural photography, editorial precision. This is concept art about making abstract ideas tangible, not a scientific diagram. No text, no logos, no gradients, no UI, no labels, no generic spheres, no holograms, no floating elements, no chrome, no futuristic city, no extra objects.

## Verification
Cloud Chromium, 28 October 2026:
- 14 automated tests pass: arithmetic fixtures/thresholds, kinematics, sine geometry, reversible blocks, renderer recovery and local resources. Native-renderer tests use API doubles.
- Actual homepage → studio → poster editing, background change, PNG download, reopened bitmap and Reset.
- Wave at frequency 5.0 and play/pause, stopping on scene exit; evidence at 70% gives four accepted/two wrong; arm target reached at 80°/−70°, new target clears success; assembly/scatter returns 0/100.
- Separate reviewer checked all five narrow scenes, 24 unbroken poster characters, 125% character scale, keyboard navigation, headings, skip link and no-JavaScript fallback.
- Homepage and studio index checked at 320/390/768/1440px iframe wrapper widths; actual content widths 305/375/753/1425px because of desktop scrollbars. No horizontal document overflow. Simulated layouts, not physical device tests.
- Matching desktop and 390px-wrapper before/after captures; before is checkpoint dab7e7d.
- Script syntax and git whitespace checks pass. No new dependency, backend, tracking integration or persisted input.
- Original logo, character and font assets unchanged.

Remaining: native HTML-in-Canvas pixels/input/accessibility geometry, physical iPhone/Safari, full screen-reader/contrast/performance audits, customer preference research and conversion testing. Reviews and automated checks are evidence of specific behaviour, not proof of visual excellence or superiority. The user retains final art-direction judgement.
