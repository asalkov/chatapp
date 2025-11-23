# Offline User Tracking Implementation

## Overview

Users are now tracked even when they go offline. Instead of removing users from the list when they disconnect, they are marked as offline and remain visible in the chat list.

## Changes Made

### 1. User Interface Update

**File: `src/components/UserList.tsx`**

Added `isOnline` property to the User interface:

```typescript
export interface User {
    username: string;
    id: string;
    isOnline?: boolean;  // New property
}
```

### 2. Users Slice Enhancement

**File: `src/store/slices/usersSlice.ts`**

**New State Structure:**
```typescript
interface UsersState {
  connectedUsers: User[];  // Currently online users only
  allUsers: User[];        // All users (online and offline)
}
```

**Updated Actions:**

- **`setConnectedUsers`**: Now maintains both online users and all users
  - Marks incoming users as online
  - Marks existing users as offline if they're not in the online list
  - Preserves users who have gone offline

- **`addUser`**: Adds users to both lists with online status

- **`markUserOffline`** (NEW): Explicitly marks a user as offline
  - Removes from `connectedUsers`
  - Updates `isOnline: false` in `allUsers`

- **`clearUsers`**: Modified to mark all users offline instead of clearing
  - Clears `connectedUsers`
  - Sets `isOnline: false` for all users in `allUsers`

### 3. ChatList Component Updates

**File: `src/components/ChatList.tsx`**

- Now uses `allUsers` instead of just `connectedUsers`
- Displays both online and offline users
- Shows visual indicators:
  - **Green dot**: User is online
  - **Gray dot**: User is offline

**Visual Changes:**
```typescript
// Status indicator color based on online status
background: item.isOnline ? '#4caf50' : '#9e9e9e'
```

### 4. App Component Updates

**File: `src/App.tsx`**

- Retrieves both `connectedUsers` and `allUsers` from Redux state
- Passes `allUsers` to ChatList component
- Header shows correct online/offline status:
  ```typescript
  {allUsers.find(u => u.username === activeChat)?.isOnline ? 'Online' : 'Offline'}
  ```

## Behavior

### Before
- User logs out → Removed from list completely
- User disconnects → Disappears from chat list
- No history of previous conversations with offline users

### After
- User logs out → Marked as offline, stays in list
- User disconnects → Shows as offline with gray indicator
- All previous chat partners remain visible
- Can still view chat history with offline users
- Can see when users come back online

## Benefits

1. **Persistent Chat History**: Users can see all their previous conversations
2. **Better UX**: No confusion about "missing" users
3. **Status Awareness**: Clear visual indication of who's online/offline
4. **Conversation Continuity**: Easy to resume chats when users come back online
5. **Contact List**: Acts like a contact list showing all known users

## Visual Indicators

### Online User
- Green status dot (bottom-right of avatar)
- Full color avatar
- "Online" text in header when chatting

### Offline User
- Gray status dot (bottom-right of avatar)
- Full color avatar (same as online)
- "Offline" text in header when chatting

## Data Flow

```
Server sends userList
    ↓
setConnectedUsers action
    ↓
Redux updates:
  - connectedUsers (online only)
  - allUsers (online + offline)
    ↓
ChatList receives allUsers
    ↓
Displays all users with status indicators
```

## Future Enhancements

Potential improvements:

1. **Last Seen**: Show when user was last online
2. **Typing Indicators**: Show when online users are typing
3. **Read Receipts**: Show if messages were read
4. **User Profiles**: Click on user to see profile/status
5. **Presence States**: Away, Busy, Do Not Disturb, etc.
6. **Persistence**: Save user list to localStorage
7. **Search Filters**: Filter by online/offline status

## Testing

To test the offline user tracking:

1. Open two browser windows
2. Log in as different users in each
3. Both users should appear online
4. Close one browser window
5. The closed user should now show as offline (gray dot)
6. The offline user remains in the chat list
7. Previous messages are still visible
8. Reopen the browser and log back in
9. User should show as online again (green dot)
