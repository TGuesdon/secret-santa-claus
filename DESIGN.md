---
name: Secret Santa
description: A kitsch Christmas game stage for one personal surprise.
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
typography:
  display:
    fontFamily: Fredoka, sans-serif
    fontSize: clamp(46px, 5.5vw, 78px)
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: '-0.035em'
  recipient:
    fontFamily: Fredoka, sans-serif
    fontSize: clamp(40px, 6vw, 78px)
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: '-0.025em'
  brand:
    fontFamily: Fredoka, sans-serif
    fontSize: 25px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: '-0.025em'
  body:
    fontFamily: "'Trebuchet MS', system-ui, sans-serif"
    lineHeight: 1.5
  button:
    fontFamily: Fredoka, sans-serif
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.25
  control:
    fontFamily: "'Trebuchet MS', system-ui, sans-serif"
    fontSize: 13px
rounded:
  button: 14px
  control: 24px
  recipient: 50%
spacing:
  icon-gap: 8px
  control-gap: 10px
  compact: 20px
  content: 24px
  desktop-gutter: 48px
components:
  button-primary:
    backgroundColor: '{colors.candy-red}'
    textColor: '{colors.ivory}'
    typography: '{typography.button}'
    rounded: '{rounded.button}'
    padding: 17px 29px
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
    padding: 9px 14px
  recipient:
    backgroundColor: '{colors.night}'
    textColor: '{colors.ivory}'
    rounded: '{rounded.recipient}'
    padding: 24px 15px 28px
---

# Design System: Secret Santa

## Overview

**Creative North Star: "Kitsch Christmas game stage"**

A saturated Christmas-night blue stage holds a deliberately kitsch party of Santa,
reindeer, fir trees and presents. Golden headings, candy red actions, hanging fairy
lights and oversized blue geometry give the experience the exuberance of a game.
Rounded lettering and original picture-book characters keep it friendly and personal.

The illustration, waving Santa, drifting gifts, stars, snow and swinging bulbs surround one clear reveal
action. The recipient takes center stage after the musical build-up. Sound and
motion remain optional, with the same readable result in silent or reduced-motion
use. All web interface copy and user-facing errors are French; documentation,
internal errors remain English. Emails are French. The browser title is exactly `Secret Santa`.

**Key Characteristics:**

- Saturated blue, candy red, golden yellow and ivory lettering.
- Original cartoon Santa and reindeer, fairy lights and a separate animated gift.
- Rounded display type paired with familiar body lettering.
- Immediate reveal action, musical anticipation and a prominent recipient.

## Colors

The palette combines a saturated blue canvas, ivory lettering and bright festive
accents. The frontmatter records the extracted values; the stylesheet remains the
implementation.

### Primary

- **Candy red:** the main action and brand details. Hover and active variants
  provide feedback; the muted disabled variant marks waiting.

### Secondary

- **Christmas-night blue:** the full-page canvas and recipient surface. Darker blue
  controls and lighter blue geometric outlines extend the game-stage atmosphere.

### Tertiary

- **Golden yellow:** emphasized heading lines, the recipient name, stars and focus outlines.
  The preserved illustration, gift ribbons and confetti retain their own warm gold shades.

### Neutral

- **Ivory:** default lettering and primary button text.
- **Muted:** pale blue supporting copy, action notes and footer text.
- **Control surface / control border:** dark blue fill and lighter blue outline for sound and motion controls.

## Typography

**Display Font:** Fredoka, with sans-serif fallback.
**Body Font:** Trebuchet MS, with system-ui and sans-serif fallbacks.

Fredoka gives headings, the brand, buttons and gift tag their soft cartoon character.
Body lettering keeps instructions and control labels familiar. The self-hosted variable
font supports weights (300-700), uses swap loading and retains its SIL Open Font License.

### Hierarchy

- **Display:** balanced two-line headings; the second line takes golden emphasis.
- **Recipient:** stronger golden display lettering with wrapping anywhere for long names.
- **Brand:** compact Fredoka wordmark with a gift icon and candy red dot.
- **Body:** scene description (16px desktop, 14px mobile), with smaller action notes (13px).
- **Controls:** compact labels with bold state; icons retain accessible French names on mobile.

## Layout

The page is a vertical flex composition with a minimum small-viewport height (100svh).
The header and footer frame a centered experience: heading, scene, action. The header
caps at (1600px), the main content at (1440px), and the illustration stage at (1000px).
Desktop gutters use the frontmatter spacing token; the main area uses the content token.
A garland stretches across the upper edge. An outlined blue ring and rotated square
sit partly outside the canvas to frame the scene without competing with the result.

At widths up to (700px), gutters narrow to (20px), control labels become icon-only,
and the scene extends through the main gutters. The illustration widens to (112%)
and the gift scales to (0.82). Santa narrows from (230px) to (180px), with his
lower edge hidden behind the gift. The mobile stage gains a top margin (42px) to
protect the heading. Santa sits (144px) above the desktop stage bottom and (130px)
above the mobile stage bottom. The primary
action caps at (310px). Heading sizing becomes `clamp(38px, 8.8vw, 58px)` and
recipient sizing becomes `clamp(36px, 10vw, 58px)`.

At widths up to (380px), the heading is (37px) and the scene height is (260px).
At widths from (1400px) and heights from (850px), the stage gains more vertical room.
The body supports a minimum width of (320px). Revealed scenes use automatic height
and bottom space for the settled gift, allowing long names to expand the composition.
The target review widths are (390px) mobile and (1440px) desktop.

## Elevation & Depth

