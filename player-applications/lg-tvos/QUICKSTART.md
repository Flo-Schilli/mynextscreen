# Quick Start Guide

This is a quick reference for deploying the myNextScreen LG webOS application.

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

This creates: `build/com.mynextscreen.webos_1.0.0_all.ipk`

## 5. Install on TV

```bash
ares-install --device mytv ./build/com.mynextscreen.webos_1.0.0_all.ipk
```

## 6. Launch the Application

```bash
ares-launch --device mytv com.mynextscreen.webos
```

## 7. Configure on the TV

On first launch, the settings overlay opens automatically:

1. Enter the **Server URL** (e.g. `https://signage.example.com`)
2. Leave **Player URL** empty (unless you have a separate development player)
3. Press **Save & Reload**

There is no API key to enter. The app reloads, loads the web player in an iframe and hands it the server URL; the player then shows a **six-digit pairing code** on the TV.

## 8. Pair the Screen

In the dashboard, go to **Screens → Add a screen**, fill in name, resolution and
location, and enter the code from the TV. The code is valid for a few minutes and
can be redeemed once.

The display starts playing as soon as the code is claimed. If the code expires,
the player requests a new one by itself.

## 9. Verify It Works

The application should:
1. Show "Loading myNextScreen…" briefly
2. Load the web player in fullscreen
3. Show a pairing code, then start playing once it is claimed
4. Come back on its own after a server restart, without anyone touching the TV

To re-open settings at any time, press the **Settings** or **Blue** button on the
remote. The overlay also holds **Disconnect screen**, which unpairs the display
and sends it back to a pairing code — press it twice to confirm.

## Debugging

View console logs:

```bash
ares-inspect --device mytv --app com.mynextscreen.webos --open
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

### "Player shows a code but nothing happens"
- The code must be entered in the dashboard under **Add a screen** (or **Repair** for an existing screen)
- Check the server is running and reachable from the TV
- Open DevTools (`ares-inspect`) and look for the handoff being rejected — the player logs `Ignored signage-connect from untrusted origin …`

### "The screen was working and now asks to be paired again"
- Its session is gone: the app was reinstalled, or the TV's storage was cleared
- Use **Repair** on the existing screen and enter the new code; name, playlists and schedules are kept

## Updating the Application

After making changes:

```bash
# 1. Re-package
ares-package . --outdir ./build

# 2. Re-install (overwrites previous version)
ares-install --device mytv ./build/com.mynextscreen.webos_1.0.0_all.ipk

# 3. Re-launch
ares-launch --device mytv com.mynextscreen.webos
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
3. Enter the Server URL in settings
4. Pair the screen with the code shown on the TV
5. Verify content displays correctly
6. Restart the backend once and confirm the screen recovers on its own
7. Roll out to all TVs

## Support

For detailed information, see:
- `README.md` - Complete documentation
- `IMPLEMENTATION.md` - Technical details

---

**That's it! Your myNextScreen LG webOS application is ready to use.**
