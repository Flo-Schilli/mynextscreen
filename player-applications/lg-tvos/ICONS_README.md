# Icons

`icon.svg` is the source. The two PNGs the webOS packager needs are generated
from it:

| File | Size | Used for |
| --- | --- | --- |
| `icon.png` | 80×80 | launcher tile |
| `largeIcon.png` | 130×130 | launcher tile, larger layouts |

`largeIcon.svg` is the same drawing at a different `width`/`height`; both share
one `viewBox`, so editing `icon.svg` and re-deriving is enough.

## Regenerate after editing

```bash
sed 's|width="80" height="80">|width="130" height="130">|' icon.svg > largeIcon.svg
rsvg-convert -w 80 -h 80 icon.svg -o icon.png
rsvg-convert -w 130 -h 130 largeIcon.svg -o largeIcon.png
```

With ImageMagick instead of `rsvg-convert`:

```bash
magick -background none icon.svg -resize 80x80 icon.png
magick -background none largeIcon.svg -resize 130x130 largeIcon.png
```

## Why it is flat

An LG launcher draws this at 80 px on a screen people look at from across a
room. The detailed brand illustration (`apps/frontend/public/mynextscreen-icon.png`)
is unreadable at that size — try it at 32 px and nothing survives. This icon is
two rectangles and a gradient, which is all that reads: two screens for the
name, teal-to-amber for the brand.
