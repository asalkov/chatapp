# Mobile Phone Issues - Diagnosis & Fix

## Common Mobile Issues

### Issue 1: Cannot Connect to Backend ❌

**Problem:** Mobile phone trying to connect to `localhost:3000`

**Why it fails:**
- `localhost` on mobile = the phone itself, not your computer
- Backend is running on your computer, not the phone

**Solution:** Use your computer's local IP address

---

## Fix: Update Backend URL for Mobile Access

### Step 1: Find Your Computer's IP Address

**Windows:**
```powershell
ipconfig
```

Look for:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

**Your IP:** `192.168.1.100` (example)

### Step 2: Update Frontend Configuration

The frontend needs to know your computer's IP address.

#### Option A: Environment Variable (Recommended)

Create `.env` file in frontend:

```bash
# frontend/.env
VITE_BACKEND_URL=http://192.168.1.100:3000
```

Replace `192.168.1.100` with YOUR computer's IP.

#### Option B: Modify Code Temporarily

Update `frontend/src/services/authService.ts`:

```typescript
// Change this line:
const API_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.hostname}:3000`);

// To this (use your IP):
const API_URL = 'http://192.168.1.100:3000';
```

Update `frontend/src/hooks/useSocket.ts`:

```typescript
// Change this line:
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.hostname}:3000`);

// To this (use your IP):
const BACKEND_URL = 'http://192.168.1.100:3000';
```

Update `frontend/src/components/InvitationAccept.tsx`:

```typescript
// Change this line:
const API_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.hostname}:3000`);

// To this (use your IP):
const API_URL = 'http://192.168.1.100:3000';
```

### Step 3: Rebuild Frontend

```powershell
cd C:\Users\salko\chatapp\frontend
npm run build
```

### Step 4: Access from Mobile

**On your mobile phone:**
```
http://192.168.1.100:5173
```

Or if using production build:
```
http://192.168.1.100
```

---

## Issue 2: Backend Not Accessible from Network

**Problem:** Backend only listening on `localhost` (127.0.0.1)

**Solution:** Make backend listen on all network interfaces

### Update Backend Configuration

Check `backend/src/main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*', // Allow all origins for development
  });
  
  const port = process.env.PORT || 3000;
  
  // Listen on all network interfaces (0.0.0.0)
  await app.listen(port, '0.0.0.0');
  
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
```

### Restart Backend

```powershell
cd C:\Users\salko\chatapp\backend
npx nest start --watch
```

---

## Issue 3: Firewall Blocking Connections

**Problem:** Windows Firewall blocking port 3000

**Solution:** Allow port 3000 through firewall

### Windows Firewall Rule

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Chat App Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Chat App Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

Or manually:
1. Open Windows Defender Firewall
2. Advanced Settings
3. Inbound Rules → New Rule
4. Port → TCP → 3000
5. Allow the connection
6. Apply to all profiles

---

## Issue 4: Mobile Browser Compatibility

**Problem:** Some mobile browsers have issues with WebSockets

**Solutions:**

### Add Mobile-Specific Meta Tags

Update `frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <title>Chat App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Issue 5: HTTPS Required (iOS Safari)

**Problem:** iOS Safari may require HTTPS for WebSockets

**Temporary Solution:** Use Chrome on iOS or Android

**Permanent Solution:** Set up HTTPS with SSL certificate

---

## Complete Mobile Setup Guide

### 1. Find Your IP
```powershell
ipconfig
# Note your IPv4 Address (e.g., 192.168.1.100)
```

### 2. Create Frontend .env
```bash
# frontend/.env
VITE_BACKEND_URL=http://192.168.1.100:3000
```

### 3. Update Backend to Listen on All Interfaces

`backend/src/main.ts`:
```typescript
await app.listen(port, '0.0.0.0');
```

### 4. Allow Firewall
```powershell
# As Administrator
New-NetFirewallRule -DisplayName "Chat App" -Direction Inbound -LocalPort 3000,5173 -Protocol TCP -Action Allow
```

