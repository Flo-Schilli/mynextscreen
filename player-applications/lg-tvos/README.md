# Digital Signage - LG WebOS Application

LG WebOS application for Digital Signage that forwards to a hosted SPA with device identification.

## Features

- **Device Identification**: Automatically retrieves device identifier from LG WebOS TV
- **Persistent UUID**: Generates and stores a UUID that persists across app launches
- **URL Forwarding**: Forwards to your hosted SPA with device parameters
- **Compatible**: Works with LG WebOS 2024 and newer

## Quick Start

### 1. Configure Your SPA URL

Edit `app.js` and update the `SPA_URL` constant with your hosted SPA URL:

```javascript
const SPA_URL = 'https://your-spa-url.com';
```

### 2. Package the Application

Create an IPK package for LG WebOS:

```bash
# Install ares-cli tools first (if not already installed)
npm install -g @webos-tools/cli

# Package the application
ares-package . --outdir ./build
```

### 3. Install on LG TV

```bash
# Add your TV device (first time only)
ares-setup-device

# Install the application
ares-install --device YOUR_TV_NAME ./build/com.digitalsignage.webos_1.0.0_all.ipk

# Launch the application
ares-launch --device YOUR_TV_NAME com.digitalsignage.webos
```

## How It Works

When the application launches:

1. **UUID Generation**: The app checks localStorage for an existing UUID
   - If found, it reuses the same UUID
   - If not found, it generates a new UUID v4 and stores it
   
2. **Device Identification**: The app retrieves the device identifier from LG WebOS API
   - Uses `webOS.deviceInfo()` to get device information
   - Falls back to generated identifier if API is unavailable

3. **URL Construction**: The app builds the target URL with parameters:
   ```
   https://your-spa-url.com?deviceId=LG-WEBOS-MODEL&uuid=xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   ```

4. **Content Loading**: The SPA is loaded in a fullscreen iframe

## URL Parameters

Your hosted SPA will receive two URL parameters:

- `deviceId`: Unique identifier from the LG TV (model name, serial number, or generated ID)
- `uuid`: Persistent UUID that remains the same across app launches

## File Structure

```
.
├── appinfo.json              # Application metadata
├── index.html                # Main HTML file
├── app.js                    # Application logic
├── icon.png                  # Application icon (80x80)
├── largeIcon.png            # Large icon (130x130)
├── icon.svg                  # Icon source (SVG)
├── largeIcon.svg            # Large icon source (SVG)
└── webOSTVjs-1.2.4/
    └── webOSTV.js           # WebOS TV API wrapper
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

### Testing Locally

You can test the application in a web browser, though device identification will use fallback values:

```bash
# Serve the directory with any web server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

### Debugging

View console logs when running on LG TV:

```bash
ares-inspect --device YOUR_TV_NAME --app com.digitalsignage.webos --open
```

## Requirements

- LG WebOS TV (2024 or newer recommended)
- WebOS SDK tools (`@webos-tools/cli`)
- A hosted SPA that can receive URL parameters

## License

See LICENSE file for details.
