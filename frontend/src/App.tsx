import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { login, logout as logoutAction, clearLoginError } from './store/slices/authSlice';
import { setActiveChat, toggleChatList, clearAllChats, loadPersistedChats, addMessage, initializeChat, deleteChat } from './store/slices/chatSlice';
import { clearSocket } from './store/slices/socketSlice';
import { loadPersistedUsers, removeUserCompletely } from './store/slices/usersSlice';
import { useSocket } from './hooks/useSocket';
import { saveChatsToStorage, loadChatsFromStorage, saveUsersToStorage, loadUsersFromStorage, saveLastUsername } from './utils/storage';
import {
  Box,
  TextField,
  Typography,
  Paper,
  ListItem,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  PersonAdd as InviteIcon,
  List as ListIcon,
} from '@mui/icons-material';
import Login from './components/Login';
import SystemMessage from './components/SystemMessage';
import ChatList from './components/ChatList';
import AdminPanel from './components/AdminPanel';
import InviteFriend from './components/InviteFriend';
import InvitationsList from './components/InvitationsList';
import { Chat as ChatIcon } from '@mui/icons-material';
import { isAdmin as checkIsAdmin } from './config/admin';

function App() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const { username, isLoggedIn, loginError, isAdmin } = useAppSelector(state => state.auth);
  const { chats, activeChat, unreadCounts, isChatListOpen } = useAppSelector(state => state.chat);
  const { allUsers } = useAppSelector(state => state.users);
  const { socket } = useAppSelector(state => state.socket);
  
  // Filter out admin from user lists
  const nonAdminUsers = allUsers.filter(u => !checkIsAdmin(u.username));
  
  // Initialize socket connection
  useSocket();
  
  // Local state for message input
  const [message, setMessage] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitationsListOpen, setInvitationsListOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Helper to get current messages for display
  const currentMessages = activeChat ? (chats[activeChat] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeChat]);

  // Auto-save chats to localStorage whenever they change
  useEffect(() => {
    if (isLoggedIn && username && Object.keys(chats).length > 0) {
      saveChatsToStorage(username, chats);
    }
  }, [chats, username, isLoggedIn]);

  // Auto-save users to localStorage whenever they change
  useEffect(() => {
    if (isLoggedIn && username && allUsers.length > 0) {
      saveUsersToStorage(username, allUsers);
    }
  }, [allUsers, username, isLoggedIn]);

  // Fetch all chats for admin
  useEffect(() => {
    if (isLoggedIn && isAdmin && socket) {
      console.log('🔑 Admin logged in, fetching all chats...');
      socket.emit('adminGetAllChats', {}, (response: { success: boolean; chats?: any; message?: string }) => {
        if (response.success && response.chats) {
          console.log('📦 Admin received all chats:', response.chats);
          dispatch(loadPersistedChats(response.chats));
        } else {
          console.error('❌ Failed to fetch all chats:', response.message);
        }
      });
    }
  }, [isLoggedIn, isAdmin, socket, dispatch]);

  // Listen for invitation acceptance notifications
  useEffect(() => {
    if (socket && isLoggedIn) {
      const handleInvitationAccepted = (data: { inviteeEmail: string; timestamp: string }) => {
        console.log('🎉 Invitation accepted:', data);
        // You could show a notification here
        alert(`${data.inviteeEmail} accepted your invitation!`);
      };

      socket.on('invitationAccepted', handleInvitationAccepted);

      return () => {
        socket.off('invitationAccepted', handleInvitationAccepted);
      };
    }
  }, [socket, isLoggedIn]);

  const handleLogin = (name: string) => {
    dispatch(login(name));
    dispatch(clearLoginError());
    
    // Load persisted chats and users for this username
    const persistedChats = loadChatsFromStorage(name);
    const persistedUsers = loadUsersFromStorage(name);
    
    if (Object.keys(persistedChats).length > 0) {
      const chatCount = Object.keys(persistedChats).length;
      const messageCount = Object.values(persistedChats).reduce((sum, msgs) => sum + msgs.length, 0);
      console.log(`📦 Loading ${chatCount} chat(s) with ${messageCount} message(s) for ${name}`);
      dispatch(loadPersistedChats(persistedChats));
    }
    
    if (persistedUsers.length > 0) {
      console.log(`📦 Loading ${persistedUsers.length} user contact(s) for ${name}`);
      dispatch(loadPersistedUsers(persistedUsers));
    }
    
    // Save as last logged in user
    saveLastUsername(name);
  };

  const handleLogout = async () => {
    if (socket) {
      socket.close();
    }
    
    // Clear auth token
    const { authService } = await import('./services/authService');
    authService.logout();
    
    dispatch(logoutAction());
    dispatch(clearAllChats());
    dispatch(clearSocket());
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

  const sendMessage = () => {
    // Admin cannot send messages
    if (isAdmin) {
      console.warn('⚠️ Admin users cannot send messages');
      return;
    }

    console.log('📤 Attempting to send message...');
    console.log('Socket exists:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Message content:', message);

    if (socket && message.trim()) {
      const msgContent = message.trim();

      if (activeChat) {
        // Find user in allUsers (includes both online and offline)
        const targetUser = allUsers.find(u => u.username === activeChat);
        
        if (targetUser) {
          // Create message object
          const messageObj = {
            sender: username,
            message: msgContent,
            timestamp: new Date().toISOString(),
            isPrivate: true,
            recipient: activeChat,
          };

          // Add message to local state immediately
          dispatch(initializeChat(activeChat));
          dispatch(addMessage({ chatId: activeChat, message: messageObj }));

          // If user is online, send via socket
          if (targetUser.isOnline && targetUser.id) {
            console.log(`📤 Sending private message to ${targetUser.username} (${targetUser.id}) - ONLINE`);
            socket.emit('privateMessage', { to: targetUser.id, message: msgContent });
          } else {
            console.log(`📤 Message saved for ${targetUser.username} - OFFLINE (will be delivered when online)`);
            // Message is saved locally, will be visible when they come back online
          }
          
          setMessage('');
          console.log('✅ Message processed successfully');
        } else {
          console.error('❌ User not found in user list');
        }
      } else {
        console.warn('⚠️ No active chat selected');
      }
    } else {
      if (!socket) {
        console.error('❌ Cannot send - Socket not initialized');
      } else if (!message.trim()) {
        console.warn('⚠️ Cannot send - Message is empty');
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <CssBaseline />
        <Login onLogin={handleLogin} error={loginError} />
      </>
    );
  }

  // Admin view - show admin panel instead of chat
  if (isAdmin) {
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

  // Regular user view
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

      {/* Sidebar (Chat List) - Hide admin from list */}
      <Box
        component="nav"
        sx={{
          width: { sm: 320 },
          flexShrink: { sm: 0 },
          display: { xs: isChatListOpen ? 'block' : 'none', sm: 'block' },
          height: '100%',
        }}
      >
        <ChatList
          open={true}
          onClose={() => dispatch(toggleChatList())}
          activeChat={activeChat}
          chats={chats}
          onSelectChat={(chatId) => {
            dispatch(setActiveChat(chatId));
            if (isChatListOpen) {
              dispatch(toggleChatList());
            }
          }}
          unreadCounts={unreadCounts as any}
          onlineUsers={nonAdminUsers}
          currentUsername={username}
          variant="permanent"
        />
      </Box>

      {/* Main Content (Chat Window) */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          width: { sm: `calc(100% - 320px)` },
        }}
      >
        {/* Header */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: '#fff',
            color: '#000',
            borderBottom: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            {/* Mobile Menu Button */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => dispatch(toggleChatList())}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <GroupIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Welcome, {username}!
              </Typography>
              {activeChat ? (
                <Typography variant="caption" color="text.secondary">
                  Chatting with {activeChat} • {allUsers.find(u => u.username === activeChat)?.isOnline ? 'Online' : 'Offline'}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Select a conversation to start chatting
                </Typography>
              )}
            </Box>

            <IconButton
              onClick={() => setInvitationsListOpen(true)}
              color="inherit"
              title="View Invitations"
            >
              <ListIcon />
            </IconButton>
            <IconButton
              onClick={() => setInviteDialogOpen(true)}
              color="inherit"
              title="Invite Friend"
            >
              <InviteIcon />
            </IconButton>
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
            background: '#e5ddd5', // WhatsApp-like background or just gray
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!activeChat ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
              <ChatIcon sx={{ fontSize: 64, mb: 2, color: '#ccc' }} />
              <Typography variant="h6" color="text.secondary">
                Select a chat to start messaging
              </Typography>
            </Box>
          ) : (
            <>
              {currentMessages.map((msg, index) => {
                if (msg.type === 'system') {
                  return <SystemMessage key={index} message={msg.message} />;
                }
                const isOwnMessage = msg.sender === username;
                return (
                  <Fade in key={index} timeout={300}>
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        py: 0.5,
                        px: 1,
                      }}
                    >
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          maxWidth: '70%',
                          background: isOwnMessage ? '#d9fdd3' : '#fff', // WhatsApp-ish colors
                          color: '#000',
                          borderRadius: 2,
                          borderTopRightRadius: isOwnMessage ? 0 : 2,
                          borderTopLeftRadius: isOwnMessage ? 2 : 0,
                          position: 'relative',
                        }}
                      >
                        <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
                          {msg.message}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.7rem', opacity: 0.7 }}>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                      </Paper>
                    </ListItem>
                  </Fade>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Input Area */}
        {activeChat && (
          <Box sx={{ p: 2, background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              size="small"
              sx={{
                background: '#fff',
                borderRadius: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={sendMessage}
              disabled={!message.trim()}
              sx={{
                background: '#1976d2',
                color: '#fff',
                '&:hover': { background: '#1565c0' }
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Invitation Dialogs */}
      <InviteFriend
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
      />
      <InvitationsList
        open={invitationsListOpen}
        onClose={() => setInvitationsListOpen(false)}
      />
    </Box>
  );
}

export default App;

