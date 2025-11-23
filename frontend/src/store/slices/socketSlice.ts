import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  isRegistered: boolean;
}

const initialState: SocketState = {
  socket: null,
  isConnected: false,
  isRegistered: false,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocket: (state, action: PayloadAction<Socket | null>) => {
      // Note: Socket.IO socket is not serializable, but we'll store it anyway
      // This is acceptable for this use case as we won't be persisting state
      state.socket = action.payload as any;
      state.isConnected = action.payload?.connected || false;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setRegistered: (state, action: PayloadAction<boolean>) => {
      state.isRegistered = action.payload;
    },
    clearSocket: (state) => {
      state.socket = null;
      state.isConnected = false;
      state.isRegistered = false;
    },
  },
});

export const { setSocket, setConnected, setRegistered, clearSocket } = socketSlice.actions;
export default socketSlice.reducer;
