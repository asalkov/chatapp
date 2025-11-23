# Invitation Link Troubleshooting

## Issue: `http://localhost:5173/invite/inv_xxx` Not Working

### Quick Diagnosis

Open browser console (F12) and check for errors:

#### Error 1: `ERR_CONNECTION_REFUSED` or `Failed to fetch`
**Problem**: Backend is not running on `localhost:3000`

**Solution**: Start the backend

```bash
# Option 1: Run backend directly
cd backend
npm install
npm run start:dev

# Option 2: Run with Docker
cd local
docker-compose up
```

#### Error 2: `404 Not Found` on `/invitations/token/xxx`
**Problem**: Backend is running but endpoint not registered

**Solution**: Check backend logs and restart

```bash
cd backend
npm run start:dev
```

#### Error 3: Page loads but shows "Invalid Invitation"
**Problem**: Token doesn't exist or expired

**Solution**: Generate a new invitation

---

## How Invitation Flow Works

### 1. User Sends Invitation

```
Frontend (localhost:5173)
    ↓
WebSocket: emit('sendInvitation')
    ↓
Backend (localhost:3000): app.gateway.ts
    ↓
Creates invitation with token
    ↓
Returns link: http://localhost:5173/invite/TOKEN
```

### 2. Recipient Opens Link

```
Browser opens: http://localhost:5173/invite/TOKEN
    ↓
React Router: /invite/:token → InvitationAccept component
    ↓
Fetch: GET http://localhost:3000/invitations/token/TOKEN
    ↓
Backend: invitation.controller.ts
    ↓
Returns invitation data
    ↓
Frontend displays: "You're Invited!"
```

### 3. Recipient Accepts

```
User clicks "Accept"
    ↓
POST http://localhost:3000/invitations/accept/TOKEN
    ↓
Backend updates invitation status
    ↓
Redirects to login page
```

---

## Testing Locally

### Step 1: Start Backend

```bash
cd C:\Users\salko\chatapp\backend
npm run start:dev
```

**Expected output:**
```
[Nest] 12345  - LOG [NestApplication] Nest application successfully started
[Nest] 12345  - LOG [WebSocketGateway] WebSocket Gateway initialized
```

### Step 2: Start Frontend

```bash
cd C:\Users\salko\chatapp\frontend
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 3: Test Invitation

1. Open http://localhost:5173
2. Login as any user
3. Click "Invite Friend" button
4. Enter email: `test@example.com`
5. Copy the invitation link
6. Open link in new tab
7. Should see "You're Invited!" page

---

## Common Issues

### Issue: "Cannot GET /invite/xxx"

**Cause**: React Router not configured or page refresh issue

**Solution**: Check `main.tsx` has the route:

```typescript
<Route path="/invite/:token" element={<InvitationAccept />} />
```

### Issue: CORS Error

**Cause**: Backend CORS not allowing frontend

**Solution**: Check `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: '*', // or 'http://localhost:5173'
});
```

### Issue: "Invitation not found"

**Cause**: Token doesn't exist in backend memory

**Solution**: 
- Backend stores invitations in memory (Map)
- Restarting backend clears all invitations
- Generate a new invitation after backend restart

---

## Verify Backend is Running

### Method 1: Direct API Call

Open browser and go to:
```
http://localhost:3000
```

Should see: `{"statusCode":404,"message":"Cannot GET /","error":"Not Found"}`

This means backend is running (404 is expected for root path).

### Method 2: Check Invitation Endpoint

In browser console:
```javascript
fetch('http://localhost:3000/invitations/token/test123')
  .then(r => r.json())
  .then(console.log)
```

Should return invitation data or error.

### Method 3: Check Process

```powershell
# Windows
netstat -ano | findstr :3000

# Should show:
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
```

---

## Quick Fix Commands

### Restart Everything

```bash
# Kill all node processes
taskkill /F /IM node.exe

# Start backend
cd C:\Users\salko\chatapp\backend
npm run start:dev

# In new terminal, start frontend
cd C:\Users\salko\chatapp\frontend
npm run dev
```

### Check Logs

```bash
# Backend logs
cd backend
npm run start:dev

# Look for:
✅ [NestApplication] Nest application successfully started
✅ [WebSocketGateway] WebSocket Gateway initialized
❌ [ExceptionsHandler] Error messages
```

---

## AWS Deployment

For AWS, the flow is the same but URLs change:

```
Frontend: http://98.84.171.210
Backend: http://98.84.171.210:3000
Invitation: http://98.84.171.210/invite/TOKEN
```

Make sure `FRONTEND_URL` environment variable is set in `docker-compose.yml`.

---

## Debug Checklist

- [ ] Backend running on localhost:3000
- [ ] Frontend running on localhost:5173
- [ ] Can access http://localhost:3000 (should get 404)
- [ ] Can login to frontend
- [ ] Can send invitation
- [ ] Invitation link format correct
- [ ] Can open invitation link
- [ ] Browser console shows no errors
- [ ] Backend logs show no errors

---

## Still Not Working?

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Hard refresh**: Ctrl+F5
3. **Try incognito mode**: Ctrl+Shift+N
4. **Check firewall**: Allow port 3000
5. **Restart computer**: Sometimes helps with port conflicts

---

## Contact Info

If issue persists, provide:
1. Browser console errors (F12 → Console)
2. Backend terminal output
3. Frontend terminal output
4. Exact URL you're trying to access
