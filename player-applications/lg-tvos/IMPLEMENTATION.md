# Implementation Summary

## Overview
This LG WebOS application has been created to forward to a hosted SPA with device identification capabilities for LG WebOS 2024 and newer.

## Requirements Met

✅ **1. Application for LG WebOS 2024 and newer**
- Created complete WebOS application with proper `appinfo.json` configuration
- Includes all required application metadata and permissions

✅ **2. Forward/call to another webpage**
- Application loads the hosted SPA in a fullscreen iframe
- URL is configurable via the `SPA_URL` constant in `app.js`

✅ **3. Device identifier from LG TV**
- Uses `webOS.deviceInfo()` API to retrieve device information
- Extracts device identifier (model name, serial number, or other unique ID)
- Passes as `deviceId` URL parameter

✅ **4. UUID generation and persistence**
- Generates UUID v4 on first launch
- Stores UUID in localStorage for persistence
- Same UUID is used on every subsequent app launch
- Passes as `uuid` URL parameter

## Key Files

### Core Application Files
- **appinfo.json** - Application metadata and configuration
- **index.html** - Main application HTML with iframe for SPA
- **app.js** - Core application logic (UUID generation, device ID retrieval, URL forwarding)
- **webOSTVjs-1.2.4/webOSTV.js** - WebOS TV API wrapper

### Icons
- **icon.png** (80x80) - Application icon
- **largeIcon.png** (130x130) - Large application icon
- **icon.svg** / **largeIcon.svg** - Source SVG files for icons

### Documentation
- **README.md** - Comprehensive usage instructions
- **ICONS_README.md** - Icon generation instructions
- **test.html** - Test/demo page for browser testing

## Usage

### 1. Configure Your SPA URL
Edit `app.js` and set your SPA URL:
```javascript
const SPA_URL = 'https://your-spa-url.com';
```

### 2. Package the Application
```bash
npm install -g @webos-tools/cli
ares-package . --outdir ./build
```

### 3. Install on LG TV
```bash
ares-setup-device
ares-install --device YOUR_TV_NAME ./build/com.digitalsignage.webos_1.0.0_all.ipk
ares-launch --device YOUR_TV_NAME com.digitalsignage.webos
```

## URL Parameters Sent to SPA

When the application loads, your SPA will receive:

```
https://your-spa-url.com?deviceId=<device_identifier>&uuid=<persistent_uuid>
```

Example:
```
https://your-spa-url.com?deviceId=LG-WEBOS-OLED65C3&uuid=a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
```

### Parameters:
- **deviceId**: Unique identifier from the LG TV (model name, serial number, or generated fallback)
- **uuid**: Persistent UUID that remains constant across app launches

## Implementation Details

### UUID Generation
- Uses UUID v4 format
- Stored in localStorage with key `device_uuid`
- Generated only once on first launch
- Reused on all subsequent launches
- Can be reset by clearing localStorage

### Device Identification
- Primary: Uses `webOS.deviceInfo()` API
- Tries to get: modelName, serialNumber, sdkVersion, or UHD identifier
- Fallback: Generates time-based identifier if API unavailable

### Error Handling
- Graceful fallback if WebOS API is unavailable
- Console logging for debugging
- Loading message while initializing
- Error message if SPA fails to load

## Testing

### Browser Testing
Use `test.html` to test the application logic in a browser:
```bash
python3 -m http.server 8000
# Open http://localhost:8000/test.html
```

The test page shows:
- Generated UUID
- Device identifier
- Target URL with parameters
- Console logs
- Ability to reset UUID and test forwarding

### On-Device Testing
Debug on actual LG TV using:
```bash
ares-inspect --device YOUR_TV_NAME --app com.digitalsignage.webos --open
```

## Customization Options

### Change Application ID
Edit `appinfo.json`:
```json
{
  "id": "com.yourcompany.yourapp",
  ...
}
```

### Change Resolution
Edit `appinfo.json` for 4K TVs:
```json
{
  "resolution": "3840x2160",
  ...
}
```

### Replace Icons
Replace `icon.png` and `largeIcon.png` with your custom icons (see ICONS_README.md)

### Modify Device ID Logic
Edit the `getDeviceIdentifier()` function in `app.js` to customize device identification logic

## Architecture

```
┌─────────────────────────────────────┐
│         LG WebOS TV                 │
│  ┌───────────────────────────────┐  │
│  │   Digital Signage App         │  │
│  │                               │  │
│  │  1. Load app.js               │  │
│  │  2. Get/Create UUID           │  │
│  │  3. Get Device ID from WebOS  │  │
│  │  4. Build URL with params     │  │
│  │  5. Load SPA in iframe        │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │    iframe               │  │  │
│  │  │  ┌──────────────────┐   │  │  │
│  │  │  │  Your SPA        │   │  │  │
│  │  │  │  (receives params)│   │  │  │
│  │  │  └──────────────────┘   │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Security Considerations

- Application only has `device.info` permission
- UUID is stored locally on the device
- No external API calls except loading the configured SPA URL
- SPA runs in iframe with standard browser security

## Maintenance

To update the application:
1. Modify the necessary files
2. Re-package: `ares-package . --outdir ./build`
3. Re-install: `ares-install --device YOUR_TV_NAME ./build/*.ipk`
4. Restart app: `ares-launch --device YOUR_TV_NAME com.digitalsignage.webos`

## Troubleshooting

**UUID not persisting:**
- Check localStorage is enabled
- Verify no browser/app cache clearing between launches

**Device ID shows fallback value:**
- Check `device.info` permission in appinfo.json
- Verify WebOS API is available on your TV model
- Check console logs for error messages

**SPA not loading:**
- Verify SPA_URL is correct in app.js
- Check network connectivity
- Verify SPA accepts cross-origin iframe embedding
- Check browser console for CORS errors

## Future Enhancements

Possible improvements for future versions:
- Add configuration UI to set SPA URL without code changes
- Support for additional WebOS API features
- Enhanced error reporting and recovery
- Support for offline mode
- Analytics integration
