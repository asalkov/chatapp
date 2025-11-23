# Invitation Link Fix for AWS Deployment

## Problem

Invitation links were hardcoded to `http://localhost:5173`, causing them to fail on AWS:

```
❌ http://localhost:5173/invite/inv_1763887056932_56b1xuudqlq
✅ http://98.84.171.210/invite/inv_1763887056932_56b1xuudqlq
```

## Root Cause

Backend code was using a fallback to localhost:

```typescript
// app.gateway.ts & invitation.controller.ts
const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
```

Without `FRONTEND_URL` environment variable, it always defaulted to localhost.

## Solution

Added `FRONTEND_URL` environment variable to backend configuration.

### Files Modified

#### 1. `docker-compose.yml` (AWS Production)
```yaml
backend:
  environment:
    - PORT=3000
    - FRONTEND_URL=http://98.84.171.210  # NEW
```

#### 2. `local/docker-compose.yml` (Local Development)
```yaml
backend:
  environment:
    - PORT=3000
    - NODE_ENV=development
    - FRONTEND_URL=http://localhost:5173  # NEW
```

## How It Works Now

### Local Development
```
Backend generates: http://localhost:5173/invite/TOKEN
User clicks → Opens local frontend ✅
```

### AWS Production
```
Backend generates: http://98.84.171.210/invite/TOKEN
User clicks → Opens AWS frontend ✅
```

## Deployment Steps

### 1. Update AWS Deployment

The `docker-compose.yml` is already updated. Just restart the backend:

```bash
ssh ubuntu@98.84.171.210
cd /home/ubuntu/chatapp
docker-compose restart backend
```

**Note:** No need to rebuild images since we only changed environment variables.

### 2. Test Invitation Flow

1. Login as any user
2. Click "Invite Friend" button
3. Enter an email address
4. Check the generated invitation link
5. Should now be: `http://98.84.171.210/invite/TOKEN`

### 3. Verify Link Works

1. Copy the invitation link
2. Open in new tab/browser
3. Should load the invitation acceptance page
4. Accept/Decline should work properly

## Environment Variable Priority

The backend checks in this order:

1. **`process.env.FRONTEND_URL`** - Set in docker-compose
2. **Fallback** - `http://localhost:5173` (only if env var not set)

## For Custom Domains

If you add a custom domain later:

```yaml
# docker-compose.yml
backend:
  environment:
    - FRONTEND_URL=https://chat.yourdomain.com
```

Then invitation links will be:
```
https://chat.yourdomain.com/invite/TOKEN
```

## Backend Code (No Changes Needed)

The backend code already supports this pattern:

```typescript
// app.gateway.ts (line 357)
const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;

// invitation.controller.ts (line 42)
const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
```

## Testing Checklist

- [ ] Restart backend on AWS
- [ ] Send invitation from AWS deployment
- [ ] Check generated link format
- [ ] Click invitation link
- [ ] Verify invitation page loads
- [ ] Accept invitation
- [ ] Verify user can login

## Quick Restart Command

```bash
# On AWS EC2
ssh ubuntu@98.84.171.210
cd /home/ubuntu/chatapp
docker-compose restart backend

# Verify
docker logs chatapp-backend-1 --tail 50
```

## Summary

✅ **Fixed**: Invitation links now use correct domain  
✅ **Local**: Still works with localhost:5173  
✅ **AWS**: Uses EC2 IP address  
✅ **No rebuild**: Just restart backend  
✅ **Future-proof**: Easy to change to custom domain
