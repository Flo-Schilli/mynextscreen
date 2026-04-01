# Quick Start Guide

This is a quick reference for deploying the LG WebOS Digital Signage application.

## Prerequisites

- LG WebOS TV (2024 or newer)
- Node.js installed on your computer
- Developer mode enabled on your LG TV
- A running signage server with the web player deployed
- An API key for the screen (created in the signage server admin UI)

## 1. Enable Developer Mode on LG TV

1. Go to your TV's settings
2. Navigate to "General" > "About This TV"
3. Click on the TV name several times to enable Developer Mode
4. Restart the TV
5. Open the Developer Mode app and turn on "Key Server"
6. Note the IP address shown

## 2. Install WebOS CLI Tools

```bash
npm install -g @webos-tools/cli
```

## 3. Add Your TV as a Device

```bash
ares-setup-device
```

Follow the prompts:
- Device name: Choose a name (e.g., "mytv")
- Device IP: Enter the IP from Developer Mode app
- Port: 9922 (default)
- Username: prisoner (default)
- Description: Optional
- Authentication: password
- Password: Leave empty (press Enter)
- Save configuration: yes
- Default device: yes

## 4. Package the Application

From the `player-applications/lg-tvos` directory:

```bash
ares-package . --outdir ./build
```

This creates: `build/com.digitalsignage.webos_1.0.0_all.ipk`

## 5. Install on TV

```bash
ares-install --device mytv ./build/com.digitalsignage.webos_1.0.0_all.ipk
```

## 6. Launch the Application

```bash
ares-launch --device mytv com.digitalsignage.webos
```

## 7. Configure on the TV

On first launch, the settings overlay opens automatically:

1. Enter the **Server URL** (e.g. `https://signage.example.com`)
2. Enter the **API Key** for this screen
3. Leave **Player URL** empty (unless you have a separate development player)
4. Press **Save & Reload**

The app will reload, load the web player in an iframe, and send the credentials via `postMessage`. The player auto-connects and starts displaying content.

## 8. Verify It Works

The application should:
1. Show "Loading Digital Signage..." briefly
2. Load the web player in fullscreen
3. Auto-connect to the server (no connection dialog)
4. Start displaying assigned content

To re-open settings at any time, press the **Settings** or **Blue** button on the remote.

## Debugging

View console logs:

```bash
ares-inspect --device mytv --app com.digitalsignage.webos --open
```

This opens Chrome DevTools for debugging.

## Common Issues

### "Device not found"
- Check TV is on and connected to same network
- Verify IP address in Developer Mode app
- Run `ares-setup-device` again

### "Permission denied"
- Ensure Developer Mode is enabled
- Check Key Server is running in Developer Mode app
- Try restarting the TV

### "Player doesn't load"
- Verify Server URL is correct in settings
- Check network connectivity from the TV to the server
- Ensure the web player is deployed at `{Server URL}/player/`
- Ensure the server does not send `X-Frame-Options: DENY`
- Check browser console for CORS errors

### "Player loads but doesn't connect"
- Verify the API Key is correct
- Check the server is running and reachable
- Open DevTools (`ares-inspect`) and check for postMessage errors in the console

## Updating the Application

After making changes:

```bash
# 1. Re-package
ares-package . --outdir ./build

# 2. Re-install (overwrites previous version)
ares-install --device mytv ./build/com.digitalsignage.webos_1.0.0_all.ipk

# 3. Re-launch
ares-launch --device mytv com.digitalsignage.webos
```

## Customization

### Change App Name/Title
Edit `appinfo.json`:
```json
{
  "title": "Your Custom Title"
}
```

### Change App ID
Edit `appinfo.json`:
```json
{
  "id": "com.yourcompany.yourapp"
}
```

Then update all commands to use the new ID.

### Update Icons
Replace `icon.png` (80x80) and `largeIcon.png` (130x130) with your own icons.

### Change Resolution
For 4K TVs, edit `appinfo.json`:
```json
{
  "resolution": "3840x2160"
}
```

## Production Deployment

Before deploying to production:

1. Package the application
2. Deploy to one test TV
3. Enter Server URL and API Key in settings
4. Verify the player loads and connects automatically
5. Verify content displays correctly
6. Roll out to all TVs

## Support

For detailed information, see:
- `README.md` - Complete documentation
- `IMPLEMENTATION.md` - Technical details

---

**That's it! Your LG WebOS Digital Signage application is ready to use.**
