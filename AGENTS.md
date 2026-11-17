# Secret Santa — repository guide

## Purpose

A static family Secret Santa built with React, TypeScript and Vite, hosted on GitHub Pages.
Node scripts generate assignments, encrypt individual results, create personal links and QR
codes, and send emails through Gmail SMTP with an app password. The same commands run locally and in
a manually triggered GitHub Actions workflow. The UI is a responsive Christmas cartoon
experience with a curtain entrance, a sleigh delivery and a musical letter reveal.

## Repository map

- `src/`: Vite root with HTML routes, React UI and shared browser-compatible encryption, links and draw loading.
- `src/config/`: React UI and `/config/` HTML entry for editing campaign JSON, imports and exports.
- `src/components/`: the React component library, including shared controls and the Christmas scene.
- `src/lib/participants.ts` and `assignment.ts`: shared CLI/browser validation and matching.
- `src/lib/soundtrack.ts`: intro/jingle playback, drop timing, fades and silent fallback.
- `src/assets/`: self-hosted display font and original Christmas illustration.
- `PRODUCT.md` and `DESIGN.md`: product intent and visual guidance.
- `scripts/`: campaigns, encrypted archives, private files, SMTP email delivery and CLI.
- `fixtures/demo.json`: four fictional participants with intentionally public test keys.
- `public/draws.json`: fictional demo encrypted draw.
- `public/campaigns/<id>/draws.json`: encrypted production results selected by `?campaign=<id>`.
- `state/campaigns/<id>/campaign.enc.json`: encrypted archives for GitHub Actions campaigns.
- `.private/`: ignored local private files, never published or uploaded as artifacts.
- `.github/workflows/`: CI, deployment and manually triggered campaign operations.
- `tests/`: crypto, assignment, delivery, recovery, CLI and UI tests.
- `public/jingle_bell.mp3`: user-provided music, copied unchanged into the built site.
  Preserve user-provided resources unless the task requires changes.
- `docs/superpowers/`: approved design, implementation plan and progress notes.
- `docs/screenshots/`: desktop and mobile captures using fictional demo participants.

## Design system

- The React component library in `src/components/` and its styles are the source of truth for
  appearance, interaction and accessibility. Shared tokens and base styles live in `src/style.css`.
- Reuse shared components, tokens and variants. Make changes to shared patterns in the library so
  the screens that use them inherit the change.
- Use `PRODUCT.md` for product intent and `DESIGN.md` for visual guidance. Use these Markdown
  files and the implemented UI when applying Impeccable. Skip Impeccable JSON sidecars and sync.

## Readability

Readability takes priority over brevity and line count. Code must not need to be mentally
unpacked before a maintainer can understand it.

- Write code, comments, documentation and internal errors in English.
  The web interface, its user-facing errors and emails are in French. Keep the browser title exactly `Secret Santa`.
  Preserve user-provided reference resources as supplied.
- Use one declaration and one statement per line. Do not chain variable declarations.
- Always use braces around conditionals and loops, including single-statement branches.
- Separate logical steps with blank lines: validation, preparation, side effects, return.
- Use descriptive names such as `participant`, `record` and `archivePath`. Short loop indices
  are fine for small conventional algorithms where their meaning is obvious.
- Keep functions focused. The CLI dispatches to named operations instead of containing every
  business rule in a deeply nested function.
- Break large validation conditions into small checks or named predicates. Avoid long chains
  of boolean operators, nested ternaries and clever syntax.
- Add short comments explaining constraints and decisions: persist before sending, uncertain
  delivery recovery, demo/production separation. Do not narrate every line.
- Apply these principles to tests and configuration too.
- Finish with a deliberate spacing and short-comment pass. Prettier alone is insufficient.
- Use ESLint and Prettier to maintain consistent formatting.
- Keep the project simple: no generic framework, plugin system or unnecessary abstractions.

## Commands

- `npm ci`: reproducible installation.
- `npm run dev`: local frontend.
- `npm run ci`: typecheck, lint, formatting check, tests and build; also used in Actions.
- `npm run lint:fix` and `npm run format`: automatic fixes.
- `npm run santa:demo`: generate four demo links and QR codes.
- `npm run santa:prepare -- --id <campaign>`: prepare or resume a campaign.
- `npm run santa:check -- --id <campaign>`: verify the archive and public JSON.
- `npm run santa:mail -- --id <campaign>`: dry-run; actual delivery requires `--send --confirm <campaign>`.
- `npm run santa:mail:test -- --to <email>`: explicitly send one real SMTP test email;
  the recipient defaults to the sender account when `--to` is omitted.
- `npm run santa:resolve -- --id <campaign>`: explicitly resolve an uncertain delivery.
- `npm run santa:archive:export -- --id <campaign>`: decrypt the Actions archive into `.private/campaigns/<id>/export.json` locally.
  Use `--archive .private/campaigns/<id>/campaign.enc.json` for a local campaign.

See the README for configuration and exact options.

## Invariants

- Building or deploying never generates a new draw.
- Every participant has an independent random AES-256-GCM key. No shared frontend secret.
- Never publish or log real names, emails, personal links, private keys or real QR codes.
- Tests and dry-runs never send Gmail messages.
- Persist intent before calling Gmail; persist confirmed success after Gmail responds.
- Uncertain delivery blocks automatic retries.
- Local and Actions campaigns use separate delivery state.
- Git conflicts, inconsistent archives and unpublished public data block delivery.
- Do not claim Gmail or hosted Actions/Pages verification without actually running it.
