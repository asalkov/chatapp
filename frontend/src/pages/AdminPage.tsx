import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout as logoutAction } from '../store/slices/authSlice';
import { loadPersistedChats, deleteChat } from '../store/slices/chatSlice';
import { clearSocket } from '../store/slices/socketSlice';
import { removeUserCompletely } from '../store/slices/usersSlice';
import { useSocket } from '../hooks/useSocket';
import {
  Box,
  Typography,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import AdminPanel from '../components/AdminPanel';

function AdminPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const { username, isLoggedIn, isAdmin } = useAppSelector(state => state.auth);
  const { chats } = useAppSelector(state => state.chat);
  const { allUsers } = useAppSelector(state => state.users);
  const socket = useAppSelector(state => state.socket.socket);
  const isSocketRegistered = useAppSelector(state => state.socket.isRegistered);
  
  // Initialize socket connection
  useSocket();

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/', { replace: true });
    } else if (!isAdmin) {
      navigate('/chat', { replace: true });
    }
  }, [isLoggedIn, isAdmin, navigate]);

  // Fetch all chats for admin (only after socket is registered)
  useEffect(() => {
    if (isLoggedIn && isAdmin && socket && isSocketRegistered) {
      console.log('🔑 Admin logged in and registered, fetching all chats...');
      socket.emit('adminGetAllChats', {}, (response: { success: boolean; chats?: any; message?: string }) => {
        if (response.success && response.chats) {
          console.log('📦 Admin received all chats:', response.chats);
          dispatch(loadPersistedChats(response.chats));
        } else {
          console.error('❌ Failed to fetch all chats:', response.message);
        }
      });
    }
  }, [isLoggedIn, isAdmin, socket, isSocketRegistered, dispatch]);

  const handleLogout = async () => {
    if (socket) {
      socket.close();
    }
    
    // Clear auth token
    const { authService } = await import('../services/authService');
    authService.logout();
    
    dispatch(logoutAction());
    dispatch(clearSocket());
    navigate('/', { replace: true });
  };

  const handleDeleteUser = (usernameToDelete: string) => {
    if (!socket) {
      console.error('❌ Socket not connected');
      return;
    }

    // Send remove user request to backend
    socket.emit(
      'adminRemoveUser',
      { username: usernameToDelete, adminUsername: username },
      (response: { success: boolean; message?: string }) => {
        if (response.success) {
          console.log(`✅ ${response.message}`);
          // Remove from local state
          dispatch(removeUserCompletely(usernameToDelete));
          dispatch(deleteChat(usernameToDelete));
        } else {
          console.error(`❌ Failed to remove user: ${response.message}`);
          alert(`Failed to remove user: ${response.message}`);
        }
      }
    );
  };

  const handleDeleteChat = (chatId: string) => {
    dispatch(deleteChat(chatId));
    console.log(`🗑️ Admin deleted chat: ${chatId}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        overflow: 'hidden',
      }}
    >
      <CssBaseline />
      
      {/* Header */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            <Avatar
              sx={{
                mr: 2,
                width: 40,
                height: 40,
                background: '#fff',
                color: '#667eea',
              }}
            >
              <PersonIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Admin Panel
              </Typography>
              <Typography variant="caption">
                Welcome, {username}!
              </Typography>
            </Box>
            <IconButton onClick={handleLogout} sx={{ color: '#fff' }}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        {/* Admin Panel Content */}
        <AdminPanel
          users={allUsers}
          chats={chats}
          onDeleteUser={handleDeleteUser}
          onDeleteChat={handleDeleteChat}
        />
      </Box>
    </Box>
  );
}

export default AdminPage;
