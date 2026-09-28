# Running on a Raspberry Pi

Yes — with caveats worth knowing before you start, because two of them will
decide whether this is a good idea for your venue.

There are two different jobs a Pi can do here, and they have almost nothing in
common. Pick the one you mean.

|                                             |                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [**Pi as a display**](#a-pi-as-a-display)   | It sits behind a screen and plays what it is told. Cheap, quiet, entirely sensible.                      |
| [**Pi as the server**](#a-pi-as-the-server) | It runs the backend, database, queue and FFmpeg for the whole venue. Possible, and the caveats are real. |

---

## A Pi as a display

This is the easy one and the Pi is good at it. A display runs the player, which
is a web page: any Pi from the 3B+ onwards with a browser in kiosk mode works,
and a Pi Zero 2 W manages still images.

```bash
sudo apt install chromium-browser unclutter
```

Start Chromium pointed at your player URL, full screen, with the cursor hidden:

```bash
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  https://player.example.com
```

The screen shows a six-digit pairing code; claim it in the dashboard and it
starts playing. Everything after that is the same as any other display — see
[screens.md](screens.md).

Worth setting up alongside:

- **Auto-start** — a systemd user service or your desktop's autostart entry, so
  a power cut brings the screen back without a keyboard.
- **No screen blanking** — `xset s off -dpms`, or the equivalent in your
  compositor. A signage display that sleeps is a black rectangle.
- **`cage` or plain X with no window manager** rather than a full desktop; less
  to go wrong, less to update.

Video playback is the one thing to test on your own footage. A Pi 4 or 5 decodes
H.264 in hardware and plays 1080p comfortably; 4K is a different conversation,
and Chromium's hardware decoding support on the Pi has historically been
uneven. If video stutters, re-encode your content to 1080p first — the platform
already transcodes to H.264 for exactly this reason.

---

## A Pi as the server

Possible, and people do it. The images are built for it; what decides whether
it is a good idea is what you ask it to encode.

### The images are built for the Pi

Every image is published as a multi-architecture manifest covering `linux/amd64`
and `linux/arm64`, each built natively rather than emulated. `podman pull`
resolves the right one on its own, so nothing about the installation differs
from any other host:

```bash
podman pull ghcr.io/flo-schilli/mynextscreen/backend:0.11.0
```

Check what a tag actually contains:

```bash
podman manifest inspect ghcr.io/flo-schilli/mynextscreen/backend:0.11.0
```

A 32-bit OS is the one thing that will not work — the images are `arm64`, not
`armhf`. `uname -m` must say `aarch64`.

Building on the Pi yourself still works if you want to, and is the path for a
fork that does not publish images:

```bash
git clone https://github.com/Flo-Schilli/mynextscreen.git
cd mynextscreen
npm run images:build
```

Expect that to take a while: it installs the full dependency set and compiles
two Angular applications.

### Transcoding is CPU work, and the Pi 5 made it harder

Uploads are transcoded with FFmpeg, and live streams are transcoded
continuously. Neither uses hardware acceleration on a Pi:

- The **Pi 4** has an H.264 hardware encoder reachable through V4L2 M2M. This
  project does not use it — it calls FFmpeg with software encoding for
  predictable output across platforms.
- The **Pi 5 has no H.264 hardware encoder at all.** It gained a better CPU and
  lost the encoder block, which is the opposite trade from the one you want
  here.

Check what your board actually offers:

```bash
ffmpeg -hide_banner -encoders | grep -i v4l2
```

What that means in practice:

- **Uploads** are a one-off cost. A few minutes of 1080p video will take several
  times its own length to transcode. Annoying, not fatal; the dashboard shows
  progress and the rest of the system stays usable.
- **Live streams are the real limit.** A continuous 1080p encode will occupy a
  Pi 5 almost entirely. Set `MAX_CONCURRENT_LIVE_STREAMS=1` and do not plan a
  venue around more than one.

If live streaming matters to you, put the server on something with an x86 CPU or
a GPU and keep the Pis as displays.

### Sizing

|             |                                                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Board**   | Pi 5 with 8 GB, or Pi 4 with 8 GB. 4 GB works for a handful of screens with no live streaming.                                                                                                  |
| **OS**      | 64-bit Raspberry Pi OS (or any arm64 Linux). A 32-bit image cannot run these containers.                                                                                                        |
| **Storage** | **An SSD over USB 3, or NVMe on a Pi 5.** Not an SD card. PostgreSQL's write pattern and a growing media library will wear a card out, and a corrupted card takes the venue's schedule with it. |
| **Network** | Wired. Every display holds an open SSE connection and pulls media over HTTP.                                                                                                                    |
| **Cooling** | Active. Sustained FFmpeg work will thermally throttle a passively cooled Pi, which turns a slow transcode into a much slower one.                                                               |

### Setup

Everything in [installation.md](installation.md) applies unchanged — including
the Ansible playbook, which is written for rootless Podman and pulls the same
images. There is no Pi-specific branch to follow.

For development, `npm run dev` works as it does anywhere: the compose file names
no architecture and every image it pulls has an arm64 build.

### Backups matter more here

A Pi under a bar is likelier to lose power than a rented server. The database
holds every screen, playlist and schedule you have built:

```bash
ansible-playbook download_db.yml
```

Media lives on the filesystem and is not in that dump — back it up separately.

---

## Would I recommend it?

**As displays: yes, without reservation.** That is what the hardware is for.

**As the server: for a small venue with a handful of screens, images and
pre-encoded video, yes.** It will sit there and work.

**Not if live streaming is part of the plan.** That is the one workload where
the Pi has no headroom and no hardware to fall back on, and discovering it
during a show is the wrong time.
