![Secret Santa Christmas scene](docs/screenshots/desktop.jpg)

# Secret Santa

A static family Secret Santa with encrypted personal results, QR codes and Gmail delivery.
React + TypeScript + Vite on GitHub Pages; Node scripts run locally and in manual GitHub Actions.
The responsive Christmas cartoon interface includes a musical, animated gift reveal.

[Browse the desktop and mobile screenshots](docs/screenshots/README.md).

## Quick start

Use Node.js **22.12 or newer** and npm. Node 22 is used in CI.

```sh
npm ci
npm run dev
```

The local app selects `public/campaigns/<id>/draws.json` from `?campaign=<id>`. Queryless demo links read `public/draws.json`. Open a personal link belonging to
that draw. The links below work when the public file contains the fictional demo.
To generate that demo and create its four QR codes:

```sh
npm run santa:demo
```

Demo output is in `.private/demo/links.json` and `.private/demo/qr/1.png` through `4.png`.
Demo keys are intentionally public and must never be reused for real participants.

| Participant | Expected recipient | Local demo link                                                                                                |
| ----------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Alice       | Bob                | [Reveal Alice](http://localhost:5173/#v1.AQEBAQEBAQEBAQEBAQEBAQ.AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE)   |
| Bob         | Charlie            | [Reveal Bob](http://localhost:5173/#v1.AgICAgICAgICAgICAgICAg.AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI)     |
| Charlie     | Diane              | [Reveal Charlie](http://localhost:5173/#v1.AwMDAwMDAwMDAwMDAwMDAw.AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM) |
| Diane       | Alice              | [Reveal Diane](http://localhost:5173/#v1.BAQEBAQEBAQEBAQEBAQEBA.BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ)   |

For a deployed demo, replace `http://localhost:5173/` with the actual site URL, keeping the
entire `#v1.ID.KEY` fragment. To generate QR codes for that URL:

```sh
npm run santa:demo -- --base-url https://pjdevs.github.io/secret-santa-claus/
```

That is an example deployment address, not a claim that the site is currently deployed.
Demo generation refuses to replace a real campaign.

## Christmas experience

Open a valid invitation to reach the reveal button directly. The looping intro
attempts autoplay; when blocked, **Activer le son** enables it with a user gesture.
The intro requests audible playback immediately: starting at zero volume and fading
up can make Firefox pause an initially permitted silent autoplay.
**Révéler mon tirage** starts the jingle and unwraps the gift at 6.8 seconds of playback.
The result is decrypted during the build-up and stays
out of the page until the drop. A slow connection waits for the verified result.

The jingle loops with a short fade at its end. The sound control fades music out
before pausing. Blocked, unavailable or disabled audio uses a silent reveal clock.
Motion can be paused, and the system's reduced-motion preference disables movement.
Both controls remain available after the result appears.

The web interface and emails are in French. Code, documentation and internal errors
stay in English. The browser title is exactly `Secret Santa`.

The display font and illustration are self-hosted. Asset origins and the generation
prompt are documented in `src/assets/ASSETS.md`; no external image or font request
is needed at runtime.

## Development checks

### Asset locations

`public/` holds files served unchanged at stable URLs: music, the favicon and the
encrypted draw. `src/assets/` holds illustrations and fonts imported by the app;
Vite bundles them with content-hashed filenames for caching and deployment paths.
Documentation screenshots live in `docs/screenshots/` and are not shipped with the app.

### Verification

```sh
npm run ci
```

This runs typecheck, ESLint, Prettier verification, all tests and the production build.
It is also the single verification command used by GitHub Actions after `npm ci`.

| Command                                   | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `npm run typecheck`                       | Strict TypeScript checks                     |
| `npm run lint` / `npm run lint:fix`       | Check / fix ESLint issues                    |
| `npm run format:check` / `npm run format` | Check / apply formatting                     |
| `npm test` / `npm run test:watch`         | Tests once / watch mode                      |
| `npm run build`                           | Build and check the public artifact boundary |
| `npm run preview`                         | Serve the production build locally           |

ESLint enforces braces, separate declarations and one statement per line. The repository
guide in `AGENTS.md` also requires spaced logical blocks and short explanatory comments.
TypeScript is pinned to the 6.0 release line supported by the installed TypeScript ESLint parser.

## How it works

1. An explicit command validates participants and generates a cryptographically random
   permutation in which nobody draws themselves and everyone receives one gift.
2. Each participant receives an independent random AES-256-GCM key and opaque ID.
3. `public/campaigns/<id>/draws.json` stores encrypted individual entries with fresh 96-bit IVs and authentication tags.
4. A personal URL contains `?campaign=<id>#v1.ID.KEY`. Its secret fragment is not sent in HTTP requests.
5. The browser loads the JSON and decrypts only that participant's result after a reveal click.
6. Email contains the personal link and a matching CID-embedded QR image, with text and HTML alternatives.

Routine builds and deployments only republish the existing JSON. They never generate assignments.
No database, permanent backend, accounts or analytics are needed.

## Configuration

Copy `.env.example` to `.env` and keep real values private. Node commands load `.env` automatically;
Vite reads `PUBLIC_BASE_URL` for the deployment subpath. `.env`, `.private/` and `dist/` are ignored.

Generate an archive key once:

```sh
npm run santa:key
```

Save the generated base64url value as `SANTA_ARCHIVE_KEY` and back it up privately. Unlike the
public demo keys, this key must never be committed. It is needed to recover or resume a real campaign.

| Name                          | GitHub location | Used for                                                                         |
| ----------------------------- | --------------- | -------------------------------------------------------------------------------- |
| `SANTA_PARTICIPANTS_JSON`     | Secret          | Object mapping campaign IDs to arrays of `{ "name": "...", "email": "..." }`     |
| `SANTA_ARCHIVE_KEY`           | Secret          | 32-byte random base64url archive key                                             |
| `GOOGLE_APPLICATION_PASSWORD` | Secret          | Gmail app password for SMTP authentication                                       |
| `PUBLIC_BASE_URL`             | Variable        | Full site URL ending in `/`, e.g. `https://pjdevs.github.io/secret-santa-claus/` |
| `SANTA_SENDER_EMAIL`          | Variable        | Gmail account address used to authenticate and send                              |
| `SANTA_SENDER_NAME`           | Variable        | Optional display name; defaults to `Santa Claus 🎅`                              |

The base URL must use HTTPS, except for loopback local testing, and have no credentials,
query or fragment. Participant names and email addresses must be unique after normalization.

## Simultaneous campaigns

The same repository and Pages site can host family, friends and later years simultaneously.
Each production command requires `--id <campaign>`. IDs use 1 to 64 lowercase ASCII letters,
digits or hyphens, beginning with a letter or digit. IDs are public and should not contain
private information. A personal URL looks like `https://example.com/santa/?campaign=family-2026#v1.ID.KEY`.

Set the single Actions secret `SANTA_PARTICIPANTS_JSON` to an object such as this fictional example:

```json
{
  "family-2026": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ],
  "friends-2026": [
    { "name": "Charlie", "email": "charlie@example.com" },
    { "name": "Diane", "email": "diane@example.com" }
  ]
}
```

The workflow's `campaign` input selects its list. A missing entry fails before generation.
Local `--participants` files still contain one participant array. Repeating preparation resumes
saved assignments; changing the secret does not redraw an existing campaign.

| Data                       | Path                                           |
| -------------------------- | ---------------------------------------------- |
| Published encrypted draw   | `public/campaigns/<id>/draws.json`             |
| Encrypted Actions archive  | `state/campaigns/<id>/campaign.enc.json`       |
| Encrypted local archive    | `.private/campaigns/<id>/campaign.enc.json`    |
| Private links and QR codes | `.private/campaigns/<id>/links.json` and `qr/` |
| Private mail previews      | `.private/campaigns/<id>/emails/`              |
| Decrypted local export     | `.private/campaigns/<id>/export.json`          |

Local and Actions executors cannot own the same ID. Local commands may inspect an Actions
archive, but cannot send or modify it. Operations remain serialized across all campaigns.

This layout breaks compatibility with previous root production archives and links. There is
no automatic migration; old archives are not resumed. Queryless links are reserved for the demo.

## Configure Gmail SMTP

Set `SANTA_SENDER_EMAIL` to your Gmail account address and `GOOGLE_APPLICATION_PASSWORD`
to its app password in the ignored `.env`. In GitHub Actions, use the variable and secret
listed above. No Google Cloud project, OAuth client or refresh token is required.

The transport connects to `smtp.gmail.com:465` over TLS using
[Nodemailer's SMTP transport](https://nodemailer.com/smtp). Spaces in a copied app password
are removed automatically. Use an app password rather than your normal Google password;
see [Google's app-password instructions](https://support.google.com/accounts/answer/185833).
Never put the password in workflow inputs, logs or committed files.

Dry-runs do not require this password or connect to SMTP. Real sends keep the original MIME
Message-ID and require SMTP recipient acceptance before recording success. SMTP acceptance
does not guarantee inbox delivery; check sent mail and bounces when testing.

To send one plain test email to `SANTA_SENDER_EMAIL`, without preparing or changing a draw:

```sh
npm run santa:mail:test
# Or choose a recipient:
npm run santa:mail:test -- --to recipient@example.com
```

This command sends a real email using `.env`. It needs only `SANTA_SENDER_EMAIL` and
`GOOGLE_APPLICATION_PASSWORD`; no archive key, participant list or running web server is needed.
The sender is always `SANTA_SENDER_EMAIL`. The recipient defaults to that same address;
`--to` overrides it. Look for **Secret Santa: SMTP test** in the recipient's inbox or spam folder.

## Test a real campaign locally

Use a dedicated campaign ID for live local testing, distinct from any Actions campaign.
Use two or more real addresses you control; the demo addresses are fictional.

Create `.private/participants.json`:

```json
[
  { "name": "First tester", "email": "first-address-you-control@example.com" },
  { "name": "Second tester", "email": "second-address-you-control@example.com" }
]
```

Replace these examples with real controlled addresses. Set `PUBLIC_BASE_URL=http://localhost:5173/`
and your archive/sender configuration in `.env`, then run:

```sh
npm run santa:prepare -- --id local-test --participants .private/participants.json
npm run santa:check -- --id local-test
npm run santa:mail -- --id local-test
npm run dev
```

Preparation creates `.private/campaigns/local-test/campaign.enc.json`, private links/QR in
`.private/campaigns/local-test/` and the encrypted `public/campaigns/local-test/draws.json`.
Dry-run writes `.eml` previews to `.private/campaigns/local-test/emails/`
without requiring Gmail credentials or making Gmail calls. Open previews in an email client.

With the dev server still running in another terminal, Gmail configured and previews checked:

```sh
npm run santa:check -- --id local-test --published
npm run santa:mail -- --id local-test --send --confirm local-test
```

Actual delivery first verifies that the exact campaign JSON is available at its base URL.
The local server must remain reachable when recipients open localhost links; such links are
only suitable for your own-machine testing. Use an HTTPS test deployment for other devices.
Repeating preparation with the same ID resumes the saved campaign. A different ID creates an independent campaign.

## Set up GitHub Pages

The repository remote is `pjdevs/secret-santa-claus`. Push the reviewed code to its default
branch when ready. Both `main` and `master` are supported: workflows use the repository's
actual default branch rather than a hardcoded name.

In repository **Settings → Pages**, choose **GitHub Actions** as the build source. Check that
the `github-pages` environment allows deployments from the default branch. CI verifies pull
requests and pushes; only the default branch deploys. Demo deployment requires no Gmail secrets.
`PUBLIC_BASE_URL` is recommended; the ordinary demo workflow otherwise derives a project Pages URL.

Workflows use the official checkout/setup-node and
[Pages deployment actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
They upload **only `dist/`**. Private manifests, QR files and archives are excluded.

## Day-of manual workflow

Set the secrets and variables above in repository **Settings → Secrets and variables → Actions**.
Allow the state-writing jobs to commit/push to the default branch. If branch protection or
organization policy prevents GITHUB_TOKEN writes, arrange an authorized exception before
the event. A refused commit/push stops the operation; the scripts never force a push.

Open **Actions → Secret Santa → Run workflow**, select the default branch and use one campaign ID:

1. **prepare**: generate, persist and deploy. No emails are sent. Save the archive key privately.
2. **simulate**: compose and validate messages without sending or exporting private artifacts.
3. **send**: enter the campaign ID again in `confirmation`. Sends only pending messages after
   checking that the deployed JSON matches the persisted archive.
4. **resolve**: only for an uncertain delivery, after inspecting sent mail as described below.

If deployment fails after the preparation commit, rerun **prepare** with the same ID. It restores
the exact saved JSON rather than drawing again. A normal frontend push also preserves that draw.
Preparation deploys directly because [GITHUB_TOKEN pushes do not normally trigger push workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

### Complete campaign in one run

Open **Actions → Secret Santa complete campaign → Run workflow** on the default
branch. Enter the same campaign ID in `campaign` and `confirmation`. This authorizes
real email delivery after preparation, simulation, CI and Pages deployment succeed.

The workflow waits for the exact saved draw to appear on Pages before enabling
Gmail. It uses the existing repository secrets and variables. Rerunning the same
campaign resumes its saved state and skips confirmed deliveries; uncertain
deliveries still require the separate **resolve** operation.

Campaign operations and deployments share a concurrency group and do not cancel active sends.
Deployment rejects a build that no longer matches the default branch. Avoid manually editing
campaign state or starting unrelated repository changes while an operation is running.

## Recover an interrupted send

Each participant progresses through `pending → sending → sent`. The encrypted archive is
saved before Gmail is called and after Gmail confirms success. Actions persists each transition
by commit/push; local execution uses atomic file replacement and an exclusive lock.

A timeout after Gmail accepts a message can leave its status `sending`. **There is no automatic
retry of an uncertain send.** Confirmed `sent` records are skipped on subsequent sends.

1. Run **simulate** again. It prints uncertain **opaque record IDs** and their expected MIME
   Message-IDs, never personal links or addresses.
2. In the sender's Gmail, search sent mail using `in:sent rfc822msgid:OPAQUE_ID.CAMPAIGN@secret-santa.invalid`.
   Check the actual message, not just whether the workflow failed.
3. If sent, run **resolve** with the record ID, `status=sent`, the confirmed Message-ID and exact
   campaign confirmation. Otherwise, only after establishing that no message was sent, use
   `status=pending` to permit a later retry.
4. Run **send** again with the same campaign ID. Already confirmed deliveries remain skipped.

Equivalent local resolution:

```sh
npm run santa:resolve -- --id local-test --confirm local-test --record OPAQUE_ID --status pending
npm run santa:resolve -- --id local-test --confirm local-test --record OPAQUE_ID --status sent --message-id CONFIRMED_MESSAGE_ID
```

Choose one outcome, not both. Local commands cannot change or send an Actions campaign.
You may inspect an Actions archive locally using `santa:check -- --id <campaign>` or `santa:mail -- --id <campaign>` after pulling
the latest branch and providing its archive key. Real plaintext previews remain ignored.

### Decrypt an archive locally

With the matching `SANTA_ARCHIVE_KEY` in `.env`, export the Actions archive:

```sh
npm run santa:archive:export -- --id family-2026
```

The ID selects `state/campaigns/<id>/campaign.enc.json`. Output is written to
`.private/campaigns/<id>/export.json`.
`records[].id` contains participant IDs and `records[].url` contains personal links.
The full plaintext also contains emails, individual keys, assignments and statuses;
keep it private. The encrypted archive and public draw are unchanged.

For a local archive:

```sh
npm run santa:archive:export -- --archive .private/campaigns/local-test/campaign.enc.json
```

Export is local only, does not send mail and never prints private records to stdout.

## Security boundary and troubleshooting

- Public: frontend assets, encrypted draw, encrypted Actions archive, fictional demo fixtures.
- Private: participant list, archive key, individual keys/URLs, real QR codes, SMTP app password.
- The organizer can inspect every assignment through the archive. Participants only have their
  own key. Links can be forwarded; anyone holding one can reveal its result.
- Back up the archive key. Losing it cannot be fixed using Gmail credentials. Do not regenerate
  a draw to recover email state: that invalidates existing links.
- Multiple campaigns coexist by ID. There is no automatic reset, rename or deletion command.
- Generic CLI failures deliberately omit raw JSON, Git and service errors to avoid leaking data.
  Check required variables, key length, participant validity, campaign ID/base URL, matching
  archive/JSON, correct executor, current remote branch and repository write permissions.
- If a local process was forcibly stopped, first confirm no operation is running before manually
  removing `.private/operation.lock`. Then inspect delivery state before resuming.
- `santa:demo` writes only the root demo draw and refuses to overwrite non-demo root data.

## Repository layout

`src/lib/` contains shared crypto, links and the public draw loader. `scripts/` separates
participants, generation, archive validation, storage/checkpoints, command operations, MIME
composition and Gmail SMTP transport. Root `index.html` is the Vite entry and is transformed
during builds. `public/` contains files copied unchanged to the site, including `jingle_bell.mp3`.
Add new public asset types explicitly to the build guard before publishing them.
`AGENTS.md` documents code readability and the repository invariants.

Local automated verification covers the application and simulated delivery. Sending a real
Gmail message and running hosted Actions/Pages still require your Google/GitHub configuration;
neither is implied by passing tests or a local build.
