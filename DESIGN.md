---
name: Secret Santa
description: An exuberant Christmas cartoon stage for one personal surprise.
colors:
  candy-red: '#ce2945'
  candy-red-hover: '#cf233f'
  candy-red-active: '#a91835'
  candy-red-disabled: '#8d3557'
  night: '#173b78'
  gold: '#ffd36a'
  ivory: '#fff8e9'
  muted: '#d7e5ff'
  control-surface: '#183366'
  control-border: '#6c93cf'
  control-hover: '#234e91'
  campaign-field: '#102653'
  campaign-divider: '#41699e'
typography:
  display:
    fontFamily: 'Fredoka, sans-serif'
    fontSize: 'clamp(46px, 5.5vw, 78px)'
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: '-0.035em'
  config-title:
    fontFamily: 'Fredoka, sans-serif'
    fontSize: 'clamp(36px, 4vw, 56px)'
    fontWeight: 500
    lineHeight: 1.08
  recipient:
    fontFamily: 'Fredoka, sans-serif'
    fontSize: 'clamp(40px, 6vw, 78px)'
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: '-0.025em'
  brand:
    fontFamily: 'Fredoka, sans-serif'
    fontSize: 25px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: '-0.025em'
  body:
    fontFamily: "'Trebuchet MS', system-ui, sans-serif"
    lineHeight: 1.5
  button:
    fontFamily: 'Fredoka, sans-serif'
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.25
  control:
    fontFamily: "'Trebuchet MS', system-ui, sans-serif"
    fontSize: 13px
  label:
    fontFamily: "'Trebuchet MS', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 700
rounded:
  button: 14px
  field: 14px
  panel: 14px
  chip: 24px
  control: 24px
  tag: 3px
  recipient: 50%
spacing:
  icon-gap: 8px
  control-gap: 10px
  compact: 20px
  content: 24px
  desktop-gutter: 48px
  mobile-gutter: 20px
components:
  button-primary:
    backgroundColor: '{colors.candy-red}'
    textColor: '{colors.ivory}'
    typography: '{typography.button}'
    rounded: '{rounded.button}'
    padding: '17px 29px'
  button-primary-hover:
    backgroundColor: '{colors.candy-red-hover}'
  button-primary-active:
    backgroundColor: '{colors.candy-red-active}'
  button-primary-disabled:
    backgroundColor: '{colors.candy-red-disabled}'
  button-quiet:
    backgroundColor: '{colors.control-surface}'
    textColor: '{colors.ivory}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '9px 14px'
  campaign-field:
    backgroundColor: '{colors.campaign-field}'
    textColor: '{colors.ivory}'
    typography: '{typography.body}'
    rounded: '{rounded.field}'
    padding: '11px 12px'
  campaign-panel:
    backgroundColor: '{colors.control-surface}'
    textColor: '{colors.ivory}'
    rounded: '{rounded.panel}'
    padding: '28px'
  exclusion-chip:
    backgroundColor: '{colors.control-hover}'
    textColor: '{colors.ivory}'
    typography: '{typography.control}'
    rounded: '{rounded.chip}'
    padding: '8px 12px'
  recipient:
    backgroundColor: '{colors.night}'
    textColor: '{colors.ivory}'
    rounded: '{rounded.recipient}'
    padding: '24px 15px 28px'
---

# Design System: Secret Santa

## Overview

**Creative North Star: "Kitsch Christmas Game Stage"**

A Christmas-night blue stage gives the original Santa, reindeer, fir trees, fairy lights, and presents room to form an exuberant cartoon scene. Rounded display lettering and warm festive accents make the reveal feel like a personal Christmas game: generous, playful, and deliberately kitsch.

The illustration and animated gift frame one clear focal point. Before the reveal, the red action leads; afterward, the recipient's name takes center stage. The campaign editor carries the same palette and lettering into a calmer, more task-focused layout with restrained decoration.

**The One Reveal Focus Rule.** Keep the festive scene around one clear focal point: the reveal action before the result, then the recipient's name.

**Key Characteristics:**

- Christmas-night blue, candy red, festive gold, and warm ivory.
- Original picture-book Santa and reindeer art with a separate animated gift.
- Rounded Fredoka display type paired with familiar sans-serif body lettering.
- Tactile controls and an uncluttered campaign editor in the same visual world.

## Colors

The palette uses Christmas-night blue as its broad canvas, with candy red and festive gold reserved for lively accents and ivory lettering for clarity.

### Primary

- **Candy red:** carries the primary reveal action and the compact gift mark. Its hover, pressed, and disabled states stay within the same red family.

### Secondary

- **Christmas-night blue:** covers the main experience and the recipient surface. A darker blue supports controls and fields; lighter blue shapes frame the scene.

### Tertiary

- **Festive gold:** highlights the second line of headings, the recipient's name, the present ribbon, stars, and keyboard focus.

### Neutral

- **Warm ivory:** the main text and primary-action foreground.
- **Ice blue:** supporting copy, control outlines, and footer details.
- **Deep blue surfaces:** separate quiet controls, fields, and editor panels from the page canvas.

**The Gift Palette Rule.** Let blue carry most of the surface; use red and gold as small, high-salience accents.

## Typography

**Display Font:** Fredoka, with a sans-serif fallback.

**Body Font:** Trebuchet MS, followed by system UI sans-serif fallbacks.

Fredoka brings the rounded, cartoon character to headings, the wordmark, actions, and the recipient name. Familiar body lettering keeps instructions, controls, and longer editor content easy to scan.