Depth is illustrative and tactile: outlined gift parts, inset shading, a blurred
ground shadow and a lifted primary action. The blue recipient oval separates the
name from scenery. On reveal, the backdrop fades to (0.75) opacity and Santa hides,
keeping the name prominent without cropping the character.

### Shadow Vocabulary

- **Primary action:** `0 8px 18px #071b4970`; hover uses `0 9px 24px #a0253238`.
- **Heading:** `0 4px 3px #102b60` gives the rounded lettering game-like depth.
- **Gift body:** `inset -16px 0 0 #aa2d38, inset 0 -12px 0 #b32e38` provides cartoon volume.
- **Gift ground:** a translucent warm ellipse with blur (10px) anchors the present.

## Shapes

Buttons use gently rounded rectangles; sound and motion controls use compact pills.
The result sits in a blue oval with a gold border (2px). The gift combines rounded box corners, thick outlines,
looped ribbon silhouettes and a tilted paper tag. Stars, circular snowflakes, rounded
bulbs, the large ring and rotated square repeat playful geometry.

## Components

### Buttons

The reveal action is a tactile candy red button with ivory text, a generous icon gap
(24px) and a minimum height (60px desktop, 58px mobile). Color and shadow transitions
last (180ms). Waiting disables the action and removes its shadow.

Quiet controls use a thin border, minimum height (44px), and background/border
transitions (160ms). Mobile controls keep a minimum width (44px). Both variants use
a gold keyboard outline (3px) offset by (5px); forced colors adds a system border.

### Header

The brand sits opposite sound and animation controls. The sound button uses
`aria-pressed` during normal playback and becomes an optional action labeled
"Activer le son" if autoplay is blocked. Animation state uses `aria-pressed`.
Both controls retain accessible French names when mobile hides visible labels.
Motion cannot be re-enabled against the system reduced-motion preference.

### Christmas scene

The original reindeer-and-trees illustration is preserved. A matching Santa peeks
over the present at a larger scale, with his lower edge obscured by the gift. He
waves through a gentle whole-character tilt and hides after the reveal. The gift
has two layers: an outer growth wrapper and an inner rattling parcel, keeping
progressive scale separate from increasingly rapid horizontal and rotational swings.
The lid, ribbon and body retain their opening choreography. Santa, stars, snow,
fairy lights, gifts and confetti are decorative and hidden from
assistive technology. Decorative background layers do not intercept pointer input.

Idle motion includes Santa wave (2.5s), bulb swing (3s), scene sway (4s), gift bob
(3s), star sway (3s) and slow falling snow (12-22s). Gift anticipation lasts (6.8s),
using `--reveal-duration` set from the exported `DROP_SECONDS` soundtrack constant.
During anticipation, the outer gift grows continuously from scale (1) to (1.55),
rising to (-34px). The inner parcel rattles with increasing amplitude and frequency,
reaching horizontal travel (15px) and rotation (15deg), then returning to center.
At reveal, the gift settles from its enlarged scale (1.55) over (0.9s), the lid
launches (1.1s), the recipient arrives
(0.9s), and confetti bursts (1.8s). Celebratory arrival uses
`cubic-bezier(0.16, 1, 0.3, 1)`. Animation runs only with no reduced-motion
preference and while the user has not paused motion; final scene states also exist
without animation.

The festive backdrop adds six small gift icons drifting along varied paths over
(7-12s), with near-full rotations in both directions. Their low opacity (0.4) keeps
them behind the main action. Eighteen sky stars drift gently over (5s), while ten
stage stars surround Santa and intensify during the reveal build-up. These layers
share the same pause and reduced-motion guards as the main scene.

### Recipient and feedback

The result contains a small label, a prominent golden name and a supporting message.
A gold border (2px) outlines the blue result oval. It is a status region and
receives programmatic focus without scrolling. The name
is mounted only after both decryption and the musical drop complete. French errors
use alert semantics and offer retry; malformed links show a direct explanation.

### Soundtrack

A valid invitation attempts to autoplay the looping intro. Browser restrictions
expose the optional "Activer le son" control; the reveal button is available
immediately and never depends on that extra click. Reveal fades the intro and
starts the jingle from the beginning; the name appears at its (6.8s) drop once data
is ready. Tracks fade over (450ms), play at volume (0.55) and loop. Blocked, muted
or stalled audio has a clock fallback so the result remains available. The sound
toggle remains available throughout.

### Asset provenance

`src/assets/christmas-friends.webp` is an original AI-generated illustration,
encoded from a transparent PNG. `src/assets/santa.webp` is a matching original
AI-generated transparent Santa, encoded at (512px). Both generation records are in
`src/assets/ASSETS.md`. Fredoka comes from the official Google Fonts repository
with its bundled license. The two MP3 files and Santa favicon were supplied by the
owner and are preserved.

## Do's and Don'ts

### Do:

- **Do** preserve the saturated blue, candy red and golden Christmas game-stage world.
- **Do** keep the golden recipient readable over the blue surface, including long names.
- **Do** preserve keyboard focus, accessible control names and independent sound and motion choices.
- **Do** keep Reveal immediately available and align gift anticipation with the shared 6.8-second drop.
- **Do** keep all web interface copy in French and the browser title exactly `Secret Santa`.

### Don't:

- **Don't** expose the recipient before the reveal completes.
- **Don't** require audio playback, a separate entrance click or animation to obtain the result.
- **Don't** restore the rejected cream page backdrop.
- **Don't** replace or modify the owner's audio and favicon as incidental design cleanup.
