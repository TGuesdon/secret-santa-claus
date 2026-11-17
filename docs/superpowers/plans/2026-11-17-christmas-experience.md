# Christmas Experience Implementation Plan

**Goal:** Deliver the approved responsive Christmas cartoon reveal experience.

**Architecture:** Preserve the existing encrypted draw loader. Separate the decorative
scene, the two-track audio clock and the React interaction state. Use CSS animation
for the present, with real audio playback time deciding when its recipient appears.

**Tech Stack:** React, TypeScript, CSS, HTMLAudioElement, Vitest.

## Approved direction

The final user-approved refinement replaces the cream canvas with saturated
Christmas-night blue, candy red and golden yellow. A larger Santa peeks over the
gift between illustrated reindeer and trees. Hanging bulbs, dispersed stars and
drifting, rotating gift icons make the scene deliberately kitsch and playful.

The French reveal action is available immediately. Intro autoplay is best effort;
a blocked browser exposes an optional sound control. Reveal starts the jingle,
grows the parcel to 155% and progressively accelerates its shaking. At 6.8 seconds,
the gift opens and the recipient appears in a gold-outlined oval. The jingle loops
with a fading ending. Sound and animation controls remain available.

The browser title stays exactly `Secret Santa`. Web UI is French; code, comments,
internal errors, documentation and emails remain English.

## Tasks

- [x] Add tests for direct access, 6.8-second secrecy, unavailable sound, slow fetch and
      link changes. Keep all existing loader security tests.
- [x] Implement `src/lib/soundtrack.ts`: user-triggered playback, audio-time reveal,
      silent fallback, volume fades, cleanup and looping.
- [x] Implement `src/components/ChristmasScene.tsx` and the responsive visual world
      in `src/style.css`; use original raster decoration and an animatable gift.
- [x] Update `src/App.tsx` with entrance, reveal, result and recovery states.
- [x] Self-host the display font; permit only the required build asset extensions.
- [x] Run the full CI command and inspect mobile and desktop, including result,
      keyboard operation, reduced motion and unavailable audio.
- [x] Finish with a readability pass and record the resulting design system.

## Verification evidence

- Full CI: 60 tests passed, plus TypeScript, ESLint, Prettier and production build.
- Browser: welcome and settled result at 1440px desktop and 390px mobile.
- Browser: silent, paused-motion reveal and focus transferred to the result.
- Browser: blocked intro autoplay, manual sound recovery, direct reveal, enlarged
  Santa, mobile gift growth, French page language and exact browser title.
- Tests: unavailable audio, actual playback-time drop, cleanup, fades, slow fetch,
  link changes, long names and all existing encrypted-loader guards.
- Isolated preview serves synthetic fixtures on port 5174; campaign files unchanged.
- Independent finish review: ship, no material UI fixes.
- The Impeccable context/detector engine was unavailable; its reference guidance,
  manual browser inspection and independent review were used directly.

## Review Focus

- Playback blocked or muted: the result still appears after six seconds.
- Audio buffering: use playback time while sound plays, with a bounded fallback.
- Slow or failed fetch: never show a guessed result; keep retry available.
- Link changes: stop old audio and ignore obsolete decrypted results.
- Long names and small screens: wrap text and keep controls reachable.
