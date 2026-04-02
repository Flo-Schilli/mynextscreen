# Icons

For the LG WebOS application to work properly, you need to provide two PNG icon files:

1. **icon.png** - 80x80 pixels
2. **largeIcon.png** - 130x130 pixels

## Creating Icons

You can use the provided SVG files (icon.svg and largeIcon.svg) to generate PNG files:

### Using Inkscape:
```bash
inkscape icon.svg --export-filename=icon.png --export-width=80 --export-height=80
inkscape largeIcon.svg --export-filename=largeIcon.png --export-width=130 --export-height=130
```

### Using rsvg-convert:
```bash
rsvg-convert -w 80 -h 80 icon.svg -o icon.png
rsvg-convert -w 130 -h 130 largeIcon.svg -o largeIcon.png
```

### Using ImageMagick:
```bash
convert -background none -resize 80x80 icon.svg icon.png
convert -background none -resize 130x130 largeIcon.svg largeIcon.png
```

Alternatively, you can create your own icon images using any image editor.
