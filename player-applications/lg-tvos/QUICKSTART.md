# Quick Start Guide

This is a quick reference for deploying the LG WebOS Digital Signage application.

## Prerequisites

- LG WebOS TV (2024 or newer)
- Node.js installed on your computer
- Developer mode enabled on your LG TV

## 1. Enable Developer Mode on LG TV

1. Go to your TV's settings
2. Navigate to "General" → "About This TV"
3. Click on the TV name several times to enable Developer Mode
4. Restart the TV
5. Open the Developer Mode app and turn on "Key Server"
6. Note the IP address shown

## 2. Configure the Application

Edit `app.js` and replace the placeholder URL with your actual SPA URL:

```javascript
const SPA_URL = 'https://your-actual-spa-url.com';
```

## 3. Install WebOS CLI Tools

```bash
npm install -g @webos-tools/cli
```

## 4. Add Your TV as a Device

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

## 5. Package the Application

From the repository directory:

```bash
ares-package . --outdir ./build
```

This creates: `build/com.digitalsignage.webos_1.0.0_all.ipk`

## 6. Install on TV

```bash
ares-install --device mytv ./build/com.digitalsignage.webos_1.0.0_all.ipk
```

## 7. Launch the Application

```bash
ares-launch --device mytv com.digitalsignage.webos
```

## 8. Verify It Works

The application should:
1. Show "Loading Digital Signage..." briefly
2. Load your SPA in fullscreen
3. Pass URL parameters: `?deviceId=XXX&uuid=YYY`

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

### "App doesn't load SPA"
- Verify SPA_URL is correct in app.js
- Check network connectivity
- Ensure SPA allows iframe embedding (no X-Frame-Options: DENY)
- Check browser console for CORS errors

### "UUID not persisting"
- This would indicate localStorage is being cleared
- Check TV's storage settings
- Verify no "clear cache on exit" settings are enabled

## Testing Before Deployment

Use `test.html` to verify functionality in a browser:

```bash
python3 -m http.server 8000
# Open http://localhost:8000/test.html in your browser
```

This lets you:
- See the UUID being generated
- View the constructed URL
- Test URL parameter passing
- Verify logic works before deploying to TV

## Updating the Application

After making changes:

```bash
# 1. Re-package
ares-package . --outdir ./build

# 2. Re-install (overwrites previous version)
ares-install --device mytv ./build/com.digitalsignage.webos_1.0.0_all.ipk

# 3. Close the app on TV (if running)

# 4. Re-launch
ares-launch --device mytv com.digitalsignage.webos
```

## URL Parameters Received by Your SPA

Your SPA will receive two URL parameters:

- **deviceId**: Unique identifier from the LG TV
  - Example: `LG-WEBOS-OLED65C3` or `LG-WebOS-TV`
  
- **uuid**: Persistent UUID (stays the same every time)
  - Example: `550e8400-e29b-41d4-a716-446655440000`

Full URL example:
```
https://your-spa-url.com?deviceId=LG-WEBOS-OLED65C3&uuid=550e8400-e29b-41d4-a716-446655440000
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

1. ✅ Update SPA_URL in app.js
2. ✅ Customize icons if desired
3. ✅ Test with test.html
4. ✅ Deploy to one test TV
5. ✅ Verify UUID persists across app restarts
6. ✅ Verify device ID is captured correctly
7. ✅ Check your SPA receives both parameters
8. ✅ Roll out to all TVs

## Support

For detailed information, see:
- `README.md` - Complete documentation
- `IMPLEMENTATION.md` - Technical details
- `VALIDATION.md` - Requirements validation

---

**That's it! Your LG WebOS Digital Signage application is ready to use.**
