---
version: alpha
name: Pryntor
description: Public website identity for Pryntor (Pty) Ltd, Durban. Format follows google-labs-code/design.md (Apache-2.0).
colors:
  primary: "#1637F3"
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#0A0C12"
  accent: "#FF461D"
  on-accent: "#0A0C12"
  muted-on-dark: "#CDD0D6"
  muted-on-light: "#545860"
  rule-dark: "#2A2D33"
  rule-light: "#E3E5E8"
typography:
  display-xl:
    fontFamily: Inter Display
    fontWeight: 700
    fontSize: 172px
    lineHeight: 0.92
    letterSpacing: -0.045em
  display-l:
    fontFamily: Inter Display
    fontWeight: 700
    fontSize: 120px
    lineHeight: 0.92
    letterSpacing: -0.045em
  body-md:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 17px
    lineHeight: 1.55
  lede:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 21px
    lineHeight: 1.5
  label-mono:
    fontFamily: ui-monospace
    fontWeight: 500
    fontSize: 12px
    letterSpacing: 0.14em
rounded:
  none: 0px
spacing:
  gutter: 72px
  section: 160px
  row: 28px
  field: 12px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.none}"
    height: 52px
  button-secondary-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    height: 52px
  section-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  section-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  caption-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted-on-dark}"
  caption-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-on-light}"
  rule:
    backgroundColor: "{colors.rule-dark}"
    textColor: "{colors.rule-light}"
---

## Overview

Make the change. Prove the chain. The identity is Typography & Identity Repair R1, confirmed by the founder on 22 Oct 2026 (the Adam deck is a pitch deck, not the brand guide): cobalt, pure white and ink chapters alternating, orange-red as the action colour, yellow only for punctuation and micro accents, the original PRYNTOR wordmark and the Pryntor character, very large Inter Display statements, and small mono labels. The voice is plain and checkable. No theatre.

The site is an experience through typography, rhythm and restraint, not through effects. Motion explains the proof chain; it never decorates.

## Colors

- **Cobalt (#1637F3):** hero and conversion chapters; white text on cobalt is 6.9:1.
- **Ink (#0A0C12):** dark chapters, primary text on white.
- **Yellow (#FFD626):** full stops, rule marks and tiny accents only. Never text on white.
- **Pure white (#FFFFFF):** light chapters. Never cream, never off-white.
- **Orange-red (#FF461D):** the action colour. Button fills with ink text; as text only on ink. Never body text on white or cobalt.
- Greys exist only for captions and rules.

## Typography

- Inter Display Bold for statements and headings, Inter Regular and Medium for text. Self-hosted, subset, licensed under the SIL Open Font License (assets/fonts/LICENSE-Inter-OFL.txt).
- Headlines are short sentences ending with a full stop. Line two is often the accent line.
- Mono labels are editorial captions placed beside or after a heading, never as a kicker above it.

## Layout

- Display sizes are fluid: display-xl is clamp(54px, 10.5vw, 172px) and display-l is clamp(44px, 7.4vw, 120px); the tokens record the maximum.
- Max width 1320px, fluid gutter clamp(20px, 5vw, 72px).
- Chapters have generous vertical padding. Numbered rows use hairline rules.
- Section heads put the heading first and the numbered label beside it (wide screens) or after it (narrow screens).

## Elevation & Depth

Flat. No shadows, glass, gradients, glows or orbs. Depth comes from the cobalt, white and ink alternation and the character.

## Shapes

Square corners everywhere. Hairlines (1px) and one heavier orange rule to mark the current step.

## Components

- Buttons: square, 52px high. Primary is orange-red with ink text. Secondary is outlined.
- Proof chain: an inline SVG of four nodes on a hairline. Only the selected node is orange. It draws once when its chapter enters view.
- Tabs follow the WAI-ARIA tabs pattern with arrow, Home and End keys.
- Early list form: email, explicit POPIA consent checkbox, inline error with role="alert", mailto fallback while the list service is unconfigured.

## Motion

Durations come from Fluid Functionalism (MIT, github.com/mickadesign/fluid-functionalism): fast 80ms, moderate 160ms, slow 240ms; exits 60, 120 and 160ms; ease-out. Long reveals (900ms) and the diagram draw (1400ms) are the only exceptions. Every duration becomes 0ms under prefers-reduced-motion, and the Motion toggle pauses everything. Sound is off by default.

## Do's and Don'ts

- Do use the real uppercase PRYNTOR wordmark PNG. Do not redraw it or use a lowercase "pryntor" mark.
- The Pryntor character (mascot) was approved for public release by the founder on 22 Oct 2026 and is a central brand element: hero presence and brand moments. Use only the R3 master (`original_mascot.png`, md5 eb06ad49) via the optimised derivatives `assets/img/pryntor-mascot-{480,960}.{avif,webp}`. Never redraw, recolour, crop into a new character or generate lookalikes. Always give descriptive alt text.
- Do not invent logos, testimonials, clients, metrics or capabilities. Ventures are named only after they clear their release gates.
- No em dashes in company-facing copy.
- No third-party requests, trackers, fonts or scripts. No Three.js, GSAP or React on this site.
- Business email only through hello@, partnerships@ and operations@pryntor.co.za.
- No marquees, auto-playing loops or eyebrow kickers above headlines.

## Lint exceptions

impeccable (Apache-2.0) runs in tests/design-lint.test.mjs against the rendered pages. Recorded exceptions in .impeccable/config.json:

- overused-font (Inter, Inter Display): the founder-approved brand typeface. Distinctiveness comes from scale, colour and layout.
- numbered-section-labels (advisory): numbered editorial labels are part of the Adam deck identity. They sit beside headings, not above them.

The static file mode of impeccable is not used as the gate because it cannot resolve the dark chapter backgrounds and reports false contrast failures; the rendered scan measures real computed colours.
