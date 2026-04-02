# Digital Signage - LG WebOS Application

LG WebOS application that acts as a thin shell, loading the web player in a fullscreen iframe and authenticating it via `postMessage`.

## Features

- **Settings UI**: Configure Server URL, API Key, and optional Player URL directly on the TV
- **Secure Authentication**: Credentials are sent to the web player via `postMessage` (never in the URL)
- **Automatic Connection**: The web player auto-connects when it receives credentials from the LG shell
- **Compatible**: Works with LG WebOS 2024 and newer

## How It Works

The LG app is a deployment vehicle for the existing web player, not a separate player implementation.

1. **First Launch**: The settings overlay opens automatically, prompting for Server URL and API Key
2. **iframe Loading**: The app loads the web player at `{Server URL}/player/` (or a custom Player URL) in a fullscreen iframe
3. **postMessage Authentication**: After the iframe loads, the app sends credentials via `postMessage`:
   ```javascript
   iframe.contentWindow.postMessage({
     type: 'signage-connect',
     serverUrl: '...',
     apiKey: '...'
   }, '*');
   ```
4. **Auto-Connect**: The web player's `ConnectionService` receives the message and calls `connect(serverUrl, apiKey)`, bypassing the connection dialog

## Settings

Settings are configured on-device via the settings overlay (press the **Settings** or **Blue** button on the remote).

| Field | Required | Description |
|-------|----------|-------------|
| **Server URL** | Yes | The URL of your signage server (e.g. `https://signage.example.com`) |
| **API Key** | Yes | The API key for this screen |
| **Player URL** | No | Override the player URL. Leave empty to use `{Server URL}/player/`. Only set for development (e.g. `http://localhost:4200`). |

Values are stored in `localStorage` with keys: `server_url`, `api_key`, `player_url`.

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

If you run the Angular web player on a separate dev server (e.g. `ng serve` on port 4200), set the **Player URL** in the LG app settings to point to that dev server. The Server URL should still point to the backend API.

## Requirements

- LG WebOS TV (2024 or newer recommended)
- WebOS SDK tools (`@webos-tools/cli`)
- A running signage server with the web player deployed

## License

See LICENSE file for details.
