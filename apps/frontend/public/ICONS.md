# Favicon

`favicon.svg` is the source; `favicon.ico` is generated from it and carries the
16, 32 and 48 px sizes. The same pair is copied into `apps/player/public`.

```bash
for s in 16 32 48; do rsvg-convert -w $s -h $s favicon.svg -o /tmp/ico-$s.png; done
magick /tmp/ico-16.png /tmp/ico-32.png /tmp/ico-48.png favicon.ico
```

Browsers that understand `image/svg+xml` take the SVG (see `src/index.html`);
the rest fall back to the `.ico`.

## Why it is not the brand illustration

`mynextscreen-icon.png` is the detailed mark — stacked screens, waveform, glow.
It is a good hero image and an unusable favicon: below roughly 64 px its
structure collapses into a smudge, and a favicon is drawn at 16. This drawing is
two rectangles and a gradient, optically sized for that: the front screen is
larger and the stand heavier than in the webOS launcher icon
(`player-applications/lg-tvos/icon.svg`), which has 80 px to work with.
