# Quick Deploy Guide

## Issue Fixed
Frontend was trying to connect to `http://98.84.171.210/auth/login` (port 80) instead of `http://98.84.171.210:3000/auth/login` (port 3000).

## Solution
Updated frontend to automatically append `:3000` when not on localhost.

## Deploy Steps

### 1. Build and Push (From Windows)
```powershell
cd C:\Users\salko\chatapp
.\deploy.ps1
```

### 2. Deploy on AWS EC2
```bash
ssh ubuntu@98.84.171.210
cd /home/ubuntu/chatapp
docker-compose pull
docker-compose down
docker-compose up -d
```

### 3. Verify Deployment
```bash
# Check containers are running
docker ps

# Check backend logs
docker logs chatapp-backend-1

# Check frontend logs
docker logs chatapp-frontend-1

# Test backend directly
curl http://localhost:3000
```

### 4. AWS Security Group Check
Ensure port 3000 is open:
- AWS Console → EC2 → Security Groups
- Inbound Rules should include:
  - Port 80 (HTTP) - for frontend
  - Port 3000 (Custom TCP) - for backend API
  - Port 22 (SSH) - for access

### 5. Access Application
- Frontend: http://98.84.171.210
- Backend API: http://98.84.171.210:3000

### 6. Test in Browser
1. Open http://98.84.171.210
2. Open DevTools (F12) → Network tab
3. Try to login
4. Verify requests go to `http://98.84.171.210:3000/auth/login`

## Troubleshooting

### Still getting 404 errors?
```bash
# On EC2, check if backend is responding
curl http://localhost:3000

# If not responding, check logs
docker logs chatapp-backend-1

# Restart backend
docker-compose restart backend
```

### Port 3000 not accessible?
```bash
# Check if port is listening
sudo netstat -tulpn | grep 3000

# Check Docker port mapping
docker ps
```

### Clear browser cache
- Press Ctrl+Shift+Delete
- Clear cached images and files
- Hard refresh: Ctrl+F5

## Files Changed
- ✅ `frontend/src/services/authService.ts`
- ✅ `frontend/src/components/InvitationAccept.tsx`
- ✅ `frontend/src/hooks/useSocket.ts`

## What Changed
```typescript
// Before (WRONG)
window.location.origin  // Returns http://98.84.171.210

// After (CORRECT)
`${window.location.protocol}//${window.location.hostname}:3000`
// Returns http://98.84.171.210:3000
```

## Current Architecture
```
User Browser
    ↓
http://98.84.171.210 (Port 80)
    ↓
Frontend Container (Nginx)
    ↓
http://98.84.171.210:3000
    ↓
Backend Container (NestJS)
```

## Next Time You Deploy
Just run these two commands:

**Windows:**
```powershell
cd C:\Users\salko\chatapp
.\deploy.ps1
```

**AWS EC2:**
```bash
cd /home/ubuntu/chatapp && docker-compose pull && docker-compose down && docker-compose up -d
```

Done! 🚀
