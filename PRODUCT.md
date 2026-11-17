# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Secret Santa participants opening a private email link or QR code on mobile or desktop.

## Product Purpose

Reveal one assigned gift recipient through a joyful Christmas experience.

## Capabilities and Constraints

- React, TypeScript and Vite, deployed as static files on GitHub Pages.
- Personal results are decrypted in the browser with the key in the URL fragment.
- Preserve campaign generation, encrypted data, SMTP delivery and recovery workflows.
- Code, documentation and internal errors are in English. The web UI is in French.
- The browser title is exactly `Secret Santa`.
- Keep code readable, focused and maintainable.

## Brand Commitments

An exuberant, deliberately kitsch Christmas cartoon world with presents, Santa,
reindeer, fir trees and hanging fairy lights. The user requested a bold game-like
atmosphere instead of a cream backdrop and delegated the final background color.
The chosen palette is saturated Christmas-night blue, candy red and golden yellow.
The reveal button is available immediately. Intro music attempts autoplay; browser
restrictions expose an optional sound control. The recipient appears at 6.8 seconds.

## Evidence on Hand

- User-provided `public/intro_loop.mp3` and `public/jingle_bell.mp3`.
- Existing Santa favicon.
- Four fictional demo participants in `fixtures/demo.json`.

## Product Principles

- Keep personal results private until the participant chooses to reveal.
- Make the same experience comfortable on phones and desktop screens.
- Sound and motion are optional; the result must remain accessible without either.
