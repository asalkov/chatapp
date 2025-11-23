# Redux Toolkit Implementation

This document describes the Redux Toolkit implementation for the chat application.

## Overview

The application now uses Redux Toolkit for centralized state management, replacing local component state with a global Redux store.

## Architecture

### Store Structure

```
src/store/
├── index.ts              # Store configuration
├── hooks.ts              # Typed Redux hooks
└── slices/
    ├── authSlice.ts      # Authentication state
    ├── chatSlice.ts      # Chat messages and UI state
    ├── usersSlice.ts     # Connected users state
    └── socketSlice.ts    # Socket.IO connection state
```

## State Slices

### 1. Auth Slice (`authSlice.ts`)

Manages user authentication state.

**State:**
- `username: string` - Current user's username
- `isLoggedIn: boolean` - Login status
- `loginError: string` - Login error message

**Actions:**
- `login(username)` - Log in a user
- `logout()` - Log out the current user
- `setLoginError(message)` - Set login error
- `clearLoginError()` - Clear login error

### 2. Chat Slice (`chatSlice.ts`)

Manages chat messages, active chat, and UI state.

**State:**
- `chats: Record<string, Message[]>` - All chat messages by chat ID
- `activeChat: string | null` - Currently active chat
- `unreadCounts: Record<string, number>` - Unread message counts
- `isChatListOpen: boolean` - Chat list visibility (mobile)

**Actions:**
- `addMessage({ chatId, message })` - Add a message to a chat
- `setActiveChat(chatId)` - Set the active chat
- `incrementUnread(chatId)` - Increment unread count
- `clearUnread(chatId)` - Clear unread count
- `setChatListOpen(isOpen)` - Set chat list visibility
- `toggleChatList()` - Toggle chat list visibility
- `clearAllChats()` - Clear all chats (on logout)
- `initializeChat(chatId)` - Initialize a new chat

### 3. Users Slice (`usersSlice.ts`)

Manages connected users.

**State:**
- `connectedUsers: User[]` - List of connected users

**Actions:**
- `setConnectedUsers(users)` - Set the connected users list
- `addUser(user)` - Add a user to the list
- `removeUser(userId)` - Remove a user from the list
- `clearUsers()` - Clear all users

### 4. Socket Slice (`socketSlice.ts`)

Manages Socket.IO connection.

**State:**
- `socket: Socket | null` - Socket.IO instance
- `isConnected: boolean` - Connection status

**Actions:**
- `setSocket(socket)` - Set the socket instance
- `setConnected(isConnected)` - Set connection status
- `clearSocket()` - Clear socket on disconnect

## Custom Hooks

### `useAppDispatch` and `useAppSelector`

Type-safe Redux hooks located in `src/store/hooks.ts`:

```typescript
import { useAppDispatch, useAppSelector } from './store/hooks';

// Usage
const dispatch = useAppDispatch();
const username = useAppSelector(state => state.auth.username);
```

### `useSocket`

Custom hook that encapsulates all Socket.IO logic (`src/hooks/useSocket.ts`):

- Initializes socket connection when user logs in
- Sets up all socket event listeners
- Dispatches Redux actions on socket events
- Cleans up connection on logout

**Benefits:**
- Separates socket logic from UI components
- Automatically manages socket lifecycle
- Centralizes all socket event handling

## Usage Examples

### Dispatching Actions

```typescript
import { useAppDispatch } from './store/hooks';
import { login, logout } from './store/slices/authSlice';
import { setActiveChat } from './store/slices/chatSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  
  // Login
  dispatch(login('username'));
  
  // Set active chat
  dispatch(setActiveChat('user123'));
  
  // Logout
  dispatch(logout());
}
```

### Selecting State

```typescript
import { useAppSelector } from './store/hooks';

function MyComponent() {
  // Select single value
  const username = useAppSelector(state => state.auth.username);
  
  // Select multiple values
  const { chats, activeChat } = useAppSelector(state => state.chat);
  
  // Select with computation
  const currentMessages = useAppSelector(state => 
    state.chat.activeChat ? state.chat.chats[state.chat.activeChat] : []
  );
}
```

## Benefits of Redux Implementation

1. **Centralized State Management**
   - Single source of truth for application state
   - Easier to debug and track state changes
   - Redux DevTools support

2. **Type Safety**
   - Full TypeScript support
   - Type-safe actions and selectors
   - Compile-time error checking

3. **Predictable State Updates**
   - Immutable state updates
   - Clear action-based state changes
   - Easy to test

4. **Code Organization**
   - Separation of concerns
   - Reusable logic through slices
   - Custom hooks for complex logic

5. **Performance**
   - Optimized re-renders with selectors
   - Memoization support
   - Efficient state updates

6. **Developer Experience**
   - Redux DevTools integration
   - Time-travel debugging
   - Action logging

## Migration Notes

### Before (Local State)
```typescript
const [username, setUsername] = useState('');
const [chats, setChats] = useState(new Map());
```

### After (Redux)
```typescript
const username = useAppSelector(state => state.auth.username);
const chats = useAppSelector(state => state.chat.chats);
const dispatch = useAppDispatch();

dispatch(login('username'));
```

## Data Structure Changes

### Maps to Records

Redux requires serializable state, so `Map` objects were converted to `Record` objects:

**Before:**
```typescript
chats: Map<string, Message[]>
unreadCounts: Map<string, number>
```

**After:**
```typescript
chats: Record<string, Message[]>
unreadCounts: Record<string, number>
```

**Access pattern:**
```typescript
// Before
chats.get(chatId)
chats.set(chatId, messages)

// After
chats[chatId]
chats = { ...chats, [chatId]: messages }
```

## Socket.IO Integration

The socket instance is stored in Redux but marked as non-serializable in the middleware configuration:

```typescript
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['socket/setSocket'],
      ignoredPaths: ['socket.socket'],
    },
  })
```

This allows us to store the socket instance while maintaining Redux best practices.

## Testing

Redux Toolkit makes testing easier:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

// Create test store
const store = configureStore({
  reducer: { auth: authReducer }
});

// Test actions
store.dispatch(login('testuser'));
expect(store.getState().auth.username).toBe('testuser');
```

## Future Enhancements

Potential improvements:

1. **Redux Persist** - Persist state to localStorage
2. **RTK Query** - API data fetching and caching
3. **Middleware** - Custom middleware for logging, analytics
4. **Selectors** - Memoized selectors with Reselect
5. **Async Thunks** - Complex async operations
6. **Entity Adapters** - Normalized state management

## Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React-Redux Hooks](https://react-redux.js.org/api/hooks)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
