import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  sender: string;
  message: string;
  type?: 'user' | 'system';
  isPrivate?: boolean;
  toId?: string;
  fromId?: string;
  timestamp?: string;
  recipient?: string;
}

interface ChatState {
  chats: Record<string, Message[]>; // Using Record instead of Map for Redux serialization
  activeChat: string | null;
  unreadCounts: Record<string, number>;
  isChatListOpen: boolean;
}

const initialState: ChatState = {
  chats: {},
  activeChat: null,
  unreadCounts: {},
  isChatListOpen: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ chatId: string; message: Message }>) => {
      const { chatId, message } = action.payload;
      if (!state.chats[chatId]) {
        state.chats[chatId] = [];
      }
      state.chats[chatId].push(message);
    },
    setActiveChat: (state, action: PayloadAction<string | null>) => {
      state.activeChat = action.payload;
      // Clear unread count for this chat
      if (action.payload && state.unreadCounts[action.payload]) {
        delete state.unreadCounts[action.payload];
      }
    },
    incrementUnread: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      if (state.activeChat !== chatId) {
        state.unreadCounts[chatId] = (state.unreadCounts[chatId] || 0) + 1;
      }
    },
    clearUnread: (state, action: PayloadAction<string>) => {
      delete state.unreadCounts[action.payload];
    },
    setChatListOpen: (state, action: PayloadAction<boolean>) => {
      state.isChatListOpen = action.payload;
    },
    toggleChatList: (state) => {
      state.isChatListOpen = !state.isChatListOpen;
    },
    clearAllChats: (state) => {
      state.chats = {};
      state.activeChat = null;
      state.unreadCounts = {};
    },
    initializeChat: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      if (!state.chats[chatId]) {
        state.chats[chatId] = [];
      }
    },
    loadPersistedChats: (state, action: PayloadAction<Record<string, Message[]>>) => {
      // Merge with existing chats instead of replacing
      const newChats = action.payload;
      Object.keys(newChats).forEach(chatId => {
        if (state.chats[chatId]) {
          // Merge messages, avoiding duplicates based on timestamp and content
          const existing = state.chats[chatId];
          const incoming = newChats[chatId];
          const merged = [...existing];
          
          incoming.forEach(newMsg => {
            const isDuplicate = existing.some(existingMsg => 
              existingMsg.timestamp === newMsg.timestamp && 
              existingMsg.message === newMsg.message &&
              existingMsg.sender === newMsg.sender
            );
            if (!isDuplicate) {
              merged.push(newMsg);
            }
          });
          
          // Sort by timestamp
          merged.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });
          
          state.chats[chatId] = merged;
        } else {
          state.chats[chatId] = newChats[chatId];
        }
      });
    },
    deleteChat: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      delete state.chats[chatId];
      delete state.unreadCounts[chatId];
      if (state.activeChat === chatId) {
        state.activeChat = null;
      }
    },
  },
});

export const {
  addMessage,
  setActiveChat,
  incrementUnread,
  clearUnread,
  setChatListOpen,
  toggleChatList,
  clearAllChats,
  initializeChat,
  loadPersistedChats,
  deleteChat,
} = chatSlice.actions;

export default chatSlice.reducer;
