import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../components/UserList';

interface UsersState {
  connectedUsers: User[]; // All users (online and offline)
  allUsers: User[]; // Track all users we've seen
}

const initialState: UsersState = {
  connectedUsers: [],
  allUsers: [],
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setConnectedUsers: (state, action: PayloadAction<User[]>) => {
      // Mark incoming users as online
      const onlineUsers = action.payload.map(u => ({ ...u, isOnline: true }));
      
      // Get usernames of online users
      const onlineUsernames = new Set(onlineUsers.map(u => u.username));
      
      // Mark existing users as offline if they're not in the online list
      const updatedAllUsers = state.allUsers.map(u => ({
        ...u,
        isOnline: onlineUsernames.has(u.username)
      }));
      
      // Add new users that we haven't seen before
      onlineUsers.forEach(onlineUser => {
        if (!updatedAllUsers.some(u => u.username === onlineUser.username)) {
          updatedAllUsers.push(onlineUser);
        }
      });
      
      state.allUsers = updatedAllUsers;
      state.connectedUsers = onlineUsers;
    },
    addUser: (state, action: PayloadAction<User>) => {
      const userWithStatus = { ...action.payload, isOnline: true };
      
      // Add to connected users if not exists
      const existsInConnected = state.connectedUsers.some(u => u.username === action.payload.username);
      if (!existsInConnected) {
        state.connectedUsers.push(userWithStatus);
      }
      
      // Add to all users if not exists, or update online status
      const existingUserIndex = state.allUsers.findIndex(u => u.username === action.payload.username);
      if (existingUserIndex >= 0) {
        state.allUsers[existingUserIndex].isOnline = true;
      } else {
        state.allUsers.push(userWithStatus);
      }
    },
    markUserOffline: (state, action: PayloadAction<string>) => {
      // Remove from connected users
      state.connectedUsers = state.connectedUsers.filter(u => u.username !== action.payload);
      
      // Mark as offline in all users
      const userIndex = state.allUsers.findIndex(u => u.username === action.payload);
      if (userIndex >= 0) {
        state.allUsers[userIndex].isOnline = false;
      }
    },
    removeUser: (state, action: PayloadAction<string>) => {
      // Legacy action - now just marks offline
      state.connectedUsers = state.connectedUsers.filter(u => u.id !== action.payload);
      const userIndex = state.allUsers.findIndex(u => u.id === action.payload);
      if (userIndex >= 0) {
        state.allUsers[userIndex].isOnline = false;
      }
    },
    clearUsers: (state) => {
      // Mark all users as offline instead of clearing
      state.connectedUsers = [];
      state.allUsers = state.allUsers.map(u => ({ ...u, isOnline: false }));
    },
    loadPersistedUsers: (state, action: PayloadAction<User[]>) => {
      // Load users and mark them all as offline initially
      state.allUsers = action.payload.map(u => ({ ...u, isOnline: false }));
      state.connectedUsers = [];
    },
    removeUserCompletely: (state, action: PayloadAction<string>) => {
      // Admin action: completely remove a user from all lists
      const username = action.payload;
      state.connectedUsers = state.connectedUsers.filter(u => u.username !== username);
      state.allUsers = state.allUsers.filter(u => u.username !== username);
    },
  },
});

export const { setConnectedUsers, addUser, markUserOffline, removeUser, clearUsers, loadPersistedUsers, removeUserCompletely } = usersSlice.actions;
export default usersSlice.reducer;
