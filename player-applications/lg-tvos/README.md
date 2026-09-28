# Digital Signage - LG WebOS Application

LG WebOS application that acts as a thin shell, loading the web player in a fullscreen iframe and telling it which server it belongs to.

## Features

- **Settings UI**: Configure Server URL and an optional Player URL directly on the TV
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

A shell that still carries a key from an earlier version keeps working — the key
still opens the enrolment route — but the key is deleted from the TV on the
first start of this version.

## Settings

Settings are configured on-device via the settings overlay (press the **Settings** or **Blue** button on the remote).

| Field | Required | Description |
|-------|----------|-------------|
| **Server URL** | Yes | The URL of your signage server (e.g. `https://signage.example.com`) |
| **Player URL** | No | Override the player URL. Leave empty to fetch it from `{Server URL}/api/config`. Set it for development (e.g. `http://localhost:4300`). |

Values are stored in `localStorage` with keys: `server_url`, `player_url`.

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
ares-inspect --device YOUR_TV_NAME --app com.digitalsignage.webos --open
```

### Development Setup (Split Server/Player)

If you run the Angular web player on a separate dev server (`nx serve player`, port 4300), set the **Player URL** in the LG app settings to point to that dev server. The Server URL should still point to the backend API (port 3000).

## Requirements

- LG WebOS TV (2024 or newer recommended)
- WebOS SDK tools (`@webos-tools/cli`)
- A running signage server with the web player deployed

## License

See LICENSE file for details.
