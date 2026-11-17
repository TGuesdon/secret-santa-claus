# Design System for Secret Santa

## Overview

Secret Santa is a deliberately kitsch Christmas cartoon stage for a personal surprise. Santa,
reindeer, fir trees and fairy lights frame the delivery of a sealed letter. The campaign editor
uses the same palette and typography with a calmer layout for organizing a draw.

The [React component library](src/components/) and its styles are the source of truth for the
design system. This guide explains how to use those components. [PRODUCT.md](PRODUCT.md) describes
the audience and product goals. [Desktop and mobile captures](docs/screenshots/README.md) show
the experience in the browser.

## Colors

Use the shared tokens in [src/style.css](src/style.css).

- Christmas-night blue (`--night`) is the stage canvas. Ice blue (`--muted`) supports secondary copy.
- Candy red (`--red`) marks the brand and primary editor actions. Burgundy and red give the
  curtains, sleigh and wax seal their depth.
- Festive gold (`--gold`) highlights the second line of headings, stars, trim and focus rings.
- Warm ivory (`--text` and `--cream`) is the main foreground on blue and the paper color. The
  recipient name uses burgundy on the ivory sheet.
- The editor and quiet controls use the shared blue control tokens for surfaces, borders and hover.

## Typography

Fredoka gives the wordmark, headings, actions and recipient name their rounded character.
Trebuchet MS with system fallbacks supports body copy, controls and form labels.

The invitation uses a smaller two-line heading above the actionable letter. After the reveal,
the recipient name gets the strongest emphasis on the sheet and can wrap for long names.

## Layout

The stage fills the viewport, with a centered scene framed by the brand, sound and motion controls,
and footer. The mobile layout keeps the scene wide and presents the header controls as icons with
accessible names. The sheet grows with its content. Stage breakpoints live in
[src/style.css](src/style.css) and [StageCeremony.css](src/components/StageCeremony.css).

The editor places a campaign selector next to the editing panel on wide screens. Narrow layouts
stack the workspace and the participant fields. The editor's layout and form styles live in
[src/config/config.css](src/config/config.css).

## Elevation & Depth

The curtains use shaded folds, and layered scenery gives Santa room to move from the sky to the
foreground. Soft shadows separate the envelope and sheet from the illustration. The editor groups
content with blue surfaces and fine borders.

## Shapes

Rounded controls, fields and panels carry the cartoon style into the editor. Quiet controls and
exclusion chips use pill shapes. The envelope has rounded corners, a folded flap and a dark-red wax
seal. The result sheet has a thin border and ruled edges.

## Components

### Shared controls

- [Brand](src/components/Brand.tsx) combines the gift mark, wordmark and red punctuation.
- [Button](src/components/Button.tsx) provides `primary` for prominent editor actions and `quiet`
  for supporting actions. The stage sound and motion controls share the quiet-button styles.
- [FormField](src/components/FormField.tsx) associates the input with its label, hint and validation
  message. Preserve the visible gold focus treatment on keyboard-reachable controls.
- [Icon](src/components/Icons.tsx) provides the shared SVG icon set.

### Curtain, delivery and reveal

1. [StageCurtain](src/components/StageCurtain.tsx) opens from a click or tap on the fabric or
   keyboard activation. The panels repeatedly part just enough to hint at the scenery. Opening
   them starts the intro loop when sound is enabled.
2. [ChristmasScene](src/components/ChristmasScene.tsx) brings Santa in from the upper-left corner.
   The sleigh weaves down, drops the letter and loops out to the right. The invitation appears
   when the flight ends. A small recurring tremble draws attention to the letter.
3. Opening the letter builds toward the reveal cue in the
   [soundtrack controller](src/lib/soundtrack.ts). The dark-red seal breaks, the flap opens and an
   ivory sheet rises with the recipient name. Confetti follows in successive bursts and a larger
   finale.

Preserve the reveal when sound is muted or unavailable. The motion control and reduced-motion
preference skip the flight and decorative animation while keeping the letter and result usable.

### Campaign editor

Use the shared brand, controls and fields in [ConfigApp](src/config/ConfigApp.tsx). The selected
campaign uses a gold outline and lighter blue fill. Participant fields are grouped with fine
dividers, and exclusion chips wrap as needed.
