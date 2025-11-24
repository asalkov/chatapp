# WebSocket Registration Fixes

## Problem 1: Race Condition (FIXED)
Admin panel was trying to fetch all chats immediately after socket connection, but before WebSocket registration completed, causing "Not authenticated" errors.

## Problem 2: Duplicate Session (NEW FIX)
When a user logs in from a new location or auto-login triggers, the backend was rejecting the connection with "Username already taken" because the old session wasn't properly disconnected.

## Error Messages
```
❌ Failed to fetch all chats: Not authenticated
❌ Registration failed: Username already taken
❌ Disconnected from server
```

## Root Cause
The `adminGetAllChats` event was being emitted as soon as the socket existed, but the WebSocket registration (`register` event) is asynchronous and takes time to complete. This created a race condition where:

1. Socket connects
2. Admin panel tries to fetch chats (FAILS - not registered yet)
3. Registration completes (too late)

## Solution

### 1. Added Registration State Tracking
**File**: `frontend/src/store/slices/socketSlice.ts`

Added `isRegistered` flag to track when WebSocket registration completes:

```typescript
interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  isRegistered: boolean; // NEW
}
```

### 2. Set Registration Status on Success
**File**: `frontend/src/hooks/useSocket.ts`

Updated the registration callback to set the flag:

```typescript
newSocket.emit('register', { username }, (response) => {
  if (response.success) {
    console.log('✅ Registration successful');
    dispatch(setRegistered(true)); // NEW
  }
});
```

### 3. Wait for Registration Before Fetching
**File**: `frontend/src/App.tsx`

Changed the admin chat fetch to depend on `isSocketRegistered`:

```typescript
// Before (WRONG)
useEffect(() => {
  if (isLoggedIn && isAdmin && socket) {
    socket.emit('adminGetAllChats', ...);
  }
}, [isLoggedIn, isAdmin, socket]);

// After (CORRECT)
useEffect(() => {
  if (isLoggedIn && isAdmin && socket && isSocketRegistered) {
    socket.emit('adminGetAllChats', ...);
  }
}, [isLoggedIn, isAdmin, socket, isSocketRegistered]);
```

## Solution for Problem 2: Duplicate Session Handling

### Backend: Disconnect Old Session When New One Connects
**File**: `backend/src/app.gateway.ts`

When a user tries to register with a username that's already connected:
1. Check if it's the same socket (reconnection) - allow it
2. If it's a different socket (new location) - disconnect the old session and allow the new one

```typescript
// Check if username is already taken by another connection
const existingEntry = Array.from(this.users.entries()).find(
  ([socketId, u]) => u.username.toLowerCase() === username.toLowerCase(),
);

if (existingEntry) {
  const [existingSocketId, existingUser] = existingEntry;
  
  if (existingSocketId === client.id) {
    // Same socket reconnecting
    this.logger.log(`User ${username} reconnecting with same socket ID`);
  } else {
    // Disconnect old session, allow new one
    this.logger.log(`User ${username} connecting from new session, disconnecting old session`);
    const oldSocket = this.server.sockets.sockets.get(existingSocketId);
    if (oldSocket) {
      oldSocket.emit('error', { message: 'You have been logged in from another location' });
      oldSocket.disconnect(true);
    }
    this.users.delete(existingSocketId);
  }
}
```

### Frontend: Better Error Handling
**File**: `frontend/src/hooks/useSocket.ts`

Improved error handling to not logout on "username already taken" since backend now handles it:

```typescript
if (response.success) {
  console.log('✅ Registration successful');
  dispatch(setRegistered(true));
} else {
  console.error('❌ Registration failed:', response.message);
  // Only logout if it's not a "username already taken" error
  if (response.message !== 'Username already taken') {
    dispatch(setLoginError(response.message || 'Registration failed'));
    dispatch(logout());
    newSocket.close();
  }
}
```

## Files Changed
- ✅ `frontend/src/store/slices/socketSlice.ts` - Added registration state
- ✅ `frontend/src/hooks/useSocket.ts` - Set registration flag on success, improved error handling
- ✅ `frontend/src/App.tsx` - Wait for registration before admin actions
- ✅ `backend/src/app.gateway.ts` - Handle duplicate sessions by disconnecting old one

## How It Works Now

### Correct Flow
```
1. Socket connects
2. Emit 'register' event
3. Wait for registration response
4. Set isRegistered = true
5. Admin panel detects isSocketRegistered
6. Fetch all chats (SUCCESS)
```

## Testing

### Before Fix
```
Console:
❌ Failed to fetch all chats: Not authenticated
```

### After Fix
```
Console:
✅ Connected to server
✅ Registration successful
🔑 Admin logged in and registered, fetching all chats...
📦 Admin received all chats: {...}
```

## Benefits

1. **No Race Conditions**: Guarantees registration completes before admin actions
2. **No Arbitrary Delays**: Uses actual registration status instead of setTimeout
3. **Better UX**: More reliable admin panel functionality
4. **Reusable**: Other features can also wait for `isSocketRegistered`

## Deploy

Rebuild and redeploy the frontend:

```powershell
# Windows
cd C:\Users\salko\chatapp
.\deploy.ps1
```

```bash
# AWS EC2
cd /home/ubuntu/chatapp
docker-compose pull
docker-compose down
docker-compose up -d
```

## Future Improvements

Consider using this pattern for other socket events that require authentication:
- Private messages
- User removal
- Invitation sending

All can check `isSocketRegistered` before emitting events.
