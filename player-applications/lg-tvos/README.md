# myNextScreen — LG webOS Application

LG WebOS application that acts as a thin shell, loading the web player in a fullscreen iframe and telling it which server it belongs to.

## Features

- **Settings UI**: Configure Server URL and an optional Player URL directly on the TV
- **Disconnect**: Unpair the display from the remote, without a keyboard or a pointer
- **No credential on the device**: The screen enrols itself with a pairing code, so there is nothing to type in and nothing to steal from the settings overlay
- **Self-healing**: The player runs on a rotating session token and renews it on its own
- **Compatible**: Works with LG WebOS 2024 and newer

## How It Works

The LG app is a deployment vehicle for the existing web player, not a separate player implementation.

1. **First Launch**: The settings overlay opens automatically, prompting for the Server URL
2. **iframe Loading**: The app loads the web player at the Player URL (fetched from `{Server URL}/api/config`, or set by hand) in a fullscreen iframe
3. **Handoff**: After the iframe loads, the app posts the server URL to the player's own origin:
   ```javascript
   iframe.contentWindow.postMessage({
     type: 'signage-connect',
     serverUrl: '...'
   }, playerOrigin);
   ```
4. **Pairing**: The player shows a six-digit code on the TV. Enter it in the dashboard under **Add a screen**; the screen is enrolled and starts playing.

### Why there is no API key field any more

Up to 0.9.x the operator pasted a screen API key into this overlay. That key was
long-lived, never expired, and sat in the TV's `localStorage` where anyone with
the remote could open the settings and read it back.

From 0.10.0 a screen is enrolled by a six-digit code that is valid for minutes
and can only be redeemed once. What the screen keeps afterwards is a rotating
refresh token inside the player, not a credential in the shell. There is no API
key to enter here because the dashboard no longer hands one out.

A shell from 0.9.x has to be updated: the player ignores an `apiKey` in the
handoff, so such a shell no longer enrols its display. Install this version and
pair the screen once with the code it shows. The old key is deleted from the TV
on the first start.

## Settings

Settings are configured on-device via the settings overlay (press the **Settings** or **Blue** button on the remote).

| Field | Required | Description |
|-------|----------|-------------|
| **Server URL** | Yes | The URL of your signage server (e.g. `https://signage.example.com`) |
| **Player URL** | No | Override the player URL. Leave empty to fetch it from `{Server URL}/api/config`. Set it for development (e.g. `http://localhost:4300`). |

Values are stored in `localStorage` with keys: `server_url`, `player_url`.

### Disconnecting a screen

The same overlay has a **Disconnect screen** button. It unpairs the display: the
player drops its session, its refresh token and its screen id, and shows a new
pairing code.

Press it **twice** — the first press arms it for five seconds. This is the one
action here that cannot be undone from the remote, because the screen has to be
claimed again in the dashboard.

The shell cannot do this itself. The credentials live in the player's own
origin, so the shell only sends a `mynextscreen-disconnect` message, and the
player decides:

- it accepts it only from the top-level embedding window on an allow-listed
  origin, the same check the server-URL handoff passes;
- it refuses when the screen has **`showDisconnectButton`** switched off in the
  dashboard, so the shell is not a way around a screen an operator locked down;
- it answers with the outcome, which is what the overlay reports back.

Unlike the server-URL handoff, an unpair is accepted while the display is
paired. The shell may reset a display; it may never silently re-point a paired
one at another server.

## Re-pairing a screen

A screen that lost its session — the app was reinstalled, or the TV's storage was
cleared — shows a pairing code again. In the dashboard, open the screen and use
**Repair**, then enter the code. The screen keeps its name, playlists and
schedules; only its credential is replaced.

## Quick Start

See `QUICKSTART.md` for step-by-step deployment instructions.

## File Structure

```
.
├── appinfo.json              # Application metadata
├── index.html                # Main HTML (iframe, settings overlay)
├── app.js                    # Application logic (iframe loading, postMessage)
├── icon.png                  # Application icon (80x80)
├── largeIcon.png             # Large icon (130x130)
├── icon.svg                  # Icon source (SVG)
├── largeIcon.svg             # Large icon source (SVG)
└── webOSTVjs-1.2.4/
    └── webOSTV.js            # WebOS TV API wrapper
```

## Customization

### Change Application ID

Edit `appinfo.json` and update the `id` field:

```json
{
  "id": "com.yourcompany.yourapp",
  ...
}
```

### Update Icons

Replace `icon.png` (80x80) and `largeIcon.png` (130x130) with your custom icons.
See `ICONS_README.md` for instructions on generating PNG files from the provided SVG sources.

### Modify Resolution

Edit `appinfo.json` to match your TV's resolution:

```json
{
  "resolution": "3840x2160",  // For 4K TVs
  ...
}
```

## Development

### Debugging on LG TV

View console logs when running on LG TV:

```bash
ares-inspect --device YOUR_TV_NAME --app com.mynextscreen.webos --open
```

### Development Setup (Split Server/Player)

If you run the Angular web player on a separate dev server (`nx serve player`, port 4300), set the **Player URL** in the LG app settings to point to that dev server. The Server URL should still point to the backend API (port 3000).

## Requirements

- LG WebOS TV (2024 or newer recommended)
- WebOS SDK tools (`@webos-tools/cli`)
- A running signage server with the web player deployed

## License

See LICENSE file for details.
