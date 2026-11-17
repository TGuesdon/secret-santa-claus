# Asset provenance

## Christmas friends

`christmas-friends.webp` is an original illustration generated with the built-in
image generation tool on 2026-11-17. The transparent PNG was encoded as WebP at
quality 86 with Sharp. It contains no participant data.

Generation prompt:

> Use case: illustration-story. Create a polished original 2D Christmas cartoon
> illustration asset on a truly transparent background, wide landscape 3:2. Two
> adorable friendly reindeer flanking a small cluster of evergreen Christmas trees,
> wrapped cranberry-red and pale sage presents, little golden stars, warm ivory
> snow. Composition: reindeer on outer left and outer right facing slightly inward,
> trees and presents lower down, plenty of open transparent space in center and
> top; illustration occupies bottom two thirds. Cozy vintage children's Christmas
> picture book meets crisp contemporary animation art, rounded shapes, dark
> forest-green clean outlines, subtle printed gouache texture, extremely charming
> expressive faces, antlers and red knitted scarves, warm cream highlights. Tight
> harmonious palette cranberry #b92f3b, pine #173f35, sage #8fae90, butter yellow
> #e5ba69, warm cream #fff6df, caramel deer fur. Flat hand drawn cartoon, no 3D, no
> photorealism. No lettering, no words, no border, no UI. Entire objects fully
> inside canvas with transparent margin. This is an actual shipping website
> decorative illustration, high quality and sharp at 1200px wide.

## Santa

`santa.webp` is an original transparent Santa illustration generated with the built-in
image generation tool on 2026-11-17. It uses the Christmas friends illustration as a
style reference and is encoded as a 512px WebP at quality 88.

Generation prompt:

> Create a single original cartoon Santa Claus character asset on a genuinely transparent
> background. The attached reindeer illustration is STYLE REFERENCE ONLY: match its warm
> vintage children's Christmas picture-book gouache texture, crisp dark evergreen outlines,
> cranberry red #b92f3b, cream #fff6df, butter gold, friendly expressive eyes and softly
> rounded shapes. Subject: jolly Father Christmas upper-body portrait with iconic red hat,
> fluffy cream beard, rosy cheeks, smiling eyes, red coat, one mitten waving excitedly and
> other mitten resting on an invisible ledge. Looking at the viewer. Slight playful lean.
> Show full hat pompom and waving hand, no cut off contours. Isolated character, centered,
> transparent space around all edges. Compact square composition, fills canvas with 10 percent
> margin. No reindeer, no background, no text, no frame, no drop shadow, no extra scenery.
> Hand painted 2D cartoon, no 3D, no photorealism. This will peek from behind a present on a
> website; prioritize a very clear warm Santa face at 110px rendered width.

## Fredoka

`fredoka.ttf` comes from the official Google Fonts repository:
https://github.com/google/fonts/tree/main/ofl/fredoka

It is distributed under the SIL Open Font License, included in `FONT-LICENSE.txt`.

## Audio and favicon

The two MP3 files and Santa favicon in `public/` were supplied by the repository
owner. The initial UI change preserved them unchanged; the later authorized
audio compression is documented below.

## Loading optimizations (2026-11-17)

The source WebP illustrations and TTF remain available in this directory. Only
imported assets are emitted by Vite. Responsive derivatives use these commands:

```sh
cwebp -q 82 -m 6 -resize 640 0 src/assets/christmas-friends.webp -o src/assets/christmas-friends-640.webp
cwebp -q 82 -m 6 -resize 1024 0 src/assets/christmas-friends.webp -o src/assets/christmas-friends-1024.webp
cwebp -q 84 -m 6 -resize 256 0 src/assets/santa.webp -o src/assets/santa-256.webp
```

`fredoka.woff2` is a lossless WOFF2 conversion of `fredoka.ttf` using FontTools
4.68.0 and Brotli 1.2.1. All characters and variable weight axes are retained.
The original font license still applies. No font subsetting is performed, so
participant names keep the source font's character coverage.

The owner authorized audio compression on 2026-11-17. Both public MP3s were
re-encoded from the supplied originals to 128 kbit/s stereo at 44.1 kHz with
FFmpeg and libmp3lame. The original files remain in Git history. There is no
WAV source in this repository; decoding MP3 to WAV would not recover quality.

```sh
ffmpeg -i original.mp3 -map_metadata -1 -c:a libmp3lame -b:a 128k optimized.mp3
```

The intro decreases from 122,880 to 62,318 bytes, and the jingle from 1,922,239
to 1,282,341 bytes. Music, fades, looping and the 6.8-second reveal are retained.
MP3 encoder padding can slightly change the container duration; gapless metadata
preserves the decoded audio duration.
