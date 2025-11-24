import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLoginError, logout } from '../store/slices/authSlice';
import { addMessage, incrementUnread, initializeChat, loadPersistedChats } from '../store/slices/chatSlice';
import { setConnectedUsers, removeUserCompletely } from '../store/slices/usersSlice';
import { setSocket, clearSocket, setRegistered } from '../store/slices/socketSlice';
import type { Message } from '../store/slices/chatSlice';
import type { User } from '../components/UserList';

// Construct backend URL with fallback logic
const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Default to localhost for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // For production, use same host with port 3000
  return `${window.location.protocol}//${window.location.hostname}:3000`;
};

const BACKEND_URL = getBackendUrl();

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { username, email, password, isLoggedIn, isRegistering } = useAppSelector(state => state.auth);
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
      
      if (isRegistering) {
        // Register new user
        console.log('📝 Registering new user:', username);
        newSocket.emit(
          'registerUser',
          { username, email, password },
          (response: { success: boolean; message?: string }) => {
            if (response.success) {
              console.log('✅ Registration successful');
              dispatch(setRegistered(true));
            } else {
              console.error('❌ Registration failed:', response.message);
              dispatch(setLoginError(response.message || 'Registration failed'));
              dispatch(logout());
              newSocket.close();
            }
          }
        );
      } else {
        // Login existing user
        console.log('🔐 Logging in user:', username);
        newSocket.emit(
          'loginUser',
          { username, password },
          (response: { success: boolean; message?: string }) => {
            if (response.success) {
              console.log('✅ Login successful');
              dispatch(setRegistered(true));
            } else {
              console.error('❌ Login failed:', response.message);
              dispatch(setLoginError(response.message || 'Login failed'));
              dispatch(logout());
              newSocket.close();
            }
          }
        );
      }
    });

    newSocket.on('userList', (users: User[]) => {
      console.log('👥 Connected users updated:', users);
      dispatch(setConnectedUsers(users));
    });

    newSocket.on('persistedMessages', (data: { conversations: Record<string, any[]>; totalMessages: number }) => {
      console.log(`📦 Received ${data.totalMessages} persisted messages from backend`);
      
      // Log detailed message content for debugging
      Object.entries(data.conversations).forEach(([partner, messages]) => {
        console.log(`💬 Conversation with ${partner}:`, messages);
      });
      
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
      
      // Handle forced logout scenarios
      if (error.message.includes('logged in from another location')) {
        alert('You have been logged in from another location');
        dispatch(logout());
        newSocket.close();
      }
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('❌ Disconnected from server. Reason:', reason);
      
      // If disconnected by server (not by client), mark as not registered
      if (reason === 'io server disconnect' || reason === 'transport close') {
        dispatch(setRegistered(false));
      }
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
