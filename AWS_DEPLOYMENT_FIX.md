# AWS Deployment Fix - Backend URL Configuration

## Problem
The frontend was hardcoded to use `localhost:3000`, causing connection failures when deployed to AWS.

## Solution Applied

### 1. Fixed Frontend Code
Updated all hardcoded `localhost:3000` URLs to use dynamic configuration:

**Files Updated:**
- `frontend/src/services/authService.ts`
- `frontend/src/components/InvitationAccept.tsx`
- `frontend/src/hooks/useSocket.ts` (already correct)

**Pattern Used:**
```typescript
const API_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.hostname}:3000`);
```

This means:
- **Local development**: Uses `http://localhost:3000`
- **AWS deployment**: Uses `http://your-ec2-ip:3000` (includes port 3000)
- **Custom backend URL**: Can be set via `VITE_BACKEND_URL` environment variable

### 2. Deployment Steps

#### Option A: Same Domain (Recommended - Already Configured)
If your frontend and backend are on the same server (which they are based on your docker-compose.yml):

1. **Rebuild and redeploy:**
   ```powershell
   # From C:\Users\salko\chatapp
   .\deploy.ps1
   ```

2. **On AWS EC2, pull and restart:**
   ```bash
   cd /home/ubuntu/chatapp
   docker-compose pull
   docker-compose down
   docker-compose up -d
   ```

3. **Access your app:**
   - Frontend: `http://your-ec2-ip`
   - Backend: `http://your-ec2-ip:3000`
   - The frontend will automatically use `http://your-ec2-ip:3000` for API calls

#### Option B: Different Domains (If Needed)
If your backend is on a different domain:

1. **Build with custom backend URL:**
   ```powershell
   cd frontend
   docker build --build-arg VITE_BACKEND_URL=https://your-backend-domain.com -t chatapp-frontend .
   ```

2. **Update deploy.ps1** to include the build arg:
   ```powershell
   docker build --build-arg VITE_BACKEND_URL=https://your-backend-domain.com -t chatapp-frontend .
   ```

### 3. AWS Security Group Configuration

**IMPORTANT**: Ensure your EC2 Security Group allows inbound traffic on port 3000:

1. Go to AWS Console → EC2 → Security Groups
2. Find your instance's security group
3. Add inbound rule:
   - **Type**: Custom TCP
   - **Port**: 3000
   - **Source**: 0.0.0.0/0 (or your specific IP range)

Without this, the frontend won't be able to reach the backend API.

### 4. CORS Configuration

Make sure your backend allows requests from your frontend domain. Check `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: '*', // For development
  // origin: ['http://your-frontend-domain.com'], // For production
  credentials: true,
});
```

And in `backend/src/app.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: '*', // For development
    // origin: ['http://your-frontend-domain.com'], // For production
  },
})
```

### 4. Verification

After deployment, check browser console:
1. Open DevTools (F12)
2. Check Network tab
3. Verify API calls are going to the correct URL
4. Check Console for WebSocket connection logs

Expected logs:
```
🔌 Initializing WebSocket connection to: http://your-ec2-ip
✅ Connected to server
✅ Registration successful
```

### 5. Troubleshooting

#### Still seeing localhost:3000 errors?
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check if old frontend image is cached on EC2

#### WebSocket connection fails?
- Ensure port 3000 is open in AWS Security Group
- Check backend logs: `docker logs chatapp-backend-1`
- Verify backend is running: `curl http://localhost:3000`

#### CORS errors?
- Update backend CORS configuration to allow your frontend domain
- Restart backend after changes

### 6. Production Recommendations

For production deployment:

1. **Use HTTPS:**
   - Set up SSL certificates (Let's Encrypt)
   - Update CORS to specific domains
   - Use secure WebSocket (wss://)

2. **Use Environment Variables:**
   ```bash
   # On EC2, create .env file
   echo "VITE_BACKEND_URL=https://api.yourdomain.com" > frontend/.env
   ```

3. **Use a Reverse Proxy (Nginx):**
   ```nginx
   # Serve frontend on /
   # Proxy /api to backend
   location /api {
     proxy_pass http://backend:3000;
   }
   ```

4. **Update docker-compose.yml:**
   ```yaml
   frontend:
     environment:
       - VITE_BACKEND_URL=https://api.yourdomain.com
   ```

### 7. Current Architecture

```
┌─────────────────────────────────────────┐
│         AWS EC2 Instance                │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Frontend    │    │   Backend    │  │
│  │  (Nginx)     │    │  (NestJS)    │  │
│  │  Port 80     │───▶│  Port 3000   │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
└─────────────────────────────────────────┘
         │
         ▼
   User's Browser
   (http://ec2-ip)
```

Frontend automatically uses `window.location.origin` which resolves to the EC2 IP, then makes API calls to `http://ec2-ip:3000`.

### 8. Quick Deploy Command

```powershell
# From C:\Users\salko\chatapp
.\deploy.ps1

# Then on EC2:
ssh ubuntu@your-ec2-ip
cd /home/ubuntu/chatapp
docker-compose pull && docker-compose down && docker-compose up -d
```

## Summary

✅ **Fixed**: All hardcoded localhost URLs replaced with dynamic configuration  
✅ **Works**: Local development (localhost:3000)  
✅ **Works**: AWS deployment (same domain)  
✅ **Flexible**: Can set custom backend URL via environment variable  

The app should now work correctly on AWS!