### 5. Start Services
```powershell
# Terminal 1: Backend
cd C:\Users\salko\chatapp\backend
npx nest start --watch

# Terminal 2: Frontend
cd C:\Users\salko\chatapp\frontend
npm run dev -- --host
```

**Note:** `--host` flag makes Vite accessible from network

### 6. Access from Mobile
```
http://192.168.1.100:5173
```

---

## Testing Mobile Connection

### Test 1: Can Mobile Reach Computer?

**On mobile browser:**
```
http://192.168.1.100:3000
```

**Expected:** Should see `{"statusCode":404,"message":"Cannot GET /","error":"Not Found"}`

✅ If you see this → Backend is reachable  
❌ If timeout → Check firewall or IP address

### Test 2: Can Mobile Load Frontend?

**On mobile browser:**
```
http://192.168.1.100:5173
```

**Expected:** Chat app login page loads

### Test 3: Can Mobile Connect WebSocket?

1. Login on mobile
2. Open browser console (if available)
3. Check for WebSocket connection errors

---

## Quick Fix Script

Create `start-mobile.ps1`:

```powershell
# Get local IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress

Write-Host "Your IP: $ip" -ForegroundColor Green
Write-Host "Mobile URL: http://${ip}:5173" -ForegroundColor Cyan

# Create .env file
Set-Content -Path "frontend\.env" -Value "VITE_BACKEND_URL=http://${ip}:3000"

Write-Host "`nStarting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npx nest start --watch"

Start-Sleep -Seconds 3

Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --host"

Write-Host "`nServices starting..." -ForegroundColor Green
Write-Host "Access from mobile: http://${ip}:5173" -ForegroundColor Cyan
```

Run:
```powershell
.\start-mobile.ps1
```

---

## Common Mobile-Specific Issues

### Issue: Touch Events Not Working
**Solution:** Already handled by Material-UI

### Issue: Keyboard Covering Input
**Solution:** Add to CSS:
```css
/* In index.css */
body {
  height: 100vh;
  height: -webkit-fill-available;
}
```

### Issue: Viewport Jumping
**Solution:** Already fixed with viewport meta tag

### Issue: Back Button Not Working
**Solution:** React Router handles this automatically

---

## Network Requirements

### Same Network
✅ Computer and phone must be on **same Wi-Fi network**

### IP Address
✅ Use computer's **local IP** (192.168.x.x), not localhost

### Ports Open
✅ Ports 3000 and 5173 must be accessible

### Firewall
✅ Windows Firewall must allow connections

---

## Troubleshooting Checklist

- [ ] Computer and phone on same Wi-Fi
- [ ] Found computer's IP address (ipconfig)
- [ ] Created frontend/.env with correct IP
- [ ] Backend listening on 0.0.0.0
- [ ] Firewall allows ports 3000 and 5173
- [ ] Frontend started with --host flag
- [ ] Can access http://YOUR_IP:3000 from mobile
- [ ] Can access http://YOUR_IP:5173 from mobile
- [ ] WebSocket connects successfully
- [ ] Can login and send messages

---

## Production Mobile Access (AWS)

For AWS deployment, mobile works automatically:

```
http://98.84.171.210
```

No special configuration needed - just ensure:
- Security groups allow ports 80 and 3000
- FRONTEND_URL set in docker-compose.yml

---

## Still Not Working?

### Check Network Connectivity
```powershell
# On computer
ping 192.168.1.100

# On mobile browser
http://192.168.1.100:3000
```

### Check Backend Logs
Look for CORS errors or connection refused

### Try Different Browser
- Chrome (recommended)
- Firefox
- Safari (may have WebSocket issues)

### Restart Everything
1. Stop backend and frontend
2. Clear browser cache on mobile
3. Restart services
4. Try again

---

## Summary

**Main Issue:** Mobile can't access `localhost`

**Solution:** Use computer's local IP address (192.168.x.x)

**Steps:**
1. Find IP: `ipconfig`
2. Create `.env`: `VITE_BACKEND_URL=http://YOUR_IP:3000`
3. Allow firewall: Ports 3000, 5173
4. Start with: `npm run dev -- --host`
5. Access: `http://YOUR_IP:5173`
