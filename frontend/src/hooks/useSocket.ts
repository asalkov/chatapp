import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLoginError, logout } from '../store/slices/authSlice';
import { addMessage, incrementUnread, initializeChat, loadPersistedChats } from '../store/slices/chatSlice';
import { setConnectedUsers, removeUserCompletely } from '../store/slices/usersSlice';
import { setSocket, clearSocket } from '../store/slices/socketSlice';
import type { Message } from '../store/slices/chatSlice';
import type { User } from '../components/UserList';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { username, isLoggedIn } = useAppSelector(state => state.auth);
  const { activeChat } = useAppSelector(state => state.chat);
  const { connectedUsers } = useAppSelector(state => state.users);
  
  const connectedUsersRef = useRef<User[]>([]);
  
  useEffect(() => {
    connectedUsersRef.current = connectedUsers;
  }, [connectedUsers]);

  useEffect(() => {
    if (!isLoggedIn) return;

    console.log('🔌 Initializing WebSocket connection to:', BACKEND_URL);
    const newSocket = io(BACKEND_URL);
    dispatch(setSocket(newSocket));

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log('Socket ID:', newSocket.id);
      
      newSocket.emit('register', { username }, (response: { success: boolean; message?: string }) => {
        if (response.success) {
          console.log('✅ Registration successful');
        } else {
          console.error('❌ Registration failed:', response.message);
          dispatch(setLoginError(response.message || 'Registration failed'));
          dispatch(logout());
          newSocket.close();
        }
      });
    });

    newSocket.on('userList', (users: User[]) => {
      console.log('👥 Connected users updated:', users);
      dispatch(setConnectedUsers(users));
    });

    newSocket.on('persistedMessages', (data: { conversations: Record<string, any[]>; totalMessages: number }) => {
      console.log(`📦 Received ${data.totalMessages} persisted messages from backend`);
      
      // Convert conversations to the format expected by Redux
      const chats: Record<string, any[]> = {};
      
      Object.entries(data.conversations).forEach(([partner, messages]) => {
        chats[partner] = messages;
      });
      
      // Load into Redux state (this will merge with localStorage data)
      dispatch(loadPersistedChats(chats));
      
      console.log(`✅ Loaded ${Object.keys(chats).length} conversations from backend`);
    });

    newSocket.on('userJoined', (data: { username: string }) => {
      console.log('👤 User joined:', data.username);
    });

    newSocket.on('userLeft', (data: { username: string }) => {
      console.log('👤 User left:', data.username);
    });

    newSocket.on('msgToClient', (payload: Message) => {
      console.log('📨 Message received:', payload);

      if (payload.isPrivate) {
        let chatId: string;
        if (payload.sender === username) {
          chatId = payload.recipient || activeChat || 'Unknown';
          
          if (chatId === 'Unknown' && payload.toId) {
            const recipientUser = connectedUsersRef.current.find(u => u.id === payload.toId);
            if (recipientUser) chatId = recipientUser.username;
          }
        } else {
          chatId = payload.sender;
        }

        dispatch(initializeChat(chatId));
        dispatch(addMessage({ chatId, message: payload }));

        if (activeChat !== chatId) {
          dispatch(incrementUnread(chatId));
        }
      } else {
        console.log('Ignoring global message:', payload);
      }
    });

    newSocket.on('userRemoved', (data: { username: string; removedBy: string }) => {
      console.log(`🗑️ User ${data.username} was removed by ${data.removedBy}`);
      // Remove user from local state
      dispatch(removeUserCompletely(data.username));
    });

    newSocket.on('removedByAdmin', (data: { message: string }) => {
      console.error(`❌ ${data.message}`);
      alert(data.message);
      // Force logout
      dispatch(logout());
      newSocket.close();
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('❌ Socket error:', error.message);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
    });

    // Expose socket for debugging
    (window as any).socket = newSocket;

    return () => {
      console.log('🔌 Closing WebSocket connection');
      newSocket.close();
      dispatch(clearSocket());
    };
  }, [isLoggedIn, username, dispatch, activeChat]);
};