### Hierarchy

- **Display** (weight 500, 46–78px fluid, line-height 1.02): balanced two-line headings on the reveal stage.
- **Configuration title** (weight 500, 36–56px fluid, line-height 1.08): the editor's welcoming page title, with a narrower mobile range.
- **Recipient** (weight 600, 40–78px fluid, line-height 1.06): the gold name in the result oval; long names may wrap anywhere.
- **Brand** (weight 500, 25px desktop): compact wordmark with a gift icon and red punctuation.
- **Body** (16px desktop, 14px mobile, line-height 1.5): descriptions and guidance; supporting notes step down to 12–14px.
- **Controls and labels** (13–14px): compact, readable text with bold form labels and clear state labels.

**The Name First Rule.** Keep the revealed recipient in the strongest type size and contrast on the result view.

## Layout

The reveal page is a full-height vertical composition. A wide header and footer frame a centered experience; the header caps at 1600px, the main column at 1440px, and the illustrated stage at 1000px. Desktop outer gutters are 48px, with 24px around the main content.

At 700px and below, the reveal page uses 20px gutters, icon-only control labels, a wider illustration, and a smaller gift and Santa. At 380px and below, the heading and scene tighten again. At wide, tall sizes, the stage gains extra height. The result view expands naturally for long names instead of clipping them.

The campaign editor shares the header width and palette but uses a two-column workspace: a campaign selector beside the editing panel. At 900px and below, the workspace becomes a single column; at 600px and below, gutters narrow, participant fields stack, and the main action fills the available width. Its content uses clear groups, short guidance lines, and consistent spacing rather than the reveal page's decorative stage.

## Elevation & Depth

Depth is illustrative and tactile. Layered scenery and blue geometric outlines establish the stage; inset shading gives the CSS gift volume; soft shadows ground the gift and lift the primary action. The editor uses tonal separation and thin outlines to group work without competing with the Christmas scene.

### Shadow Vocabulary

- **Primary action:** `0 8px 18px #071b4970`; hover increases the lift to `0 9px 24px #a0253238`.
- **Heading:** `0 4px 3px #102b60` adds separation against the illustrated stage.
- **Gift body:** `inset -16px 0 0 #aa2d38, inset 0 -12px 0 #b32e38` creates drawn parcel shading.
- **Gift ground:** a warm translucent ellipse with a 10px blur anchors the present.

**The Illustrated Depth Rule.** Use shadows to ground or lift an element; let artwork, outlines, and inset shading do the rest.

## Shapes

The form language is rounded and tactile. Primary buttons, fields, panels, and campaign selections use 14px corners; quiet controls and exclusion chips use pill shapes (24px). The gift tag has a small paper-like corner (3px), while the result sits in a broad oval. Thin borders organize editor surfaces, and gold focus outlines remain visible against blue.

The present combines a softly rounded box, thick outline, inset shading, looped ribbon shapes, and a tilted tag. Stars, snow, bulbs, and oversized background geometry repeat circles, arcs, and rounded silhouettes.

## Components

### Buttons

The reveal action is the boldest control: candy red, ivory Fredoka lettering, generous horizontal padding (17px 29px), and a minimum height of 60px. Hover and pressed states deepen the red; the disabled state loses its shadow. The compact editor version keeps the same treatment with smaller padding and type. Quiet controls use a dark-blue pill, a thin blue border, and a gold keyboard outline.

### Cards / Containers

The campaign editor panel uses a dark-blue surface, a thin blue divider, and 28px desktop padding, reducing to 20px 16px on mobile. The active campaign choice adds a gold outline and a lighter blue fill. Participant groups remain open and separated by fine dividers rather than nested cards.

### Inputs / Fields

Fields use a dark-blue fill, a blue border, and 14px corners. Labels are bold; helper text sits above the field when present. Keyboard focus gains a 3px gold outline, and invalid fields shift their border to gold while the message remains adjacent to the field.

### Chips

Exclusion chips use a lighter blue fill and outline, wrap onto additional rows, and keep their text aligned to the start. They remain clearly interactive controls rather than decorative tags.

### Navigation

Campaign choices form a compact selector with a gift icon, campaign name, and participant count. The active choice uses the gold outline and lighter blue surface; on narrower screens the choices form a responsive grid before stacking with the workspace.

### Christmas Scene and Recipient

The original illustration remains the visual anchor. Santa waves above a separately animated parcel; lights, stars, snow, and drifting gifts add motion behind the action. The reveal grows and rattles the parcel, then settles it as the lid opens and the recipient arrives. Motion respects reduced-motion settings and the user pause control.

The recipient sits in a gold-outlined blue oval with a clear label, large gold name, and short supporting line. The scenery recedes after reveal, while the result surface grows naturally on mobile and for long names.

## Do's and Don'ts

### Do:

- **Do** preserve the saturated blue stage, candy-red action, festive-gold accents, and warm ivory text.
- **Do** keep the reveal action or recipient as the strongest focal point for its state.
- **Do** preserve the original Christmas illustrations and the gift's layered, tactile construction.
- **Do** keep gold keyboard focus visible and honor reduced-motion preferences.
- **Do** keep the campaign editor calmer than the reveal page while retaining the same palette and type.

### Don't:

- **Don't** bring back the rejected cream page background.
- **Don't** let decorative stars, gifts, or motion obscure the action, editor content, or recipient.
- **Don't** clip long recipient names or narrow-screen form content.
- **Don't** remove visible focus states or rely on color alone to indicate the active campaign.
